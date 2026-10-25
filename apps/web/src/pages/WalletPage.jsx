import React, { useState, useEffect } from 'react';
import { Wallet, Plus, Trash2, RefreshCw, ShieldCheck, KeyRound, ExternalLink, AlertTriangle, CreditCard, ArrowUpRight, ArrowDownRight, Landmark, Send, Download, ArrowLeftRight, FileText, Coins, Lock, ChevronDown } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { fmtMoney } from '@/lib/mockData';
import { useI18n } from '@/lib/i18n';
import { txt, numOrNull } from '@/lib/safeRender';
import { useWallet, NETWORK_LIST } from '@/hooks/useWallet';
import { useAuth } from '@/hooks/useAuth';
import { useTbc } from '@/lib/tbc';
import { useToast } from '@/hooks/use-toast';
import { Card, SectionHead, EmptyState, GoldButton, GhostButton, Skeleton, Note } from '@/components/ui-kit';
import { AtBadge, AtButton, AtPageBar, AtMetric, AtPanel, AtProgress, AtTabs } from '@/components/AtelierUI';
import TbcCard from '@/components/TbcCard';
import AirdropClaim from '@/components/AirdropClaim';
import { TbcSign, TbcMoney } from '@/components/TbcSign';

const input = 'w-full rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-2.5 text-sm text-[#e9e7df] placeholder-[#6a665a] outline-none focus:border-[#d4af37]/50 min-h-[44px]';

const EXPLORER = {
	bitcoin: (a) => `https://mempool.space/address/${a}`,
	ethereum: (a) => `https://etherscan.io/address/${a}`,
	'usdc-ethereum': (a) => `https://etherscan.io/address/${a}`,
	'usdt-ethereum': (a) => `https://etherscan.io/address/${a}`,
	'usdc-base': (a) => `https://basescan.org/address/${a}`,
	'usdc-polygon': (a) => `https://polygonscan.com/address/${a}`,
	solana: (a) => `https://solscan.io/account/${a}`,
	'tbc-ethereum': (a) => `https://etherscan.io/address/${a}`,
	'tbc-base': (a) => `https://basescan.org/address/${a}`,
};

function shortAddr(a) {
	const str = txt(a, '');
	if (!str) return '';
	return str.length > 18 ? `${str.slice(0, 10)}…${str.slice(-8)}` : str;
}

/* ── Collapsible crypto widget: header always visible, body on tap ── */
function CryptoWidget({ id, num, title, sub, open, onToggle, actions, children }) {
	return (
		<div id={id} className="scroll-mt-24 overflow-hidden rounded-3xl border border-white/8 bg-black/20">
			<div className="flex w-full items-center gap-2 p-4 sm:p-5">
				<button onClick={onToggle} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-3 text-left">
					<span className="shrink-0 font-mono text-[11px] font-bold text-[#5f5b50]">{num}</span>
					<span className="min-w-0 flex-1">
						<span className="block truncate text-sm font-bold text-[#f0ecdd]">{title}</span>
						{sub ? <span className="mt-0.5 block truncate text-xs text-[#8a8577]">{sub}</span> : null}
					</span>
				</button>
				{actions}
				<button onClick={onToggle} aria-label={open ? 'Collapse section' : 'Expand section'} aria-expanded={open} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#d4af37] hover:bg-[#d4af37]/10">
					<ChevronDown className={`h-4 w-4 transition ${open ? 'rotate-180' : ''}`} />
				</button>
			</div>
			{open && <div className="border-t border-white/5 p-4 sm:p-5">{children}</div>}
		</div>
	);
}

