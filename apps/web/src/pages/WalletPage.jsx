import React, { useState } from 'react';
import { Wallet, Plus, Trash2, RefreshCw, ShieldCheck, KeyRound, ExternalLink, AlertTriangle } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { fmtMoney } from '@/lib/mockData';
import { useWallet, NETWORK_LIST } from '@/hooks/useWallet';
import { useToast } from '@/hooks/use-toast';

const input = 'w-full rounded-lg border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-2.5 text-sm text-[#e9e7df] placeholder-[#6a665a] outline-none focus:border-[#d4af37]/50 min-h-[44px]';
const btnGold = 'flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-4 py-2.5 text-sm font-semibold text-[#0a0a0f] transition hover:opacity-90 disabled:opacity-60';

const EXPLORER = {
	bitcoin: (a) => `https://mempool.space/address/${a}`,
	ethereum: (a) => `https://etherscan.io/address/${a}`,
	'usdc-ethereum': (a) => `https://etherscan.io/address/${a}`,
	'usdt-ethereum': (a) => `https://etherscan.io/address/${a}`,
	'usdc-base': (a) => `https://basescan.org/address/${a}`,
	'usdc-polygon': (a) => `https://polygonscan.com/address/${a}`,
	solana: (a) => `https://solscan.io/account/${a}`,
};

function shortAddr(a) {
	if (!a) return '';
	return a.length > 18 ? `${a.slice(0, 10)}…${a.slice(-8)}` : a;
}

