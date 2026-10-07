import { useCallback, useEffect, useState } from 'react';
import pb from '@/lib/pocketbaseClient';
import { apiServerClient } from '@/lib/apiServerClient';

// Supported networks for real-wallet balance tracking. TradingBible never
// holds funds — these are read-only lookups of the user's own addresses.
export const NETWORK_LIST = [
	{ id: 'bitcoin', label: 'Bitcoin (BTC)' },
	{ id: 'ethereum', label: 'Ethereum (ETH)' },
	{ id: 'usdc-ethereum', label: 'USDC · Ethereum' },
	{ id: 'usdt-ethereum', label: 'USDT · Ethereum' },
	{ id: 'usdc-base', label: 'USDC · Base' },
	{ id: 'usdc-polygon', label: 'USDC · Polygon' },
	{ id: 'solana', label: 'Solana (SOL)' },
];

function headers() {
	return { Authorization: `Bearer ${pb.authStore.token}`, 'Content-Type': 'application/json' };
}

export function useWallet() {
	const [wallets, setWallets] = useState([]);
	const [totalUsd, setTotalUsd] = useState(0);
	const [ledger, setLedger] = useState({ balances: {}, transactions: [] });
	const [loading, setLoading] = useState(true);
	const [syncing, setSyncing] = useState(false);

	const load = useCallback(async () => {
		setSyncing(true);
		try {
			const res = await apiServerClient.fetch('/wallet', { headers: headers() });
			if (!res.ok) throw new Error(`http ${res.status}`);
			const data = await res.json();
			setWallets(data.wallets || []);
			setTotalUsd(data.totalUsd || 0);
		} catch {
			// keep last known state on refresh failures
		}
		try {
			const [b, t] = await Promise.all([
				apiServerClient.fetch('/wallet/ledger/balance', { headers: headers() }).then(r => r.json()).catch(() => ({ balances: {} })),
				apiServerClient.fetch('/wallet/ledger/transactions', { headers: headers() }).then(r => r.json()).catch(() => ({ transactions: [] })),
			]);
			setLedger({ balances: b.balances || {}, transactions: t.transactions || [] });
		} catch { /* ignore */ }
		finally {
			setLoading(false);
			setSyncing(false);
		}
	}, []);

	useEffect(() => {
		if (!pb.authStore.token) return;
		load();
	}, [load]);

	const addWallet = async ({ network, address, label }) => {
		const res = await apiServerClient.fetch('/wallet', {
			method: 'POST',
			headers: headers(),
			body: JSON.stringify({ network, address, label }),
		});
		const data = await res.json().catch(() => ({}));
		if (!res.ok) throw new Error(data.error || `http ${res.status}`);
		await load();
		return data.wallet;
	};

	const removeWallet = async (id) => {
		const res = await apiServerClient.fetch(`/wallet/${id}`, { method: 'DELETE', headers: headers() });
		if (!res.ok) throw new Error('failed to remove wallet');
		await load();
	};

	const deposit = async (amount) => {
		const res = await apiServerClient.fetch('/wallet/deposit', { method: 'POST', headers: headers(), body: JSON.stringify({ amount }) });
		const data = await res.json().catch(() => ({}));
		if (!res.ok) throw new Error(data.error || 'deposit failed');
		if (data.url) window.location.href = data.url;
		return data;
	};
	function codedError(data, fallback) {
		const err = new Error(data?.message || data?.error || fallback);
		err.code = data?.error || 'unknown';
		err.detail = data;
		return err;
	}

	const withdraw = async (amount) => {
		const res = await apiServerClient.fetch('/wallet/withdraw', { method: 'POST', headers: headers(), body: JSON.stringify({ amount }) });
		const data = await res.json().catch(() => ({}));
		if (!res.ok) throw codedError(data, 'withdraw failed');
		await load();
		return data;
	};
	const payWithWallet = async (planOrIntent) => {
		const body = planOrIntent === 'academy' ? { intent: 'academy' } : { plan: planOrIntent };
		const res = await apiServerClient.fetch('/wallet/pay', { method: 'POST', headers: headers(), body: JSON.stringify(body) });
		const data = await res.json().catch(() => ({}));
		if (!res.ok) throw new Error(data.error || 'pay failed');
		await load();
		return data;
	};

	// ── Real-money rails (Connect + KYC + swaps) ──────────────────
	const [rails, setRails] = useState({ connect: { status: 'none' }, kyc: { status: 'none' }, providers: {} });

	const loadRails = useCallback(async () => {
		try {
			const res = await apiServerClient.fetch('/wallet/rails', { headers: headers() });
			if (!res.ok) return null;
			const data = await res.json();
			setRails(data);
			return data;
		} catch { return null; }
	}, []);

	useEffect(() => {
		if (!pb.authStore.token) return;
		loadRails();
	}, [loadRails]);

	const onboardConnect = async (country) => {
		const res = await apiServerClient.fetch('/wallet/connect/onboard', { method: 'POST', headers: headers(), body: JSON.stringify({ country: country || 'US' }) });
		const data = await res.json().catch(() => ({}));
		if (!res.ok) throw codedError(data, 'bank setup failed');
		if (data.url) window.location.href = data.url;
		return data;
	};

	const refreshConnectStatus = async () => {
		const res = await apiServerClient.fetch('/wallet/connect/status', { headers: headers() });
		const data = await res.json().catch(() => ({}));
		if (res.ok) {
			setRails((r) => ({ ...r, connect: { ...(r.connect || {}), status: data.status || r.connect?.status, accountId: data.accountId } }));
		}
		return data;
	};

	const startKyc = async () => {
		const res = await apiServerClient.fetch('/wallet/kyc/session', { method: 'POST', headers: headers() });
		const data = await res.json().catch(() => ({}));
		if (!res.ok) throw codedError(data, 'verification failed to start');
		if (data.url) window.location.href = data.url;
		return data;
	};

	const refreshKycStatus = async () => {
		const res = await apiServerClient.fetch('/wallet/kyc/status', { headers: headers() });
		const data = await res.json().catch(() => ({}));
		if (res.ok) {
			setRails((r) => ({ ...r, kyc: { ...(r.kyc || {}), status: data.status || r.kyc?.status, verifiedAt: data.verifiedAt } }));
		}
		return data;
	};

	const swapTokens = async () => {
		const res = await apiServerClient.fetch('/wallet/swap/tokens', { headers: headers() });
		const data = await res.json().catch(() => ({}));
		if (!res.ok) throw codedError(data, 'swap tokens failed');
		return data;
	};

	const swapQuote = async ({ chainId, sell, buy, sellAmount, taker }) => {
		const res = await apiServerClient.fetch('/wallet/swap/quote', { method: 'POST', headers: headers(), body: JSON.stringify({ chainId, sell, buy, sellAmount, taker }) });
		const data = await res.json().catch(() => ({}));
		if (!res.ok) throw codedError(data, 'quote failed');
		return data;
	};

	const swapIntent = async (payload) => {
		const res = await apiServerClient.fetch('/wallet/swap/intent', { method: 'POST', headers: headers(), body: JSON.stringify(payload) });
		const data = await res.json().catch(() => ({}));
		if (!res.ok) throw codedError(data, 'swap intent failed');
		await load();
		return data;
	};

	const swapConfirm = async ({ intentId, txHash }) => {
		const res = await apiServerClient.fetch('/wallet/swap/confirm', { method: 'POST', headers: headers(), body: JSON.stringify({ intentId, txHash }) });
		const data = await res.json().catch(() => ({}));
		if (!res.ok) throw codedError(data, 'swap confirm failed');
		await load();
		return data;
	};

	const onrampOrder = async ({ walletAddress, currency, network, fiatAmount, fiatCurrency }) => {
		const res = await apiServerClient.fetch('/wallet/onramp/order', { method: 'POST', headers: headers(), body: JSON.stringify({ walletAddress, currency, network, fiatAmount, fiatCurrency }) });
		const data = await res.json().catch(() => ({}));
		if (!res.ok) throw codedError(data, 'on-ramp failed');
		if (data.url) window.open(data.url, '_blank', 'noopener,noreferrer');
		return data;
	};

	return { wallets, totalUsd, ledger, loading, syncing, reload: load, addWallet, removeWallet, deposit, withdraw, payWithWallet, rails, loadRails, onboardConnect, refreshConnectStatus, startKyc, refreshKycStatus, swapTokens, swapQuote, swapIntent, swapConfirm, onrampOrder };
}
