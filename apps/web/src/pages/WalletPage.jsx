import React, { useState, useEffect } from 'react';
import { Wallet, Plus, Trash2, RefreshCw, ShieldCheck, KeyRound, ExternalLink, AlertTriangle, CreditCard, ArrowUpRight, ArrowDownRight, Clock, Landmark, BadgeCheck, ArrowLeftRight } from 'lucide-react';
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
	const { rails, loadRails, onboardConnect, refreshConnectStatus, startKyc, refreshKycStatus, swapTokens, swapQuote, swapIntent, swapConfirm, onrampOrder } = bank;
	const { toast } = useToast();
	const { t } = useI18n();
	const [adding, setAdding] = useState(false);
	const [form, setForm] = useState({ network: 'bitcoin', address: '', label: '' });
	const [busy, setBusy] = useState(false);
	const [depAmount, setDepAmount] = useState('50');
	const [withAmount, setWithAmount] = useState('');
	const [showDep, setShowDep] = useState(false);
	const [showWith, setShowWith] = useState(false);
	const [showSwap, setShowSwap] = useState(false);
	const [railBusy, setRailBusy] = useState('');
	// Swap state (non-custodial: user signs in their own wallet)
	const [swapChains, setSwapChains] = useState([]);
	const [swapReady, setSwapReady] = useState(false);
	const [swapForm, setSwapForm] = useState({ chainId: 1, sell: 'USDC', buy: 'ETH', sellAmount: '', taker: '' });
	const [quote, setQuote] = useState(null);
	const [intent, setIntent] = useState(null);
	const [txHash, setTxHash] = useState('');
	// On-ramp state (card → crypto to your own wallet via Transak)
	const [rampForm, setRampForm] = useState({ walletAddress: '', currency: 'USDC', network: 'ethereum', fiatAmount: '100' });

	const walletBalance = ledger?.balances?.USD || 0;
	const kycStatus = rails?.kyc?.status || 'none';
	const connectStatus = rails?.connect?.status || 'none';
	const swapEnabled = Boolean(rails?.providers?.swap);
	const onrampEnabled = Boolean(rails?.providers?.onramp);

	// Pick up Connect / KYC / on-ramp return hops (?connect=return etc.)
	useEffect(() => {
		try {
			const q = new URLSearchParams(window.location.search);
			if (q.get('connect') === 'return' || q.get('connect') === 'refresh') {
				refreshConnectStatus().then((d) => {
					if (d?.status === 'active') toast({ title: 'Bank account connected' });
				});
			}
			if (q.get('kyc') === 'return') {
				refreshKycStatus().then((d) => {
					if (d?.status === 'verified') toast({ title: 'Identity verified' });
				});
			}
			if (q.get('onramp') === 'return') loadRails();
			if (q.get('connect') || q.get('kyc') || q.get('onramp') || q.get('deposit')) {
				const url = new URL(window.location.href);
				['connect', 'kyc', 'onramp', 'deposit'].forEach((k) => url.searchParams.delete(k));
				window.history.replaceState({}, '', url.toString());
			}
		} catch { /* ignore */ }
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

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
		if (!n) { toast({ variant: 'destructive', title: t('wal.amountUsd') }); return; }
		setBusy(true);
		try {
			const data = await withdraw(n);
			toast({ title: t('wal.withdraw'), description: `$${n} on its way to your bank (transfer ${shortAddr(data?.transferId || '')})` });
			setWithAmount(''); setShowWith(false);
		} catch (e) {
			if (e?.code === 'kyc_required') {
				toast({ variant: 'destructive', title: 'Identity verification required', description: 'Verify your identity to enable withdrawals.' });
				setShowWith(false);
			} else if (e?.code === 'connect_required') {
				toast({ variant: 'destructive', title: 'Bank account required', description: 'Connect your bank account to withdraw.' });
				setShowWith(false);
			} else {
				toast({ variant: 'destructive', title: t('wal.withdraw'), description: e.message });
			}
		} finally { setBusy(false); }
	};

	const doOnboard = async () => {
		setRailBusy('connect');
		try { await onboardConnect('US'); } catch (e) { toast({ variant: 'destructive', title: 'Bank setup', description: e.message }); } finally { setRailBusy(''); }
	};

	const doKyc = async () => {
		setRailBusy('kyc');
		try { await startKyc(); } catch (e) { toast({ variant: 'destructive', title: 'Identity verification', description: e.message }); } finally { setRailBusy(''); }
	};

	const openSwap = async () => {
		const next = !showSwap;
		setShowSwap(next);
		if (next && !swapReady) {
			try {
				const data = await swapTokens();
				setSwapChains(data.chains || []);
				const first = (data.chains || [])[0];
				if (first) setSwapForm((f) => ({ ...f, chainId: first.chainId, sell: first.tokens[1]?.symbol || first.tokens[0]?.symbol, buy: first.tokens[0]?.symbol }));
				setSwapReady(true);
			} catch { /* stays unavailable */ }
		}
	};

	const doQuote = async () => {
		setBusy(true);
		setQuote(null); setIntent(null);
		try {
			const q = await swapQuote(swapForm);
			setQuote(q);
		} catch (e) { toast({ variant: 'destructive', title: 'Swap quote', description: e.message }); } finally { setBusy(false); }
	};

	const doIntent = async () => {
		if (!quote) return;
		setBusy(true);
		try {
			const data = await swapIntent({ chainId: quote.chainId, sell: quote.sell, buy: quote.buy, sellAmount: Number(quote.sellAmount), buyAmount: quote.buyAmount, taker: swapForm.taker });
			setIntent(data.intent);
			toast({ title: 'Swap intent recorded', description: 'Sign the transaction in your wallet, then paste the tx hash below.' });
		} catch (e) { toast({ variant: 'destructive', title: 'Swap intent', description: e.message }); } finally { setBusy(false); }
	};

	const doConfirmSwap = async () => {
		if (!intent?.id || !txHash.trim()) { toast({ variant: 'destructive', title: 'Transaction hash required' }); return; }
		setBusy(true);
		try {
			await swapConfirm({ intentId: intent.id, txHash: txHash.trim() });
			toast({ title: 'Swap confirmed', description: 'Your on-chain transaction was recorded.' });
			setQuote(null); setIntent(null); setTxHash('');
		} catch (e) { toast({ variant: 'destructive', title: 'Swap confirm', description: e.message }); } finally { setBusy(false); }
	};

	const doOnramp = async () => {
		if (!rampForm.walletAddress.trim()) { toast({ variant: 'destructive', title: 'Your wallet address is required' }); return; }
		setBusy(true);
		try {
			await onrampOrder({ ...rampForm, fiatAmount: Number(rampForm.fiatAmount) || undefined });
			toast({ title: 'Opening secure checkout', description: 'Complete the purchase with Transak — crypto lands in your wallet.' });
		} catch (e) { toast({ variant: 'destructive', title: 'Card-to-crypto', description: e.message }); } finally { setBusy(false); }
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

				{/* Real-money rail status */}
				{kycStatus !== 'verified' && (
					<Card className="p-4 border-[#d4af37]/30">
						<div className="flex flex-wrap items-center gap-3">
							<span className="grid h-9 w-9 place-items-center rounded-xl bg-[#d4af37]/12 text-[#d4af37]"><BadgeCheck className="h-4 w-4" /></span>
							<div className="min-w-0 flex-1">
								<div className="text-sm font-semibold text-[#f0ecdd]">Verify your identity to withdraw real money</div>
								<div className="text-xs text-[#8a8577]">One-time document check via Stripe Identity. Required once, before your first payout.</div>
							</div>
							<GoldButton disabled={railBusy === 'kyc'} onClick={doKyc} className="!px-3 !py-2 !text-xs">{railBusy === 'kyc' ? '…' : 'Verify identity'}</GoldButton>
						</div>
					</Card>
				)}
				{kycStatus === 'verified' && connectStatus !== 'active' && (
					<Card className="p-4 border-[#d4af37]/30">
						<div className="flex flex-wrap items-center gap-3">
							<span className="grid h-9 w-9 place-items-center rounded-xl bg-[#d4af37]/12 text-[#d4af37]"><Landmark className="h-4 w-4" /></span>
							<div className="min-w-0 flex-1">
								<div className="text-sm font-semibold text-[#f0ecdd]">Connect your bank account for payouts</div>
								<div className="text-xs text-[#8a8577]">Secure Stripe setup — money goes straight to your bank. TradingBible never sees your bank login.</div>
							</div>
							<GoldButton disabled={railBusy === 'connect'} onClick={doOnboard} className="!px-3 !py-2 !text-xs">{railBusy === 'connect' ? '…' : 'Connect bank'}</GoldButton>
						</div>
					</Card>
				)}

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
								<GoldButton disabled={busy} onClick={doWithdraw}>{t('wal.withdraw')}</GoldButton>
								<p className="text-xs text-[#6a665a]">Payouts go to your connected bank via Stripe (typically 2–5 business days). {connectStatus !== 'active' ? 'Connect your bank first.' : ''} {kycStatus !== 'verified' ? 'Identity verification required.' : ''}</p>
							</div>
						)}
					</Card>
					<Card className="p-5 sm:p-7">
						<div className="flex items-center gap-2 text-xs uppercase tracking-wider text-[#8a8577]"><Wallet className="h-4 w-4 text-[#d4af37]" /> {t('wal.trackedVal')}</div>
						<div className="mt-2 truncate font-mono text-3xl font-bold text-[#f0ecdd] sm:text-4xl">{fmtMoney(totalUsd)}</div>
						<div className="mt-3 flex items-center gap-2 text-xs text-[#8a8577]"><ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" /> {t('wal.selfCustody')}</div>
					</Card>
				</div>

				{/* Swap + on-ramp (non-custodial crypto) */}
				<Card className="p-5 sm:p-7">
					<div className="flex flex-wrap items-center gap-3">
						<span className="grid h-9 w-9 place-items-center rounded-xl bg-[#d4af37]/12 text-[#d4af37]"><ArrowLeftRight className="h-4 w-4" /></span>
						<div className="min-w-0 flex-1">
							<div className="text-sm font-semibold text-[#f0ecdd]">Convert & swap crypto</div>
							<div className="text-xs text-[#8a8577]">Non-custodial: you sign in your own wallet — TradingBible never holds your keys.</div>
						</div>
						<GhostButton onClick={openSwap} className="!px-3 !py-2 !text-xs">{showSwap ? t('c.cancel') : 'Swap crypto'}</GhostButton>
					</div>
					{showSwap && (
						<div className="mt-4 space-y-4">
							{!swapEnabled ? (
								<p className="text-xs text-[#8a8577]">Swaps are not enabled yet. Card-to-crypto below may still be available.</p>
							) : !swapReady ? (
								<p className="text-xs text-[#8a8577]">Loading swap markets…</p>
							) : (
								<>
									<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
										<select className={input} value={swapForm.chainId} onChange={e => { const chainId = Number(e.target.value); const ch = swapChains.find(c => c.chainId === chainId); setSwapForm({ ...swapForm, chainId, sell: ch?.tokens[1]?.symbol || '', buy: ch?.tokens[0]?.symbol || '' }); setQuote(null); setIntent(null); }}>
											{swapChains.map(c => <option key={c.chainId} value={c.chainId} className="bg-[#0f0f14]">{c.name}</option>)}
										</select>
										<input className={input} value={swapForm.taker} onChange={e => setSwapForm({ ...swapForm, taker: e.target.value })} placeholder="Your wallet address (0x…)" />
										<select className={input} value={swapForm.sell} onChange={e => setSwapForm({ ...swapForm, sell: e.target.value, quote: null })}>
											{(swapChains.find(c => c.chainId === swapForm.chainId)?.tokens || []).map(tok => <option key={tok.symbol} value={tok.symbol} className="bg-[#0f0f14]">Sell {tok.symbol}</option>)}
										</select>
										<select className={input} value={swapForm.buy} onChange={e => setSwapForm({ ...swapForm, buy: e.target.value })}>
											{(swapChains.find(c => c.chainId === swapForm.chainId)?.tokens || []).map(tok => <option key={tok.symbol} value={tok.symbol} className="bg-[#0f0f14]">Buy {tok.symbol}</option>)}
										</select>
									</div>
									<div className="flex flex-col gap-2 min-[420px]:flex-row">
										<input className={input} type="number" min="0" value={swapForm.sellAmount} onChange={e => setSwapForm({ ...swapForm, sellAmount: e.target.value })} placeholder="Amount to sell" />
										<GoldButton disabled={busy} onClick={doQuote}>Get quote</GoldButton>
									</div>
									{quote && (
										<div className="rounded-lg border border-[#d4af37]/15 bg-black/30 p-3 text-sm">
											<div className="font-mono text-[#f0ecdd]">≈ {quote.buyAmount} {quote.buy}</div>
											<div className="mt-1 text-xs text-[#8a8577]">Est. gas {quote.estimatedGas || '—'} · Sign the transaction in your own wallet, then record it below.</div>
											<div className="mt-2 flex flex-wrap gap-2">
												<GhostButton disabled={busy} onClick={doIntent} className="!px-3 !py-2 !text-xs">I've signed — record it</GhostButton>
											</div>
										</div>
									)}
									{intent && (
										<div className="flex flex-col gap-2 min-[420px]:flex-row">
											<input className={input} value={txHash} onChange={e => setTxHash(e.target.value)} placeholder="Paste transaction hash (0x…)" />
											<GoldButton disabled={busy} onClick={doConfirmSwap}>Confirm swap</GoldButton>
										</div>
									)}
								</>
							)}
							<div className="border-t border-white/5 pt-4">
								<div className="text-sm font-semibold text-[#f0ecdd]">Buy crypto with card</div>
								<p className="mt-1 text-xs text-[#8a8577]">Secure Transak checkout — crypto lands directly in your wallet.{!onrampEnabled ? ' (Currently unavailable.)' : ''}</p>
								<div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
									<input className={input} value={rampForm.walletAddress} onChange={e => setRampForm({ ...rampForm, walletAddress: e.target.value })} placeholder="Your wallet address" />
									<div className="flex gap-3">
										<select className={input} value={rampForm.currency} onChange={e => setRampForm({ ...rampForm, currency: e.target.value })}>
											{['USDC', 'USDT', 'ETH', 'BTC', 'SOL'].map(c => <option key={c} value={c} className="bg-[#0f0f14]">{c}</option>)}
										</select>
										<input className={input} type="number" min="0" value={rampForm.fiatAmount} onChange={e => setRampForm({ ...rampForm, fiatAmount: e.target.value })} placeholder="USD" />
									</div>
								</div>
								<div className="mt-3">
									<GoldButton disabled={busy || !onrampEnabled} onClick={doOnramp}>Buy crypto</GoldButton>
								</div>
							</div>
						</div>
					)}
				</Card>

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
					<div className="mb-3 flex items-center gap-3">
						<span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#d4af37]/12 text-[#d4af37]"><Clock className="h-4 w-4" /></span>
						<h3 className="text-sm font-bold uppercase tracking-wide text-[#f0ecdd]">{t('wal.history')}</h3>
						<span className="h-px flex-1 bg-gradient-to-r from-[#d4af37]/30 to-transparent" />
						<span className="rounded-full border border-[#d4af37]/25 px-2 py-0.5 font-mono text-[11px] text-[#d4af37]">{(ledger?.transactions || []).length}</span>
					</div>
					<Card className="!p-0 overflow-hidden">
						{(ledger?.transactions || []).length === 0 ? (
							<div className="px-4 py-10 text-center text-sm text-[#8a8577]">{t('wal.noLedger')}</div>
						) : (
							<div className="divide-y divide-white/5">
								{ledger.transactions.map(tx => (
									<div key={tx.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
										<div className="min-w-0">
											<div className="truncate font-medium text-[#f0ecdd]">{{ deposit: t('wal.deposit'), withdraw: t('wal.withdraw'), withdraw_crypto: t('wal.withdraw'), pay: t('bill.payWallet'), swap: 'Swap' }[tx.type] || tx.type} <span className="text-[#8a8577]">{tx.currency}</span></div>
											<div className="truncate text-xs text-[#6a665a]">{new Date(tx.created).toLocaleString()} · {tx.status} {tx.reference ? `· ${shortAddr(tx.reference)}` : ''}</div>
										</div>
										<div className={`shrink-0 font-mono font-bold ${Number(tx.amount) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{Number(tx.amount) > 0 ? '+' : ''}{fmtMoney(Number(tx.amount))}</div>
									</div>
								))}
							</div>
						)}
					</Card>
				</div>

				<div className="flex items-center gap-2 text-xs text-[#8a8577]"><ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" /> Operated by TradingBible LLC. Deposits via Stripe · bank payouts via Stripe Connect (ID-verified) · crypto is non-custodial.</div>
			</div>
		</AppLayout>
	);
}