export default function WalletPage() {
	const bank = useWallet();
	const { wallets, totalUsd, loading, syncing, reload, addWallet, removeWallet } = bank;
	const { toast } = useToast();
	const [adding, setAdding] = useState(false);
	const [form, setForm] = useState({ network: 'bitcoin', address: '', label: '' });
	const [busy, setBusy] = useState(false);

	const submit = async (e) => {
		e.preventDefault();
		if (!form.address.trim()) return;
		setBusy(true);
		try {
			await addWallet(form);
			setForm({ network: form.network, address: '', label: '' });
			setAdding(false);
			toast({ title: 'Wallet added', description: 'Balances refresh automatically.' });
		} catch (err) {
			toast({ variant: 'destructive', title: 'Could not add wallet', description: err?.message || 'Check the address and try again.' });
		} finally {
			setBusy(false);
		}
	};

	const remove = async (id, label) => {
		try {
			await removeWallet(id);
			toast({ title: `${label} removed` });
		} catch {
			toast({ variant: 'destructive', title: 'Could not remove wallet' });
		}
	};

	return (
		<AppLayout title="Wallet">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h2 className="text-xl font-bold text-[#f0ecdd] sm:text-2xl">My <span className="gold-text">Wallets</span></h2>
					<p className="mt-1 text-sm text-[#8a8577]">Track your real balances. TradingBible never holds your funds.</p>
				</div>
				<div className="flex gap-2">
					<button className={`${btnGold} !min-h-[40px] !px-3 !py-2 !text-xs`} onClick={() => { setAdding(!adding); }}><Plus className="h-4 w-4" /> Add wallet</button>
					<button className={`${btnGold} !min-h-[40px] !px-3 !py-2 !text-xs opacity-80`} onClick={reload} disabled={syncing}><RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} /> Refresh</button>
				</div>
			</div>

			{/* Total tracked value */}
			<div className="mt-5 glass gold-glow rounded-2xl p-5 sm:p-7">
				<div className="flex items-center gap-2 text-xs uppercase tracking-wider text-[#8a8577]"><Wallet className="h-4 w-4 text-[#d4af37]" /> Total tracked value</div>
				<div className="mt-2 font-mono text-3xl font-bold text-[#f0ecdd] sm:text-4xl">{fmtMoney(totalUsd)}</div>
				<div className="mt-3 flex items-center gap-2 text-xs text-[#8a8577]"><ShieldCheck className="h-4 w-4 text-emerald-400" /> Self-custody — balances are read straight from the blockchain. TradingBible does not custody, withdraw or issue cards.</div>
			</div>

			{/* Add form */}
			{adding && (
				<form onSubmit={submit} className="mt-5 glass rounded-2xl p-5">
					<h3 className="mb-4 font-semibold text-[#f0ecdd]">Track a wallet address</h3>
					<div className="grid gap-3 sm:grid-cols-3">
						<select className={input} value={form.network} onChange={(e) => setForm({ ...form, network: e.target.value })}>
							{NETWORK_LIST.map((n) => <option key={n.id} value={n.id} className="bg-[#0f0f14]">{n.label}</option>)}
						</select>
						<input className={input} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Wallet address (public)" />
						<input className={input} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Label (optional)" />
					</div>
					<p className="mt-3 flex items-center gap-2 text-xs text-[#6a665a]"><KeyRound className="h-3.5 w-3.5" /> You only need your public address — never share private keys or seed phrases with anyone.</p>
					<div className="mt-4 flex gap-2">
						<button disabled={busy || !form.address.trim()} className={btnGold}>{busy ? 'Adding…' : 'Track wallet'}</button>
						<button type="button" onClick={() => setAdding(false)} className="min-h-[44px] rounded-xl border border-[#d4af37]/25 px-4 text-sm text-[#e9e7df]">Cancel</button>
					</div>
				</form>
			)}

			{/* Tracked wallets */}
			<div className="mt-5">
				{loading ? (
					<div className="glass flex items-center justify-center gap-2 rounded-2xl py-20 text-sm text-[#8a8577]"><RefreshCw className="h-4 w-4 animate-spin" /> Loading balances…</div>
				) : wallets.length === 0 ? (
					<div className="glass rounded-2xl px-6 py-14 text-center">
						<Wallet className="mx-auto mb-3 h-8 w-8 text-[#d4af37]" />
						<p className="text-sm text-[#8a8577]">No wallets tracked yet. Add a Bitcoin, Ethereum, USDC or Solana address to see your live balance.</p>
					</div>
				) : (
					<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
						{wallets.map((w) => (
							<div key={w.id} className="glass rounded-2xl p-5">
								<div className="flex items-start justify-between">
									<div>
										<div className="flex items-center gap-2">
											<span className="text-xs font-semibold uppercase tracking-wide text-[#d4af37]">{w.label || w.network}</span>
										</div>
										<div className="mt-1 font-mono text-xs text-[#6a665a]">{shortAddr(w.address)}</div>
									</div>
									<button onClick={() => remove(w.id, w.label || w.network)} className="grid place-items-center rounded-lg border border-red-500/25 px-2.5 py-1.5 text-red-400 transition hover:bg-red-500/10"><Trash2 className="h-3.5 w-3.5" /></button>
								</div>

								{w.ok ? (
									<>
										<div className="mt-4 font-mono text-2xl font-bold text-[#f0ecdd]">
											{Number(w.amount).toLocaleString(undefined, { maximumFractionDigits: 6 })} <span className="text-sm font-medium text-[#8a8577]">{w.currency}</span>
										</div>
										<div className="mt-1 font-mono text-sm text-[#d4af37]">{fmtMoney(w.usdValue)}</div>
									</>
								) : (
									<div className="mt-4 flex items-center gap-2 text-sm text-red-400"><AlertTriangle className="h-4 w-4" /> Balance unavailable</div>
								)}

								<div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3 text-xs text-[#6a665a]">
									<span className="rounded-full bg-[#d4af37]/10 px-2 py-0.5 uppercase tracking-wide text-[#d4af37]">{w.network.replace(/-/g, ' · ')}</span>
									<a href={EXPLORER[w.network]?.(w.address)} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[#8a8577] hover:text-[#e9e7df]">View on explorer <ExternalLink className="h-3 w-3" /></a>
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			<div className="mt-6 flex items-center gap-2 text-xs text-[#8a8577]"><ShieldCheck className="h-4 w-4 text-emerald-400" /> Operated by TradingBible LLC. Balances shown are read-only public data; funds always remain in your own wallets.</div>
		</AppLayout>
	);
}
