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
	const withdraw = async (amount, address) => {
		const res = await apiServerClient.fetch('/wallet/withdraw', { method: 'POST', headers: headers(), body: JSON.stringify({ amount, address }) });
		const data = await res.json().catch(() => ({}));
		if (!res.ok) throw new Error(data.error || 'withdraw failed');
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

	return { wallets, totalUsd, ledger, loading, syncing, reload: load, addWallet, removeWallet, deposit, withdraw, payWithWallet };
}
