import React, { useState } from 'react';
import { Wallet, Plus, Trash2, RefreshCw, ShieldCheck, KeyRound, ExternalLink, AlertTriangle, CreditCard, ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { fmtMoney } from '@/lib/mockData';
import { useI18n } from '@/lib/i18n';
import { useWallet, NETWORK_LIST } from '@/hooks/useWallet';
import { useToast } from '@/hooks/use-toast';
import { PageHero, Card, SectionHead, EmptyState, GoldButton, GhostButton, Skeleton, CardSkeleton } from '@/components/ui-kit';

const input = 'w-full rounded-lg border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-2.5 text-sm text-[#e9e7df] placeholder-[#6a665a] outline-none focus:border-[#d4af37]/50 min-h-[44px]';

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
	const { wallets, totalUsd, ledger, loading, syncing, reload, addWallet, removeWallet, deposit, withdraw } = bank;
	const { toast } = useToast();
	const { t } = useI18n();
	const [adding, setAdding] = useState(false);
	const [form, setForm] = useState({ network: 'bitcoin', address: '', label: '' });
	const [busy, setBusy] = useState(false);
	const [depAmount, setDepAmount] = useState('50');
	const [withAmount, setWithAmount] = useState('');
	const [withAddr, setWithAddr] = useState('');
	const [showDep, setShowDep] = useState(false);
	const [showWith, setShowWith] = useState(false);

	const walletBalance = ledger?.balances?.USD || 0;

	const submit = async (e) => {
		e.preventDefault();
		if (!form.address.trim()) return;
		setBusy(true);
		try {
			await addWallet(form);
			setForm({ network: form.network, address: '', label: '' });
			setAdding(false);
			toast({ title: t('wal.addWallet'), description: t('wal.loadingBal') });
		} catch (err) {
			toast({ variant: 'destructive', title: t('c.error'), description: err?.message || t('c.retry') });
		} finally {
			setBusy(false);
		}
	};

	const remove = async (id, label) => {
		try {
			await removeWallet(id);
			toast({ title: `${label} — ${t('c.remove')}` });
		} catch {
			toast({ variant: 'destructive', title: t('c.error') });
		}
	};

	const doDeposit = async () => {
		const n = Number(depAmount);
		if (!n || n < 1) { toast({ variant: 'destructive', title: t('wal.amountUsd') }); return; }
		setBusy(true);
		try { await deposit(n); } catch (e) { toast({ variant: 'destructive', title: t('wal.deposit'), description: e.message }); } finally { setBusy(false); }
	};

	const doWithdraw = async () => {
		const n = Number(withAmount);
		if (!n || !withAddr.trim()) { toast({ variant: 'destructive', title: `${t('wal.amountUsd')} + ${t('wal.destAddr')}` }); return; }
		setBusy(true);
		try {
			await withdraw(n, withAddr.trim());
			toast({ title: t('wal.withdraw'), description: `$${n} → ${shortAddr(withAddr)}` });
			setWithAmount(''); setWithAddr(''); setShowWith(false);
		} catch (e) { toast({ variant: 'destructive', title: t('wal.withdraw'), description: e.message }); } finally { setBusy(false); }
	};

	return (
		<AppLayout title={t('nav.wallet')}>
			<div className="tb-page">
				<PageHero
					kickerIcon={Wallet}
					kicker={t('nav.wallet')}
					title={t('wal.myW')}
					accent={t('wal.wallets')}
					subtitle={t('wal.subtitle')}
					actions={
						<>
							<GoldButton onClick={() => { setAdding(!adding); }} className="!min-h-[40px] !px-3 !py-2 !text-xs"><Plus className="h-4 w-4" /> {t('wal.addWallet')}</GoldButton>
							<GhostButton onClick={reload} disabled={syncing} className="!min-h-[40px] !px-3 !py-2 !text-xs"><RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} /> {t('c.refresh')}</GhostButton>
						</>
					}
				/>

				{/* Internal ledger + tracked total */}
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<Card className="p-5 sm:p-7">
						<div className="flex items-center gap-2 text-xs uppercase tracking-wider text-[#8a8577]"><CreditCard className="h-4 w-4 text-[#d4af37]" /> {t('wal.internalBal')}</div>
						<div className="mt-2 truncate font-mono text-3xl font-bold text-[#f0ecdd] sm:text-4xl">{fmtMoney(walletBalance)}</div>
						<div className="mt-3 flex flex-wrap gap-2">
							<GoldButton onClick={() => setShowDep(!showDep)} className="!px-3 !py-2 !text-xs"><ArrowDownRight className="h-4 w-4" /> {t('wal.deposit')}</GoldButton>
							<GhostButton onClick={() => setShowWith(!showWith)} className="!px-3 !py-2 !text-xs"><ArrowUpRight className="h-4 w-4" /> {t('wal.withdraw')}</GhostButton>
						</div>
						{showDep && (
							<div className="mt-4 flex flex-col gap-2 min-[420px]:flex-row">
								<input className={input} type="number" min="1" value={depAmount} onChange={e => setDepAmount(e.target.value)} placeholder={t('wal.amountUsd')} />
								<GoldButton disabled={busy} onClick={doDeposit}>{t('wal.fundStripe')}</GoldButton>
							</div>
						)}
						{showWith && (
							<div className="mt-4 space-y-2">
								<input className={input} type="number" min="1" value={withAmount} onChange={e => setWithAmount(e.target.value)} placeholder={t('wal.amountUsd')} />
								<input className={input} value={withAddr} onChange={e => setWithAddr(e.target.value)} placeholder={t('wal.destAddr')} />
								<GoldButton disabled={busy} onClick={doWithdraw}>{t('wal.withdraw')}</GoldButton>
							</div>
						)}
					</Card>
					<Card className="p-5 sm:p-7">
						<div className="flex items-center gap-2 text-xs uppercase tracking-wider text-[#8a8577]"><Wallet className="h-4 w-4 text-[#d4af37]" /> {t('wal.trackedVal')}</div>
						<div className="mt-2 truncate font-mono text-3xl font-bold text-[#f0ecdd] sm:text-4xl">{fmtMoney(totalUsd)}</div>
						<div className="mt-3 flex items-center gap-2 text-xs text-[#8a8577]"><ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" /> {t('wal.selfCustody')}</div>
					</Card>
				</div>

				{/* Add form */}
				{adding && (
					<form onSubmit={submit} className="tb-card p-5">
						<SectionHead title={t('wal.trackAddr')} />
						<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
							<select className={input} value={form.network} onChange={(e) => setForm({ ...form, network: e.target.value })}>
								{NETWORK_LIST.map((n) => <option key={n.id} value={n.id} className="bg-[#0f0f14]">{n.label}</option>)}
							</select>
							<input className={input} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder={t('wal.pubAddr')} />
							<input className={input} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder={t('wal.labelOpt')} />
						</div>
						<p className="mt-3 flex items-center gap-2 text-xs text-[#6a665a]"><KeyRound className="h-3.5 w-3.5 shrink-0" /> {t('wal.pubOnly')}</p>
						<div className="mt-4 flex flex-wrap gap-2">
							<GoldButton disabled={busy || !form.address.trim()}>{busy ? '…' : t('wal.trackWallet')}</GoldButton>
							<GhostButton type="button" onClick={() => setAdding(false)}>{t('c.cancel')}</GhostButton>
						</div>
					</form>
				)}

				{/* Tracked wallets */}
				<div>
					{loading ? (
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><Skeleton className="h-36" /><Skeleton className="h-36" /></div>
					) : wallets.length === 0 ? (
						<EmptyState icon={Wallet} title={t('wal.noTrack')} />
					) : (
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
							{wallets.map((w) => (
								<Card key={w.id} className="p-5">
									<div className="flex items-start justify-between gap-2">
										<div className="min-w-0">
											<div className="flex items-center gap-2">
												<span className="truncate text-xs font-semibold uppercase tracking-wide text-[#d4af37]">{w.label || w.network}</span>
											</div>
											<div className="mt-1 truncate font-mono text-xs text-[#6a665a]">{shortAddr(w.address)}</div>
										</div>
										<button onClick={() => remove(w.id, w.label || w.network)} className="grid shrink-0 place-items-center rounded-lg border border-red-500/25 px-2.5 py-1.5 text-red-400 transition hover:bg-red-500/10"><Trash2 className="h-3.5 w-3.5" /></button>
									</div>

									{w.ok ? (
										<>
											<div className="mt-4 truncate font-mono text-2xl font-bold text-[#f0ecdd]">
												{Number(w.amount).toLocaleString(undefined, { maximumFractionDigits: 6 })} <span className="text-sm font-medium text-[#8a8577]">{w.currency}</span>
											</div>
											<div className="mt-1 font-mono text-sm text-[#d4af37]">{fmtMoney(w.usdValue)}</div>
										</>
									) : (
										<div className="mt-4 flex items-center gap-2 text-sm text-red-400"><AlertTriangle className="h-4 w-4 shrink-0" /> Balance unavailable</div>
									)}

									<div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-3 text-xs text-[#6a665a]">
										<span className="rounded-full bg-[#d4af37]/10 px-2 py-0.5 uppercase tracking-wide text-[#d4af37]">{w.network.replace(/-/g, ' · ')}</span>
										<a href={EXPLORER[w.network]?.(w.address)} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[#8a8577] hover:text-[#e9e7df]">{t('wal.explorer')} <ExternalLink className="h-3 w-3" /></a>
									</div>
								</Card>
							))}
						</div>
					)}
				</div>

				{/* Ledger history */}
				<div>
					<h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[#8a8577]"><Clock className="h-4 w-4" /> {t('wal.history')}</h3>
					<Card className="!p-0 overflow-hidden">
						{(ledger?.transactions || []).length === 0 ? (
							<div className="px-4 py-10 text-center text-sm text-[#8a8577]">{t('wal.noLedger')}</div>
						) : (
							<div className="divide-y divide-white/5">
								{ledger.transactions.map(tx => (
									<div key={tx.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
										<div className="min-w-0">
											<div className="truncate font-medium text-[#f0ecdd]">{{ deposit: t('wal.deposit'), withdraw: t('wal.withdraw'), withdraw_crypto: t('wal.withdraw'), pay: t('bill.payWallet') }[tx.type] || tx.type} <span className="text-[#8a8577]">{tx.currency}</span></div>
											<div className="truncate text-xs text-[#6a665a]">{new Date(tx.created).toLocaleString()} · {tx.status} {tx.reference ? `· ${shortAddr(tx.reference)}` : ''}</div>
										</div>
										<div className={`shrink-0 font-mono font-bold ${Number(tx.amount) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{Number(tx.amount) > 0 ? '+' : ''}{fmtMoney(Number(tx.amount))}</div>
									</div>
								))}
							</div>
						)}
					</Card>
				</div>

				<div className="flex items-center gap-2 text-xs text-[#8a8577]"><ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" /> Operated by TradingBible LLC. Internal ledger + external tracker. Deposits via Stripe.</div>
			</div>
		</AppLayout>
	);
}