/* ── Money path: Fund → Verify → Connect → Withdraw ─────────────── */
function MoneyPath({ walletBalance, tbcBalance, kycStatus, connectStatus, railBusy, busy, depAmount, setDepAmount, withAmount, setWithAmount, showDep, setShowDep, showWith, setShowWith, doDeposit, doWithdraw, doOnboard, doKyc, onGoCrypto, t }) {
	const goCrypto = (id) => {
		if (onGoCrypto) onGoCrypto(id);
		else document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	};
	const [counter, setCounter] = useState('fund'); // fund | cashout | id | bank
	const verified = kycStatus === 'verified';
	const banked = connectStatus === 'active';
	const tabs = [
		{ id: 'fund', label: t('wal.mpFund'), state: walletBalance > 0 ? 'loaded' : 'empty' },
		{ id: 'id', label: t('wal.mpId'), state: verified ? 'done' : 'todo' },
		{ id: 'bank', label: t('wal.mpBank'), state: banked ? 'done' : 'todo' },
		{ id: 'cashout', label: t('wal.mpCash'), state: 'open' },
	];
	return (
		<Card className="overflow-hidden !p-0">
			<div className="flex gap-1 overflow-x-auto border-b border-white/5 bg-black/30 p-1.5">
				{tabs.map((tb) => (
					<button key={tb.id} onClick={() => setCounter(tb.id)}
						className={`flex min-h-[38px] flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 text-[13px] font-bold transition ${counter === tb.id ? 'bg-[#d4af37]/20 text-[#d4af37]' : 'text-[#8a8577] hover:text-[#e9e7df]'}`}>
						<span className={`h-1.5 w-1.5 rounded-full ${tb.state === 'done' || tb.state === 'loaded' ? 'bg-emerald-400' : tb.state === 'open' ? 'bg-[#d4af37]' : 'bg-white/15'}`} />
						{tb.label}
					</button>
				))}
			</div>
			<div className="p-3.5 sm:p-4">
				{counter === 'fund' && (
					<div>
						<h3 className="flex flex-wrap items-baseline gap-x-2 text-base font-extrabold text-[#f0ecdd]">Feed the till <span className="text-[#d4af37]"><TbcMoney amount={tbcBalance} /></span><span className="font-mono text-xs font-semibold text-[#8a8577]">· only TBC spends</span></h3>
						<p className="mt-1 max-w-xl text-[12px] leading-relaxed text-[#8a8577]">Nothing else spends in-app. Convert cash, buy crypto or receive TBC — then entries, signals and mentorship unlock. Plans stay on card/cash. Pools and lending open with the network.</p>
						<div className="mt-3 flex flex-wrap items-center gap-2">
							<GhostButton onClick={() => goCrypto('tbc-convert')} className="!min-h-[44px] whitespace-nowrap !px-4 !py-2.5 !text-xs !font-semibold">Convert cash → TBC</GhostButton>
							<GhostButton onClick={() => goCrypto('buy-crypto')} className="!min-h-[44px] whitespace-nowrap !px-4 !py-2.5 !text-xs !font-semibold">Buy crypto</GhostButton>
							<GhostButton onClick={() => goCrypto('defi-section')} className="!min-h-[44px] whitespace-nowrap !px-4 !py-2.5 !text-xs !font-semibold">Explore DeFi</GhostButton>
							<GhostButton onClick={() => goCrypto('tbc-convert')} className="!min-h-[44px] whitespace-nowrap !px-4 !py-2.5 !text-xs !font-semibold">Receive TBC</GhostButton>
						</div>
						{!showDep ? (
							<GoldButton onClick={() => setShowDep(true)} className="mt-3 !min-h-[44px] whitespace-nowrap !px-5 !py-2.5 !text-xs"><ArrowDownRight className="h-4 w-4" /> Top up cash ({fmtMoney(walletBalance)} for plans / convert)</GoldButton>
						) : (
							<div className="mt-3 flex max-w-md flex-col gap-2 min-[420px]:flex-row">
								<input className={input} type="number" min="1" value={depAmount} onChange={e => setDepAmount(e.target.value)} placeholder={t('wal.amountUsd')} />
								<GoldButton disabled={busy} onClick={doDeposit}>{t('wal.fundStripe')}</GoldButton>
							</div>
						)}
					</div>
				)}
				{counter === 'id' && (
					<div>
						<div className="flex items-center gap-3">
							{!verified && (
								<GhostButton disabled={railBusy === 'kyc'} onClick={doKyc} className="!shrink-0 !px-5 !py-2.5 !text-xs">{railBusy === 'kyc' ? '…' : 'Start the ID check'}</GhostButton>
							)}
							<h3 className="ml-auto min-w-0 truncate text-right text-base font-extrabold text-[#f0ecdd]">Prove it is you</h3>
						</div>
						<p className="ml-auto mt-1 max-w-lg text-right text-[13px] text-[#8a8577]">
							{verified
								? 'Stamped and sealed — details locked for good.'
								: 'One scan unlocks payouts. Details must match your ID.'}
						</p>
					</div>
				)}
				{counter === 'bank' && (
					<div>
						<h3 className="text-base font-extrabold text-[#f0ecdd]">Point to your bank</h3>
						<p className="mt-1 max-w-lg text-[13px] text-[#8a8577]">
							{banked
								? 'Linked — cash-outs land in 2–5 days.'
								: verified
									? 'ID stamped — now pick where money sleeps.'
									: 'ID check first — then this opens.'}
						</p>
						{verified && !banked && (
							<GhostButton disabled={railBusy === 'connect'} onClick={doOnboard} className="mt-4 !px-5 !py-2.5 !text-xs">{railBusy === 'connect' ? '…' : 'Link my bank'}</GhostButton>
						)}
					</div>
				)}
				{counter === 'cashout' && (
					<div>
						<h3 className="text-base font-extrabold text-[#f0ecdd]">Take it home</h3>
						{!verified ? (
							<div>
								<p className="mt-1 max-w-lg text-[13px] text-[#8a8577]">The vault opens after your ID check — one scan, then come back here.</p>
								<GhostButton disabled={railBusy === 'kyc'} onClick={doKyc} className="mt-3 !px-5 !py-2.5 !text-xs">{railBusy === 'kyc' ? '…' : 'Do the ID check'}</GhostButton>
							</div>
						) : !banked ? (
							<div>
								<p className="mt-1 max-w-lg text-[13px] text-[#8a8577]">ID stamped — point to your bank and the road is clear.</p>
								<GhostButton disabled={railBusy === 'connect'} onClick={doOnboard} className="mt-3 !px-5 !py-2.5 !text-xs">{railBusy === 'connect' ? '…' : 'Link my bank'}</GhostButton>
							</div>
						) : !showWith ? (
							<GoldButton onClick={() => setShowWith(true)} className="mt-3 !px-5 !py-2.5 !text-xs"><ArrowUpRight className="h-4 w-4" /> Cash out</GoldButton>
						) : (
							<div className="mt-3 max-w-md space-y-2">
								<input className={input} type="number" min="1" value={withAmount} onChange={e => setWithAmount(e.target.value)} placeholder={t('wal.amountUsd')} />
								<GoldButton disabled={busy} onClick={doWithdraw}>Send it to my bank</GoldButton>
							</div>
						)}
					</div>
				)}
			</div>
		</Card>
	);
}

