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
		} finally {
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

	return { wallets, totalUsd, loading, syncing, reload: load, addWallet, removeWallet };
}