export default function WalletPage() {
	const bank = useWallet();
	const { user, isAuthReady } = useAuth();
	const { wallets, totalUsd, ledger, loading, syncing, reload, addWallet, removeWallet, deposit, withdraw } = bank;
	const { rails, loadRails, onboardConnect, refreshConnectStatus, startKyc, refreshKycStatus, onrampOrder, transfer, getAccounts, getStatement, downloadStatement } = bank;
	const { toast } = useToast();
	const { t } = useI18n();
	const { tbc } = useTbc();
	const trackNetworks = [
		...NETWORK_LIST,
		...(tbc.contracts?.ethereum ? [{ id: 'tbc-ethereum', label: 'TBC · Ethereum' }] : []),
		...(tbc.contracts?.base ? [{ id: 'tbc-base', label: 'TBC · Base' }] : []),
	];
	const [adding, setAdding] = useState(false);
	const [form, setForm] = useState({ network: 'bitcoin', address: '', label: '' });
	const [busy, setBusy] = useState(false);
	const [depAmount, setDepAmount] = useState('50');
	const [withAmount, setWithAmount] = useState('');
	const [showDep, setShowDep] = useState(false);
	const [showWith, setShowWith] = useState(false);
	const [showTrack, setShowTrack] = useState(false);
	const [railBusy, setRailBusy] = useState('');
	const [needsSetup, setNeedsSetup] = useState(false);
	// On-ramp state (card → crypto to your own wallet via Transak)
	const [rampForm, setRampForm] = useState({ walletAddress: '', currency: 'USDC', network: 'ethereum', fiatAmount: '100' });

	const walletBalance = ledger?.balances?.USD || 0;
	const tbcBalance = ledger?.balances?.TBC || 0;
	const kycStatus = rails?.kyc?.status || 'none';
	const connectStatus = rails?.connect?.status || 'none';
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

	const markSetup = (e) => {
		if (e?.message === 'setup_required' || String(e?.message || '').includes('APPLY_MISSING_TABLES')) {
			setNeedsSetup(true);
			return true;
		}
		return false;
	};

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
		if (!window.confirm(`Stop tracking ${label}?`)) return;
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

	const needsAddress = !String(user?.address || '').trim();
	const addressGate = () => {
		if (!needsAddress) return false;
		toast({ variant: 'destructive', title: 'Residential address required', description: 'Add your residential address in Profile — it is compulsory for withdrawals and identity (KYC) verification.' });
		return true;
	};

	const doWithdraw = async () => {
		if (addressGate()) return;
		const n = Number(withAmount);
		if (!n) { toast({ variant: 'destructive', title: t('wal.amountUsd') }); return; }
		setBusy(true);
		try {
			const data = await withdraw(n);
			toast({ title: t('wal.withdraw'), description: `$${n} on its way to your bank (transfer ${shortAddr(data?.transferId || '')})` });
			setWithAmount(''); setShowWith(false);
		} catch (e) {
			if (markSetup(e)) toast({ variant: 'destructive', title: 'Database setup needed', description: 'Run APPLY_MISSING_TABLES.sql once, then retry.' });
			else if (e?.code === 'kyc_required') {
				toast({ variant: 'destructive', title: 'Identity verification required', description: 'Verify your identity to enable withdrawals.' });
				setShowWith(false);
			} else if (e?.code === 'account_suspended') {
				toast({ variant: 'destructive', title: 'Account suspended', description: 'Flagged during the payout identity review. Contact live support.' });
				setTimeout(() => window.location.reload(), 1200);
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
		try { await onboardConnect('US'); } catch (e) {
			if (markSetup(e)) toast({ variant: 'destructive', title: 'Database setup needed', description: 'Run APPLY_MISSING_TABLES.sql once, then retry.' });
			else toast({ variant: 'destructive', title: 'Bank setup', description: e.message });
		} finally { setRailBusy(''); }
	};

	const doKyc = async () => {
		if (addressGate()) return;
		setRailBusy('kyc');
		try { await startKyc(); } catch (e) {
			if (markSetup(e)) toast({ variant: 'destructive', title: 'Database setup needed', description: 'Run APPLY_MISSING_TABLES.sql once, then retry.' });
			else toast({ variant: 'destructive', title: 'Identity verification', description: e.message });
		} finally { setRailBusy(''); }
	};

	const doOnramp = async () => {
		if (!rampForm.walletAddress.trim()) { toast({ variant: 'destructive', title: 'Your wallet address is required' }); return; }
		setBusy(true);
		try {
			await onrampOrder({ ...rampForm, fiatAmount: Number(rampForm.fiatAmount) || undefined });
			toast({ title: 'Opening secure checkout', description: 'Complete the purchase with Transak — crypto lands in your wallet.' });
		} catch (e) { toast({ variant: 'destructive', title: 'Card-to-crypto', description: e.message }); } finally { setBusy(false); }
	};

	const txLabel = (type) => ({ deposit: t('wal.deposit'), withdraw: t('wal.withdraw'), withdraw_crypto: t('wal.withdraw'), pay: t('bill.payWallet'), reward: 'Reward', payout: 'Payout', tbc_convert: 'TBC convert', tbc_claim: 'TBC claim', tbc_send: 'TBC sent', tbc_receive: 'TBC received', affiliate_payout: 'Affiliate TBC', airdrop: 'Airdrop', transfer_out: 'Sent', transfer_in: 'Received' }[txt(type, '')] || txt(type, String(type ?? '')));

	// ── Bank infrastructure: accounts, P2P send, statements ──
	const [accounts, setAccounts] = useState([]);
	const [bankTab, setBankTab] = useState('accounts'); // accounts | send | money | crypto | activity
	const [defiTab, setDefiTab] = useState('pools'); // pools | lend (native spot opens with network)
	const [openPool, setOpenPool] = useState(null); // which pool's staging form is open
	const [poolInputs, setPoolInputs] = useState({}); // { [pair]: { a, b } }
	const [stagedPools, setStagedPools] = useState({}); // { [pair]: 'a + b' }
	const [lendInputs, setLendInputs] = useState({}); // { [asset]: amount }
	const [openSection, setOpenSection] = useState(null); // vault | buy | defi — collapsed widgets
	const toggleSection = (id) => {
		setOpenSection((o) => (o === id ? null : id));
	};
	useEffect(() => {
		const open = (e) => {
			const id = e?.detail;
			if (id === 'buy' || id === 'buy-crypto') { setBankTab('crypto'); setOpenSection('buy'); setTimeout(() => document.getElementById('buy-crypto')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 250); }
			if (id === 'defi' || id === 'defi-section') { setBankTab('crypto'); setOpenSection('defi'); }
			// Legacy: old swap tiles route to DeFi now that the swap desk is gone.
			if (id === 'swap' || id === 'swap-desk') { setBankTab('crypto'); setOpenSection('defi'); }
		};
		window.addEventListener('tb:open-section', open);
		return () => window.removeEventListener('tb:open-section', open);
	}, []);
	const BANK_TABS = [
		{ id: 'accounts', label: t('wal.accounts'), icon: Landmark },
		{ id: 'send', label: t('wal.tabSend'), icon: Send },
		{ id: 'money', label: t('wal.tabMoney'), icon: ArrowDownRight },
		{ id: 'crypto', label: t('wal.tabCrypto'), icon: Coins },
		{ id: 'activity', label: t('wal.tabActivity'), icon: FileText },
	];
	const goCryptoSection = (id) => {
		setBankTab('crypto');
		if (id === 'tbc-convert') {
			try { window.dispatchEvent(new CustomEvent('tb:open-rail', { detail: 'convert' })); } catch { /* ignore */ }
			setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 220);
			return;
		}
		if (id === 'buy-crypto') setOpenSection('buy');
		if (id === 'defi-section' || id === 'swap-desk') setOpenSection('defi');
		setTimeout(() => document.getElementById(id === 'swap-desk' ? 'defi-section' : id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 220);
	};
	// Deep links: /app/wallet?tab=send|crypto|activity… land on the right set.
	useEffect(() => {
		try {
			const tab = new URLSearchParams(window.location.search).get('tab');
			if (['accounts', 'send', 'money', 'crypto', 'activity'].includes(tab)) setBankTab(tab);
		} catch { /* ignore */ }
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);
	const [sendForm, setSendForm] = useState({ to: '', asset: 'TBC', amount: '', memo: '' });
	const [sendBusy, setSendBusy] = useState(false);
	const [stmtMonth, setStmtMonth] = useState(() => new Date().toISOString().slice(0, 7));
	const [statement, setStatement] = useState(null);
	const [stmtBusy, setStmtBusy] = useState(false);

	useEffect(() => {
		if (!isAuthReady) return;
		getAccounts().then(setAccounts).catch(() => {});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isAuthReady]);

	const doSend = async (e) => {
		e?.preventDefault?.();
		if (!sendForm.to.trim()) { toast({ variant: 'destructive', title: t('wal.recipientRequired'), description: t('wal.recipientHint') }); return; }
		const n = Number(sendForm.amount);
		if (!n || n < 1) { toast({ variant: 'destructive', title: t('wal.sendAmount'), description: t('wal.minSend') }); return; }
		setSendBusy(true);
		try {
			const data = await transfer({
				to: sendForm.to.trim(), asset: sendForm.asset, amount: n,
				memo: sendForm.memo.trim(),
				idempotencyKey: `${user?.id || 'u'}_${Date.now()}_${n}`,
			});
			const who = data?.to?.username || data?.to?.email || sendForm.to.trim();
			toast({ title: data?.replay ? t('wal.noDouble') : t('wal.sentTo', { n, asset: sendForm.asset, who }) });
			setSendForm({ to: '', asset: sendForm.asset, amount: '', memo: '' });
			getAccounts().then(setAccounts).catch(() => {});
		} catch (err) {
			if (err?.code === 'kyc_required') {
				toast({ variant: 'destructive', title: t('wal.kycSendTitle'), description: t('wal.kycSendSub') });
			} else if (err?.code === 'recipient_not_found') {
				toast({ variant: 'destructive', title: t('wal.noRecipient'), description: t('wal.noRecipientSub') });
			} else {
				toast({ variant: 'destructive', title: t('wal.sendFail'), description: err?.message || 'Try again.' });
			}
		} finally { setSendBusy(false); }
	};

	const loadStatement = async () => {
		if (!/^\d{4}-\d{2}$/.test(stmtMonth)) return;
		setStmtBusy(true);
		try { setStatement(await getStatement(stmtMonth)); }
		catch (err) { toast({ variant: 'destructive', title: 'Statement failed', description: err?.message || 'Try again.' }); }
		finally { setStmtBusy(false); }
	};

	const saveStatementCsv = async () => {
		if (!/^\d{4}-\d{2}$/.test(stmtMonth)) return;
		setStmtBusy(true);
		try { await downloadStatement(stmtMonth); }
		catch { toast({ variant: 'destructive', title: 'Download failed' }); }
		finally { setStmtBusy(false); }
	};

	return (
		<AppLayout title={t('nav.wallet')}>
			<div className="at-page at-scope at-enter">
				<AtPageBar
					meta={['1 TBC = 1 KWD']}
					actions={(
						<>
							<AtButton onClick={() => { setBankTab('money'); setShowDep(true); }} variant="gold" icon={Plus}>Top up cash</AtButton>
							<AtButton onClick={reload} disabled={syncing} variant="quiet" icon={RefreshCw}>Refresh</AtButton>
						</>
					)}
				/>

				<div className="mt-4">
					<AtTabs tabs={BANK_TABS} active={bankTab} onChange={setBankTab} />
				</div>

			{bankTab === 'accounts' && (
			<>
			{/* ── Accounts: one card per safe, balance + number together ── */}
			<div className="mb-3 flex items-baseline gap-3">
				<h3 className="whitespace-nowrap font-mono text-sm font-bold uppercase tracking-widest text-[#f0ecdd]">{t('wal.accounts')}</h3>
				<span className="h-px flex-1 bg-gradient-to-r from-[#d4af37]/30 to-transparent" />
				<GhostButton onClick={() => setBankTab('send')} className="!px-3 !py-2 !text-xs"><Send className="h-4 w-4" /> {t('wal.sendMoney')}</GhostButton>
			</div>
			<div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
				<div className="at-card relative overflow-hidden p-5">
					<span aria-hidden className="at-watermark !right-4 !top-1 !text-[4.4rem]">TBC</span>
					<div className="flex items-center justify-between gap-2">
						<AtBadge tone="gold">Only money that spends</AtBadge>
						<Wallet className="h-4 w-4 text-[var(--at-gold)]" />
					</div>
					<div className="mt-4 font-display text-[28px] font-semibold leading-none tracking-[-0.05em] text-[var(--at-ink)]"><TbcMoney amount={tbcBalance} /></div>
					<div className="mt-1.5 font-mono text-[10px] tracking-wider text-[var(--at-mut-2)]">
						{(() => { const a = accounts.find((x) => x.asset === 'TBC'); return a?.number ? `${a.number} ···· ${a.last4}` : t('wal.noAcctNum'); })()}
					</div>
					<p className="mt-2 text-[10px] leading-relaxed text-[var(--at-mut)]">Entries, signals, mentorship and eligible services. Credits never pay for a subscription.</p>
				</div>
				<div className="at-card relative overflow-hidden p-5">
					<span aria-hidden className="at-watermark !right-4 !top-1 !text-[4.4rem]">USD</span>
					<div className="flex items-center justify-between gap-2">
						<AtBadge tone="green">Plans pay here</AtBadge>
						<CreditCard className="h-4 w-4 text-[var(--at-green)]" />
					</div>
					<div className="mt-4 font-display text-[28px] font-semibold leading-none tracking-[-0.05em] text-[var(--at-ink)]">{fmtMoney(walletBalance)}</div>
					<div className="mt-1.5 font-mono text-[10px] tracking-wider text-[var(--at-mut-2)]">
						{(() => { const a = accounts.find((x) => x.asset !== 'TBC'); return a?.number ? `${a.number} ···· ${a.last4}` : t('wal.noAcctNum'); })()}
					</div>
					<p className="mt-2 text-[10px] leading-relaxed text-[var(--at-mut)]">Cash and card cover subscriptions. TBC is never accepted as payment for a plan.</p>
				</div>
				<div className="at-card relative overflow-hidden p-5">
					<div className="flex items-center justify-between gap-2">
						<AtBadge tone={connectStatus === 'active' ? 'green' : 'amber'}>{connectStatus === 'active' ? 'Payout ready' : 'Payout locked'}</AtBadge>
						<Landmark className="h-4 w-4 text-[var(--at-gold)]" />
					</div>
					<div className="mt-4 font-display text-[28px] font-semibold leading-none tracking-[-0.05em] text-[var(--at-ink)]">{connectStatus === 'active' ? 'Ready' : kycStatus === 'verified' ? 'Almost' : 'Locked'}</div>
					<div className="mt-1.5 text-[10px] text-[var(--at-mut-2)]">Bank withdrawal rail</div>
					<div className="mt-3 flex items-center gap-2">
						<AtProgress className="flex-1" value={connectStatus === 'active' ? 100 : kycStatus === 'verified' ? 66 : 25} tone={connectStatus === 'active' ? 'green' : 'gold'} />
						<span className="font-mono text-[9px] text-[var(--at-mut-2)]">{connectStatus === 'active' ? '100%' : kycStatus === 'verified' ? '66%' : '25%'}</span>
					</div>
					<p className="mt-2 text-[10px] leading-relaxed text-[var(--at-mut)]">{connectStatus === 'active' ? 'Payouts flow to your verified bank account.' : 'Verify identity, then connect a bank to open withdrawals.'}</p>
				</div>
			</div>
			</>
			)}
			{bankTab === 'send' && (
					<form onSubmit={doSend} className="mt-3 rounded-3xl border border-[#d4af37]/25 bg-[#d4af37]/[0.04] p-4 sm:p-5">
						<div className="flex items-center gap-2 text-sm font-bold text-[#f0ecdd]"><ArrowLeftRight className="h-4 w-4 text-[#d4af37]" /> {t('wal.sendTitle')}</div>
						<p className="mt-1 text-xs text-[#8a8577]">{t('wal.sendSub')}</p>
						<div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
							<input className={input} value={sendForm.to} onChange={(e) => setSendForm({ ...sendForm, to: e.target.value })} placeholder={t('wal.sendTo')} autoComplete="off" />
							<div className="grid grid-cols-2 gap-3">
								<select className={input} value={sendForm.asset} onChange={(e) => setSendForm({ ...sendForm, asset: e.target.value })}>
									<option value="TBC" className="bg-[#0f0f14]">TBC</option>
									<option value="USD" className="bg-[#0f0f14]">USD cash</option>
								</select>
								<input className={input} type="number" min="1" step="any" value={sendForm.amount} onChange={(e) => setSendForm({ ...sendForm, amount: e.target.value })} placeholder={t('wal.sendAmount')} />
							</div>
						</div>
						<input className={`${input} mt-3`} value={sendForm.memo} onChange={(e) => setSendForm({ ...sendForm, memo: e.target.value })} placeholder={t('wal.sendMemo')} maxLength={120} autoComplete="off" />
						<div className="mt-3 flex flex-wrap gap-2">
							<GoldButton disabled={sendBusy} className="!min-h-[44px] !px-5 !py-2.5 !text-xs"><Send className="h-4 w-4" /> {sendBusy ? t('wal.sending') : `${t('wal.sendBtn')} ${sendForm.asset}`}</GoldButton>
							<GhostButton type="button" onClick={() => setBankTab('accounts')} className="!min-h-[44px] !px-4 !py-2.5 !text-xs">Cancel</GhostButton>
						</div>
					</form>
			)}
			{bankTab === 'accounts' && (
				<>
				{/* ── Statements (phone-first ledger card) ── */}
				<Card className="mt-3 overflow-hidden !p-0">
					<div className="flex items-center gap-3 border-b border-white/5 bg-black/20 px-4 py-3.5">
						<span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#d4af37]/15 text-[#d4af37]"><FileText className="h-5 w-5" /></span>
						<div className="min-w-0 flex-1">
							<div className="truncate text-sm font-extrabold text-[#f0ecdd]">{t('wal.statements')}</div>
							<div className="truncate text-xs text-[#8a8577]">{t('wal.stmtSub')}</div>
						</div>
						{statement && <span className="shrink-0 rounded-full border border-[#d4af37]/25 px-2 py-0.5 font-mono text-[11px] font-bold text-[#d4af37]">{statement.count}</span>}
					</div>
					<div className="p-4 sm:p-5">
						<div className="grid grid-cols-[1fr_auto] gap-2">
							<input type="month" className={input} value={stmtMonth} max={new Date().toISOString().slice(0, 7)} onChange={(e) => setStmtMonth(e.target.value)} aria-label="Statement month" />
							<GoldButton onClick={loadStatement} disabled={stmtBusy} className="!min-h-[44px] !px-5 !py-2 !text-xs">{stmtBusy ? '…' : t('wal.view')}</GoldButton>
						</div>
						<GhostButton onClick={saveStatementCsv} disabled={stmtBusy} className="mt-2 w-full !min-h-[44px] !py-2.5 !text-xs sm:w-auto"><Download className="h-4 w-4" /> CSV</GhostButton>
						{statement ? (
							<div className="mt-3 overflow-hidden rounded-2xl border border-white/[0.07]">
								<div className="flex items-center justify-between gap-2 bg-black/30 px-4 py-2.5">
									<span className="text-[10px] font-bold uppercase tracking-widest text-[#5f5b50]">{t('wal.opened')}</span>
									<span className="text-right font-mono text-xs text-[#c9c4b4]">{fmtMoney(statement.opening?.USD || 0)} · {Number(statement.opening?.TBC || 0).toLocaleString()} TBC</span>
								</div>
								<div className="flex items-center justify-between gap-2 px-4 py-2.5">
									<span className="text-[10px] font-bold uppercase tracking-widest text-[#5f5b50]">{t('wal.lines')}</span>
									<span className="font-mono text-xs font-bold text-[#f0ecdd]">{statement.count}</span>
								</div>
								<div className="flex items-center justify-between gap-2 bg-emerald-400/[0.06] px-4 py-2.5">
									<span className="text-[10px] font-bold uppercase tracking-widest text-[#5f5b50]">{t('wal.closedCash')}</span>
									<span className="font-mono text-xs font-bold text-emerald-400">{fmtMoney(statement.closing?.USD || 0)}</span>
								</div>
								<div className="flex items-center justify-between gap-2 bg-emerald-400/[0.06] px-4 py-2.5">
									<span className="text-[10px] font-bold uppercase tracking-widest text-[#5f5b50]">{t('wal.closedTbc')}</span>
									<span className="font-mono text-xs font-bold text-emerald-400">{Number(statement.closing?.TBC || 0).toLocaleString()} TBC</span>
								</div>
							</div>
						) : (
							<p className="mt-3 rounded-xl border border-dashed border-white/10 px-3 py-3 text-center text-xs text-[#6a665a]">Pick a month, tap View — opening, every line, closing.</p>
						)}
					</div>
				</Card>
				</>
			)}

				{needsSetup && (
					<Card className="border-[#d4af37]/40 p-5">
						<div className="flex items-start gap-3">
							<AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#d4af37]" />
							<div className="min-w-0">
								<div className="font-semibold text-[#f0ecdd]">One-time database setup needed</div>
								<p className="mt-1 text-sm leading-relaxed text-[#8a8577]">
									Bank + ID features need their tables. Open Supabase → SQL editor → paste and run
									<span className="font-mono text-[#d4af37]"> APPLY_MISSING_TABLES.sql </span>
									from the project root, then reload.
								</p>
							</div>
						</div>
					</Card>
				)}

				{bankTab === 'money' && (
				<MoneyPath
					walletBalance={walletBalance} tbcBalance={tbcBalance} kycStatus={kycStatus} connectStatus={connectStatus}
					railBusy={railBusy} busy={busy} depAmount={depAmount} setDepAmount={setDepAmount}
					withAmount={withAmount} setWithAmount={setWithAmount} showDep={showDep} setShowDep={setShowDep}
					showWith={showWith} setShowWith={setShowWith} doDeposit={doDeposit} doWithdraw={doWithdraw}
					doOnboard={doOnboard} doKyc={doKyc} onGoCrypto={goCryptoSection} t={t}
				/>
				)}

				{bankTab === 'crypto' && (
				<>
				<div id="tbc-convert" className="scroll-mt-24">
					<TbcCard onChanged={reload} />
				</div>

				<AirdropClaim onChanged={reload} />
				</>
				)}

				{bankTab === 'activity' && (
				<>
				{/* ── Paper trail ── */}
				<div>
					<div className="mb-3 flex items-baseline gap-3">
						<h3 className="whitespace-nowrap font-mono text-sm font-bold uppercase tracking-widest text-[#f0ecdd]">Paper trail</h3>
						<span className="h-px flex-1 bg-gradient-to-r from-[#d4af37]/30 to-transparent" />
						<span className="rounded-full border border-[#d4af37]/25 px-2 py-0.5 font-mono text-[11px] text-[#d4af37]">{(ledger?.transactions || []).length} lines</span>
					</div>
					<Card className="!p-0 overflow-hidden">
						{(ledger?.transactions || []).length === 0 ? (
							<div className="px-4 py-10 text-center text-sm text-[#8a8577]">{t('wal.noLedger')}</div>
						) : (
							<div>
								<div className="hidden grid-cols-[1fr_auto] gap-3 border-b border-[#d4af37]/12 bg-black/30 px-5 py-2.5 font-mono text-[10px] uppercase tracking-widest text-[#5f5b50] sm:grid">
									<span>Entry</span><span className="text-right">Amount</span>
								</div>
								<div className="divide-y divide-white/5">
									{ledger.transactions.map(tx => (
										<div key={tx.id} className="grid grid-cols-[2rem_1fr_auto] items-center gap-3 px-4 py-3 text-sm transition hover:bg-white/[0.03] sm:px-5">
											<span className={`grid h-8 w-8 place-items-center rounded-full font-mono text-xs font-bold ${(numOrNull(tx.amount) ?? 0) >= 0 ? 'bg-emerald-400/10 text-emerald-400' : 'bg-red-400/10 text-red-400'}`}>
												{(numOrNull(tx.amount) ?? 0) >= 0 ? '+' : '−'}
											</span>
											<div className="min-w-0">
												<div className="truncate font-semibold text-[#f0ecdd]">{txLabel(tx.type)} <span className="font-normal text-[#8a8577]">{txt(tx.currency, '')}</span></div>
												<div className="truncate font-mono text-[11px] text-[#6a665a]">{txt(tx.created, '') ? new Date(txt(tx.created, '')).toLocaleString() : ''} · {txt(tx.status, '')} {txt(tx.reference, '') ? `· ${shortAddr(txt(tx.reference, ''))}` : ''}</div>
											</div>
											<div className={`shrink-0 text-right font-mono font-bold ${(numOrNull(tx.amount) ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{(numOrNull(tx.amount) ?? 0) > 0 ? '+' : ''}{txt(tx.asset, '') === 'TBC' ? `${(numOrNull(tx.amount) ?? 0).toLocaleString()} TBC` : fmtMoney(numOrNull(tx.amount) ?? 0)}</div>
										</div>
									))}
								</div>
							</div>
						)}
					</Card>
				</div>
				</>
				)}

				{bankTab === 'crypto' && (
				<>
				<CryptoWidget id="vault" num="02" title="Coins under watch" sub={`${fmtMoney(totalUsd)} riding in ${wallets.length} pocket${wallets.length === 1 ? '' : 's'} · we see the address, never the keys`} open={openSection === 'vault'} onToggle={() => toggleSection('vault')}
					actions={<>
						<GhostButton onClick={(e) => { e.stopPropagation(); setOpenSection('vault'); setAdding((a) => !a); setShowTrack(true); }} className="!px-3 !py-2 !text-xs"><Plus className="h-4 w-4" /> {t('wal.addWallet')}</GhostButton>
						{wallets.length > 2 && <GhostButton onClick={(e) => { e.stopPropagation(); setShowTrack(!showTrack); }} className="!px-3 !py-2 !text-xs">{showTrack ? 'Hide' : `Show all (${wallets.length})`}</GhostButton>}
					</>}>
					{adding && (
						<form onSubmit={submit} className="mt-4 rounded-2xl border border-[#d4af37]/15 bg-black/20 p-4">
							<SectionHead title={t('wal.trackAddr')} />
							<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
								<select className={input} value={form.network} onChange={(e) => setForm({ ...form, network: e.target.value })}>
									{trackNetworks.map((n) => <option key={n.id} value={n.id} className="bg-[#0f0f14]">{n.label}</option>)}
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
					<div className="mt-4">
						{loading ? (
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><Skeleton className="h-36" /><Skeleton className="h-36" /></div>
						) : wallets.length === 0 ? (
							<EmptyState icon={Wallet} title={t('wal.noTrack')} />
						) : (
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
								{(showTrack || wallets.length <= 2 ? wallets : wallets.slice(0, 2)).map((w) => (
									<div key={w.id} className="rounded-2xl border border-white/8 bg-black/20 p-4">
										<div className="flex items-start justify-between gap-2">
											<div className="min-w-0">
												<div className="truncate text-xs font-semibold uppercase tracking-wide text-[#d4af37]">{w.label || w.network}</div>
												<div className="mt-1 truncate font-mono text-xs text-[#6a665a]">{shortAddr(w.address)}</div>
											</div>
											<button onClick={() => remove(w.id, w.label || w.network)} aria-label="Remove" className="grid shrink-0 place-items-center rounded-lg border border-red-500/25 px-2.5 py-1.5 text-red-400 transition hover:bg-red-500/10"><Trash2 className="h-3.5 w-3.5" /></button>
										</div>
										{w.ok ? (
											<>
												<div className="mt-3 truncate font-mono text-2xl font-bold text-[#f0ecdd]">
													{Number(w.amount).toLocaleString(undefined, { maximumFractionDigits: 6 })} <span className="text-sm font-medium text-[#8a8577]">{w.currency}</span>
												</div>
												<div className="mt-1 font-mono text-sm text-[#d4af37]">{fmtMoney(w.usdValue)}</div>
											</>
										) : (
											<div className="mt-3 flex items-center gap-2 text-sm text-red-400"><AlertTriangle className="h-4 w-4 shrink-0" /> Balance unavailable</div>
										)}
										<div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-3 text-xs text-[#6a665a]">
											<span className="rounded-full bg-[#d4af37]/10 px-2 py-0.5 uppercase tracking-wide text-[#d4af37]">{w.network.replace(/-/g, ' · ')}</span>
											{EXPLORER[w.network] && <a href={EXPLORER[w.network]?.(w.address)} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[#8a8577] hover:text-[#e9e7df]">{t('wal.explorer')} <ExternalLink className="h-3 w-3" /></a>}
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				</CryptoWidget>

				{/* ── Buy crypto with card (Transak on-ramp) ── */}
				<CryptoWidget id="buy-crypto" num="03" title="Buy crypto with card" sub="Secure Transak checkout — crypto lands directly in your wallet" open={openSection === 'buy'} onToggle={() => toggleSection('buy')}>
					<p className="text-xs leading-relaxed text-[#8a8577]">Top up your own wallet with a card, then convert to TBC above or stage a DeFi position below.{!onrampEnabled ? ' (Currently unavailable.)' : ''}</p>
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
				</CryptoWidget>

				{/* ── DeFi · native pools & lending (full build, pre-launch staging) ── */}
				<CryptoWidget id="defi-section" num="04" title="DeFi · pools & lending" sub="Stage positions now — nothing moves real funds before its gate" open={openSection === 'defi'} onToggle={() => toggleSection('defi')}>
					<div className="mb-3 flex overflow-hidden rounded-xl border border-[#d4af37]/25 text-xs font-bold">
						{[['pools', 'Pools'], ['lend', 'Lend']].map(([id, label]) => (
							<button key={id} onClick={() => setDefiTab(id)} className={`px-4 py-2 ${defiTab === id ? 'bg-[#d4af37]/20 text-[#d4af37]' : 'text-[#8a8577] hover:text-[#e9e7df]'}`}>{label}</button>
						))}
					</div>

					{defiTab === 'pools' ? (
						<div className="mt-4 space-y-2">
							{[
								{ pair: 'TBC / USDC', note: 'Flagship pool · opens with the spot DEX', gate: 'Gate 2 · staging', tokens: ['TBC', 'USDC'] },
								{ pair: 'WTBC / TBC', note: '1:1 wrap route · WTBC collateral-backed', gate: 'Gate 2 · staging', tokens: ['WTBC', 'TBC'] },
								{ pair: 'TBC / BTC', note: 'Opens after bridge approval', gate: 'Gate 3 · review', tokens: ['TBC', 'BTC'] },
							].map((pl) => {
								const open = openPool === pl.pair;
								const vals = poolInputs[pl.pair] || { a: '', b: '' };
								const staged = stagedPools[pl.pair];
								return (
									<div key={pl.pair} className="rounded-xl border border-white/5 bg-black/20 px-4 py-3">
										<div className="flex flex-wrap items-center gap-2">
											<span className="font-mono text-sm font-bold text-[#f0ecdd]">{pl.pair}</span>
											<span className="rounded-full bg-[#d4af37]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#d4af37]">{pl.gate}</span>
											<span className="ml-auto font-mono text-xs text-[#5f5b50]">TVL — · APR —</span>
										</div>
										<p className="mt-1 text-[11px] text-[#6a665a]">{pl.note}</p>
										{staged ? (
											<p className="mt-2 flex items-center gap-1.5 rounded-lg border border-emerald-400/20 bg-emerald-400/5 px-3 py-2 text-[11px] text-emerald-300">Staged locally: {staged} — nothing moved, nothing on-chain.</p>
										) : (
											<button onClick={() => setOpenPool(open ? null : pl.pair)} className="mt-2 text-[11px] font-bold text-[#d4af37] hover:underline">{open ? 'Close' : 'Prepare position →'}</button>
										)}
										{open && !staged && (
											<div className="mt-2 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
												<input className={input} type="number" min="0" value={vals.a} onChange={(e) => setPoolInputs({ ...poolInputs, [pl.pair]: { ...vals, a: e.target.value } })} placeholder={`Amount ${pl.tokens[0]}`} />
												<input className={input} type="number" min="0" value={vals.b} onChange={(e) => setPoolInputs({ ...poolInputs, [pl.pair]: { ...vals, b: e.target.value } })} placeholder={`Amount ${pl.tokens[1]}`} />
												<div className="min-[420px]:col-span-2">
													<GoldButton
														disabled={busy || !(Number(vals.a) > 0) || !(Number(vals.b) > 0)}
														onClick={() => {
														setStagedPools({ ...stagedPools, [pl.pair]: `${vals.a} ${pl.tokens[0]} + ${vals.b} ${pl.tokens[1]}` });
														setOpenPool(null);
														toast({ title: 'Position staged', description: `${pl.pair} opens at ${pl.gate.split(' · ')[0]} — your amounts are saved locally, nothing moved.` });
														}}
														className="!px-4 !py-2 !text-xs"
													>
														Stage position
													</GoldButton>
												</div>
											</div>
										)}
									</div>
								);
							})}
							<p className="flex items-center gap-1.5 text-[11px] text-[#6a665a]"><Lock className="h-3.5 w-3.5" /> No pool is funded — figures publish only with approved programs.</p>
						</div>
					) : (
						<div className="mt-4 space-y-2">
							{[
								{ asset: 'USDC', note: 'Isolated collateral · gate-three review' },
								{ asset: 'TBC', note: 'Borrow caps + funded reserves required' },
								{ asset: 'BTC', note: 'Representation approval required' },
							].map((m) => {
								const amt = lendInputs[m.asset] || '';
								return (
									<div key={m.asset} className="rounded-xl border border-white/5 bg-black/20 px-4 py-3">
										<div className="flex flex-wrap items-center gap-2">
											<span className="font-mono text-sm font-bold text-[#f0ecdd]">{m.asset}</span>
											<span className="rounded-full bg-[#d4af37]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#d4af37]">Gate 3 · staging</span>
											<span className="ml-auto font-mono text-xs text-[#5f5b50]">Supply — · Borrow —</span>
										</div>
										<p className="mt-1 text-[11px] text-[#6a665a]">{m.note}</p>
										<div className="mt-2 flex flex-col gap-2 min-[420px]:flex-row">
											<input className={input} type="number" min="0" value={amt} onChange={(e) => setLendInputs({ ...lendInputs, [m.asset]: e.target.value })} placeholder={`Amount ${m.asset}`} />
											<div className="flex gap-2">
												<GhostButton
													disabled={busy || !(Number(amt) > 0)}
													onClick={() => toast({ title: 'Supply staged', description: `${amt} ${m.asset} noted locally — lending opens at gate three, nothing moved.` })}
													className="!px-3 !py-2 !text-xs"
												>
													Supply
												</GhostButton>
												<GhostButton
													disabled={busy || !(Number(amt) > 0)}
													onClick={() => toast({ title: 'Borrow staged', description: `${amt} ${m.asset} noted locally — borrow caps apply at gate three, nothing moved.` })}
													className="!px-3 !py-2 !text-xs"
												>
													Borrow
												</GhostButton>
											</div>
										</div>
									</div>
								);
							})}
							<div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-3">
								{[
									['Gate 1', 'Transfers + staking', 'live'],
									['Gate 2', 'Spot DEX', 'staging'],
									['Gate 3', 'Lending', 'review'],
								].map(([g, label, st]) => (
									<div key={g} className="rounded-xl border border-white/5 bg-black/20 px-3 py-2.5 text-center">
										<div className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#5f5b50]">{g}</div>
										<div className="mt-0.5 text-xs font-bold text-[#f0ecdd]">{label}</div>
										<div className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${st === 'live' ? 'bg-emerald-400/10 text-emerald-300' : st === 'staging' ? 'bg-[#d4af37]/10 text-[#d4af37]' : 'bg-white/5 text-[#8a8577]'}`}>{st}</div>
									</div>
								))}
							</div>
							<p className="text-[11px] leading-relaxed text-[#6a665a]">Staged by policy: native transfers + staking at gate one, limited spot DEX at gate two, lending at gate three. Nothing here moves real funds before its gate.</p>
						</div>
					)}
				</CryptoWidget>
				</>
				)}

				<Note icon={ShieldCheck}>
					Cash ledger: every deposit, payout, challenge fee and reward is recorded here — balance is the sum of non-failed rows. Crypto tracking is non-custodial: your keys never touch our servers. DeFi pools and lending are pre-launch staging — nothing moves real funds before its gate.
				</Note>
				<div className="flex items-center gap-2 text-xs text-[#8a8577]"><ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" /> Operated by TradingBible LLC. Deposits via Stripe · bank payouts via Stripe Connect (ID-verified) · crypto is non-custodial.</div>
			</div>
		</AppLayout>
	);
}
