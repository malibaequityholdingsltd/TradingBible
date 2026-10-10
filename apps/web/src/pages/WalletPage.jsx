import React, { useState, useEffect } from 'react';
import { Wallet, Plus, Trash2, RefreshCw, ShieldCheck, KeyRound, ExternalLink, AlertTriangle, CreditCard, ArrowUpRight, ArrowDownRight, Landmark } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { fmtMoney } from '@/lib/mockData';
import { useI18n } from '@/lib/i18n';
import { useWallet, NETWORK_LIST } from '@/hooks/useWallet';
import { useAuth } from '@/hooks/useAuth';
import { useTbc } from '@/lib/tbc';
import { useToast } from '@/hooks/use-toast';
import { Card, SectionHead, EmptyState, GoldButton, GhostButton, Skeleton, Note } from '@/components/ui-kit';
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
	if (!a) return '';
	return a.length > 18 ? `${a.slice(0, 10)}…${a.slice(-8)}` : a;
}

/* ── Money path: Fund → Verify → Connect → Withdraw ─────────────── */
function MoneyPath({ walletBalance, tbcBalance, kycStatus, connectStatus, railBusy, busy, depAmount, setDepAmount, withAmount, setWithAmount, showDep, setShowDep, showWith, setShowWith, doDeposit, doWithdraw, doOnboard, doKyc, t }) {
	const [counter, setCounter] = useState('fund'); // fund | cashout | id | bank
	const verified = kycStatus === 'verified';
	const banked = connectStatus === 'active';
	const tabs = [
		{ id: 'fund', label: 'Top up', state: walletBalance > 0 ? 'loaded' : 'empty' },
		{ id: 'id', label: 'ID check', state: verified ? 'done' : 'todo' },
		{ id: 'bank', label: 'Bank', state: banked ? 'done' : 'todo' },
		{ id: 'cashout', label: 'Cash out', state: 'open' },
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
						<p className="mt-1 max-w-xl text-[12px] leading-relaxed text-[#8a8577]">Nothing else spends in-app. Convert cash, swap crypto, buy crypto or receive TBC — then entries, signals and mentorship unlock. Plans stay on card/cash.</p>
						<div className="mt-3 flex flex-wrap items-center gap-2">
							<GhostButton onClick={() => document.getElementById('tbc-convert')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="!min-h-[44px] whitespace-nowrap !px-4 !py-2.5 !text-xs !font-semibold">Convert cash → TBC</GhostButton>
							<GhostButton onClick={() => document.getElementById('swap-desk')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="!min-h-[44px] whitespace-nowrap !px-4 !py-2.5 !text-xs !font-semibold">Swap crypto → TBC</GhostButton>
							<GhostButton onClick={() => document.getElementById('swap-desk')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="!min-h-[44px] whitespace-nowrap !px-4 !py-2.5 !text-xs !font-semibold">Buy crypto</GhostButton>
							<GhostButton onClick={() => document.getElementById('tbc-convert')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="!min-h-[44px] whitespace-nowrap !px-4 !py-2.5 !text-xs !font-semibold">Receive TBC</GhostButton>
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
	const { user } = useAuth();
	const { wallets, totalUsd, ledger, loading, syncing, reload, addWallet, removeWallet, deposit, withdraw } = bank;
	const { rails, loadRails, onboardConnect, refreshConnectStatus, startKyc, refreshKycStatus, swapTokens, swapQuote, swapIntent, swapConfirm, onrampOrder } = bank;
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
	const [showSwap, setShowSwap] = useState(false);
	const [showTrack, setShowTrack] = useState(false);
	const [railBusy, setRailBusy] = useState('');
	const [needsSetup, setNeedsSetup] = useState(false);
	// Swap state (non-custodial: user signs in their own wallet)
	const [swapChains, setSwapChains] = useState([]);
	const [swapReady, setSwapReady] = useState(false);
	const [swapForm, setSwapForm] = useState({ chainId: 1, sell: 'USDC', buy: 'ETH', sellAmount: '', taker: '' });
	const [swapCustom, setSwapCustom] = useState({ sell: '', buy: '' });
	const [quote, setQuote] = useState(null);
	const [intent, setIntent] = useState(null);
	const [txHash, setTxHash] = useState('');
	// In-app signing (injected wallet: MetaMask, Coinbase, Brave, …)
	const [web3, setWeb3] = useState(null); // { address, chainId }
	const [signing, setSigning] = useState('');
	// On-ramp state (card → crypto to your own wallet via Transak)
	const [rampForm, setRampForm] = useState({ walletAddress: '', currency: 'USDC', network: 'ethereum', fiatAmount: '100' });

	const walletBalance = ledger?.balances?.USD || 0;
	const tbcBalance = ledger?.balances?.TBC || 0;
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

	const openSwap = async () => {
		const next = !showSwap;
		setShowSwap(next);
		if (next && !swapReady) {
			try {
				const data = await swapTokens();
				setSwapChains(data.chains || []);
				const first = (data.chains || [])[0];
				if (first) setSwapForm((f) => ({ ...f, chainId: first.chainId, sell: first.tokens[1]?.symbol || first.tokens[0]?.symbol, buy: 'TBC' }));
				setSwapReady(true);
			} catch { /* stays unavailable */ }
		}
	};

	const TBC_CHAIN_CONTRACT = { 1: tbc.contracts?.ethereum || '', 8453: tbc.contracts?.base || '' };
	const isTbcRef = (ref) => {
		if (ref === 'TBC') return true;
		if (!/^0x[0-9a-fA-F]{40}$/.test(ref || '')) return false;
		return Object.values(TBC_CHAIN_CONTRACT).some((c) => c && c.toLowerCase() === ref.toLowerCase());
	};
	const chainTokens = (chainId) => {
		const base = (swapChains.find(c => c.chainId === chainId)?.tokens || []).slice();
		const contract = TBC_CHAIN_CONTRACT[chainId];
		if (tbc.deployed && contract && !base.some((x) => x.symbol === 'TBC')) base.unshift({ symbol: 'TBC', contract });
		return base;
	};

	const doQuote = async () => {
		const sellRef = swapForm.sell === '__custom' ? swapCustom.sell.trim() : swapForm.sell;
		const buyRef = swapForm.buy === '__custom' ? swapCustom.buy.trim() : swapForm.buy;
		// Brand rule: every swap ends in TBC — any coin in, TBC out.
		if (!isTbcRef(buyRef)) {
			toast({ variant: 'destructive', title: 'TBC only', description: 'Every swap ends in TBC — pick TBC as the token you receive.' });
			return;
		}
		if (!tbc.deployed || !TBC_CHAIN_CONTRACT[swapForm.chainId]) {
			toast({ variant: 'destructive', title: 'TBC not live on this chain yet', description: 'Use Convert above for instant TBC — on-chain swaps open at token launch.' });
			return;
		}
		if (swapForm.sell === '__custom' && !/^0x[0-9a-fA-F]{40}$/.test(sellRef)) { toast({ variant: 'destructive', title: 'Invalid sell token address' }); return; }
		if (swapForm.buy === '__custom' && !/^0x[0-9a-fA-F]{40}$/.test(buyRef)) { toast({ variant: 'destructive', title: 'Invalid buy token address' }); return; }
		setBusy(true);
		setQuote(null); setIntent(null);
		try {
			const q = await swapQuote({ ...swapForm, sell: sellRef, buy: buyRef });
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

	// ── In-app wallet signing (ethers v6, injected provider) ──────────
	const CHAIN_META = {
		1: { name: 'Ethereum', hex: '0x1', explorer: 'https://etherscan.io/tx/' },
		8453: { name: 'Base', hex: '0x2105', explorer: 'https://basescan.org/tx/', addParams: { chainId: '0x2105', chainName: 'Base', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: ['https://mainnet.base.org'], blockExplorerUrls: ['https://basescan.org'] } },
	};

	const toBaseUnits = (human, decimals) => {
		const [whole = '0', frac = ''] = String(human).split('.');
		const padded = (frac + '0'.repeat(decimals)).slice(0, decimals);
		return (BigInt(whole || '0') * 10n ** BigInt(decimals) + BigInt(padded || '0')).toString();
	};

	const connectWallet = async () => {
		if (typeof window === 'undefined' || !window.ethereum) {
			toast({ variant: 'destructive', title: 'No wallet found', description: 'Install MetaMask, Coinbase Wallet or Brave, then try again.' });
			return;
		}
		setSigning('connecting');
		try {
			const { BrowserProvider } = await import('ethers');
			const provider = new BrowserProvider(window.ethereum);
			const accounts = await provider.send('eth_requestAccounts', []);
			const net = await provider.getNetwork();
			const address = accounts?.[0] || '';
			if (!address) throw new Error('no accounts');
			setWeb3({ address, chainId: Number(net.chainId) });
			setSwapForm((f) => ({ ...f, taker: f.taker || address }));
			toast({ title: 'Wallet connected', description: `${address.slice(0, 10)}…${address.slice(-8)}` });
		} catch (e) {
			toast({ variant: 'destructive', title: 'Wallet connect failed', description: e?.info?.error?.message || e.message });
		} finally { setSigning(''); }
	};

	const switchToSwapChain = async () => {
		if (!window.ethereum) return;
		const meta = CHAIN_META[swapForm.chainId];
		if (!meta) return;
		setSigning('switching');
		try {
			const { BrowserProvider } = await import('ethers');
			const provider = new BrowserProvider(window.ethereum);
			try {
				await provider.send('wallet_switchEthereumChain', [{ chainId: meta.hex }]);
			} catch (err) {
				if ((err?.code === 4902 || err?.info?.error?.code === 4902) && meta.addParams) {
					await provider.send('wallet_addEthereumChain', [meta.addParams]);
				} else throw err;
			}
			const net = await provider.getNetwork();
			setWeb3((w) => (w ? { ...w, chainId: Number(net.chainId) } : w));
		} catch (e) {
			toast({ variant: 'destructive', title: 'Chain switch failed', description: e?.info?.error?.message || e.message });
		} finally { setSigning(''); }
	};

	const NATIVE_SENTINEL = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
	const quoteDecimals = () => {
		if (quote && Number.isInteger(quote.sellDecimals)) return quote.sellDecimals;
		return sellTokenMeta()?.decimals ?? 18;
	};
	const sellTokenMeta = () => (swapChains.find((c) => c.chainId === swapForm.chainId)?.tokens || []).find((t) => t.symbol === swapForm.sell) || null;

	const needsApproval = () => {
		if (!quote) return false;
		if ((quote.sellTokenAddress || '').toLowerCase() === NATIVE_SENTINEL) return false; // native: no approval
		try {
			const need = BigInt(toBaseUnits(quote.sellAmount, quoteDecimals()));
			const actual = quote.allowance?.actual;
			if (actual === undefined || actual === null) return Boolean(quote.allowanceTarget); // unknown → assume needed
			return BigInt(String(actual)) < need;
		} catch { return true; }
	};

	const doApprove = async () => {
		if (!quote?.allowanceTarget || !window.ethereum) return;
		setSigning('approving');
		try {
			const { BrowserProvider, Contract } = await import('ethers');
			const provider = new BrowserProvider(window.ethereum);
			const signer = await provider.getSigner();
			const token = new Contract(quote.sellTokenAddress, ['function approve(address spender, uint256 amount) returns (bool)'], signer);
			const need = toBaseUnits(quote.sellAmount, quoteDecimals());
			const tx = await token.approve(quote.allowanceTarget, need);
			toast({ title: 'Approval submitted', description: 'Waiting for confirmation…' });
			await tx.wait(1);
			toast({ title: 'Token approved', description: 'You can now execute the swap.' });
			await doQuote();
		} catch (e) {
			toast({ variant: 'destructive', title: 'Approval failed', description: e?.info?.error?.message || e?.reason || e.message });
		} finally { setSigning(''); }
	};

	const doSwapInApp = async () => {
		if (!quote || !window.ethereum) return;
		setSigning('swapping');
		try {
			const { BrowserProvider } = await import('ethers');
			const provider = new BrowserProvider(window.ethereum);
			const signer = await provider.getSigner();
			const from = (await signer.getAddress()).toLowerCase();
			if (from !== String(swapForm.taker || web3?.address || '').toLowerCase()) {
				throw new Error('Connected wallet does not match the quote address. Reconnect or re-quote.');
			}
			const rec = await swapIntent({ chainId: quote.chainId, sell: quote.sell, buy: quote.buy, sellAmount: Number(quote.sellAmount), buyAmount: quote.buyAmount, taker: swapForm.taker || web3?.address });
			const tx = await signer.sendTransaction({ to: quote.tx.to, data: quote.tx.data, value: BigInt(quote.tx.value || '0') });
			await swapConfirm({ intentId: rec.intent.id, txHash: tx.hash });
			const meta = CHAIN_META[quote.chainId] || {};
			toast({ title: 'Swap submitted + recorded', description: `Track it: ${(meta.explorer || '') + tx.hash}` });
			setQuote(null); setIntent(null); setTxHash('');
			provider.waitForTransaction(tx.hash, 1).then(() => {
				toast({ title: 'Swap confirmed on-chain', description: `${quote.sellAmount} ${quote.sell} → ${quote.buy}` });
			}).catch(() => {});
		} catch (e) {
			toast({ variant: 'destructive', title: 'Swap failed', description: e?.info?.error?.message || e?.reason || e.message });
		} finally { setSigning(''); }
	};

	const doOnramp = async () => {
		if (!rampForm.walletAddress.trim()) { toast({ variant: 'destructive', title: 'Your wallet address is required' }); return; }
		setBusy(true);
		try {
			await onrampOrder({ ...rampForm, fiatAmount: Number(rampForm.fiatAmount) || undefined });
			toast({ title: 'Opening secure checkout', description: 'Complete the purchase with Transak — crypto lands in your wallet.' });
		} catch (e) { toast({ variant: 'destructive', title: 'Card-to-crypto', description: e.message }); } finally { setBusy(false); }
	};

	const txLabel = (type) => ({ deposit: t('wal.deposit'), withdraw: t('wal.withdraw'), withdraw_crypto: t('wal.withdraw'), pay: t('bill.payWallet'), swap: 'Swap', reward: 'Reward', payout: 'Payout', tbc_convert: 'TBC convert', tbc_claim: 'TBC claim', tbc_send: 'TBC sent', tbc_receive: 'TBC received', affiliate_payout: 'Affiliate TBC', airdrop: 'Airdrop' }[type] || type);

	return (
		<AppLayout title={t('nav.wallet')}>
			<div className="tb-page">
				{/* ── Teller bar ── */}
			<div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-3xl border border-[#d4af37]/25 bg-[#0c0c11]/95 px-5 py-4 sm:px-6">
				<span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#d4af37]/15 text-[#d4af37]"><Wallet className="h-5 w-5" /></span>
				<div className="min-w-0">
					<p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#d4af37]">My Wallet · TBC only spends</p>
					<h1 className="truncate text-xl font-extrabold tracking-tight text-[#f0ecdd] sm:text-2xl">
						<span className="text-[#d4af37]"><TbcMoney amount={tbcBalance} /></span>
						<span className="ml-2 align-middle text-[11px] font-semibold uppercase tracking-wider text-[#5f5b50]">in the till · cash {fmtMoney(walletBalance)} for plans</span>
					</h1>
				</div>
				<div className="ml-auto flex flex-wrap items-center gap-2">
					<GoldButton onClick={() => setShowDep(!showDep)} className="!min-h-[44px] !px-5 !py-2.5 !text-xs"><Plus className="h-4 w-4" /> Top up</GoldButton>
					<GhostButton onClick={reload} disabled={syncing} className="!min-h-[44px] !px-4 !py-2.5 !text-xs"><RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} /> Refresh</GhostButton>
				</div>
			</div>

			{/* ── Safes ── */}
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
				<div className="rounded-3xl border border-[#d4af37]/30 bg-[#d4af37]/[0.06] p-5 transition-all duration-200 hover:-translate-y-0.5">
					<div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[#d4af37]"><Wallet className="h-3.5 w-3.5" /> Till · TBC</div>
					<div className="mt-1.5 text-[26px] font-extrabold leading-none text-[#f0ecdd]"><TbcMoney amount={tbcBalance} /></div>
					<p className="mt-1.5 text-[11px] leading-relaxed text-[#8a8577]">Only money that spends — entries, signals, mentorship. Convert, swap, buy or receive into TBC first.</p>
				</div>
				<div className="rounded-3xl border border-emerald-400/25 bg-emerald-400/[0.05] p-5 transition-all duration-200 hover:-translate-y-0.5">
					<div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-emerald-400"><CreditCard className="h-3.5 w-3.5" /> Cash · Plans</div>
					<div className="mt-1.5 font-mono text-[26px] font-extrabold leading-none text-[#f0ecdd]">{fmtMoney(walletBalance)}</div>
					<p className="mt-1.5 text-[11px] leading-relaxed text-[#8a8577]">Plans pay by card/cash only — never TBC. Cash also converts into TBC.</p>
				</div>
				<div className="rounded-3xl border border-white/10 bg-black/30 p-5 transition-all duration-200 hover:-translate-y-0.5">
					<div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[#8a8577]"><Landmark className="h-3.5 w-3.5" /> Way out · Bank</div>
					<div className="mt-1.5 font-mono text-[26px] font-extrabold leading-none text-[#f0ecdd]">{connectStatus === 'active' ? 'Ready' : kycStatus === 'verified' ? 'Almost' : 'Locked'}</div>
					<p className="mt-1.5 text-[11px] leading-relaxed text-[#8a8577]">{connectStatus === 'active' ? 'Payouts flow straight to your bank.' : 'Verify + connect to open withdrawals.'}</p>
				</div>
			</div>

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

				<MoneyPath
					walletBalance={walletBalance} tbcBalance={tbcBalance} kycStatus={kycStatus} connectStatus={connectStatus}
					railBusy={railBusy} busy={busy} depAmount={depAmount} setDepAmount={setDepAmount}
					withAmount={withAmount} setWithAmount={setWithAmount} showDep={showDep} setShowDep={setShowDep}
					showWith={showWith} setShowWith={setShowWith} doDeposit={doDeposit} doWithdraw={doWithdraw}
					doOnboard={doOnboard} doKyc={doKyc} t={t}
				/>

				<div id="tbc-convert" className="scroll-mt-24">
					<TbcCard onChanged={reload} />
				</div>

				<AirdropClaim onChanged={reload} />

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
											<span className={`grid h-8 w-8 place-items-center rounded-full font-mono text-xs font-bold ${Number(tx.amount) >= 0 ? 'bg-emerald-400/10 text-emerald-400' : 'bg-red-400/10 text-red-400'}`}>
												{Number(tx.amount) >= 0 ? '+' : '−'}
											</span>
											<div className="min-w-0">
												<div className="truncate font-semibold text-[#f0ecdd]">{txLabel(tx.type)} <span className="font-normal text-[#8a8577]">{tx.currency}</span></div>
												<div className="truncate font-mono text-[11px] text-[#6a665a]">{tx.created ? new Date(tx.created).toLocaleString() : ''} · {tx.status} {tx.reference ? `· ${shortAddr(tx.reference)}` : ''}</div>
											</div>
											<div className={`shrink-0 text-right font-mono font-bold ${Number(tx.amount) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{Number(tx.amount) > 0 ? '+' : ''}{tx.asset === 'TBC' ? `${Number(tx.amount).toLocaleString()} TBC` : fmtMoney(Number(tx.amount))}</div>
										</div>
									))}
								</div>
							</div>
						)}
					</Card>
				</div>

				{/* ── Crypto vault ── */}
				<Card className="p-4 sm:p-5">
					<div className="flex flex-wrap items-center gap-3">
						<span className="font-mono text-[11px] font-bold text-[#5f5b50]">02</span>
						<div className="min-w-0 flex-1">
							<div className="text-sm font-bold text-[#f0ecdd]">Coins under watch</div>
							<div className="text-xs text-[#8a8577]">{fmtMoney(totalUsd)} riding in {wallets.length} pocket{wallets.length === 1 ? '' : 's'} · we see the address, never the keys</div>
						</div>
						<GhostButton onClick={() => { setAdding(!adding); setShowTrack(true); }} className="!px-3 !py-2 !text-xs"><Plus className="h-4 w-4" /> {t('wal.addWallet')}</GhostButton>
						{wallets.length > 2 && <GhostButton onClick={() => setShowTrack(!showTrack)} className="!px-3 !py-2 !text-xs">{showTrack ? 'Hide' : `Show all (${wallets.length})`}</GhostButton>}
					</div>
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
				</Card>

				{/* ── Swap desk (on-chain, NOT convert) ── */}
				<Card className="scroll-mt-24 p-4 sm:p-5" id="swap-desk">
					<div className="flex flex-wrap items-center gap-3">
						<span className="font-mono text-[11px] font-bold text-[#5f5b50]">03</span>
						<div className="min-w-0 flex-1">
							<div className="text-sm font-bold text-[#f0ecdd]">Swap crypto (on-chain, your wallet)</div>
							<div className="text-xs text-[#8a8577]">Every swap ends in TBC — any coin in, TBC out. Swap trades self-custody (gas). Convert turns cash into TBC instantly above.</div>
						</div>
						<GhostButton onClick={openSwap} className="!px-3 !py-2 !text-xs">{showSwap ? t('c.cancel') : 'Swap crypto'}</GhostButton>
					</div>
					{showSwap && (
						<div className="mt-4 space-y-4">
							{!swapEnabled ? (
								<Note icon={AlertTriangle} tone="blue">Swaps are not enabled yet (swap provider key not configured). Card-to-crypto below may still be available.</Note>
							) : !swapReady ? (
								<p className="text-xs text-[#8a8577]">Loading swap markets…</p>
							) : (
								<>
									{!web3 ? (
										<GhostButton disabled={signing === 'connecting'} onClick={connectWallet} className="!px-3 !py-2 !text-xs">
											{signing === 'connecting' ? 'Connecting…' : 'Connect wallet to sign in-app'}
										</GhostButton>
									) : (
										<div className="flex flex-wrap items-center gap-2 text-xs">
											<span className="rounded-full bg-emerald-400/10 px-2.5 py-1 font-mono text-emerald-400">
												{web3.address.slice(0, 10)}…{web3.address.slice(-8)} · {CHAIN_META[web3.chainId]?.name || `chain ${web3.chainId}`}
											</span>
											{web3.chainId !== swapForm.chainId && (
												<button onClick={switchToSwapChain} disabled={signing === 'switching'} className="rounded-full border border-[#d4af37]/30 px-2.5 py-1 font-semibold text-[#d4af37] disabled:opacity-50">
													{signing === 'switching' ? 'Switching…' : `Switch to ${CHAIN_META[swapForm.chainId]?.name || ''}`}
												</button>
											)}
											<button onClick={() => setWeb3(null)} className="text-[#6a665a] hover:text-[#e9e7df]">Disconnect</button>
										</div>
									)}
									<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
										<select className={input} value={swapForm.chainId} onChange={e => { const chainId = Number(e.target.value); const ch = swapChains.find(c => c.chainId === chainId); setSwapForm({ ...swapForm, chainId, sell: ch?.tokens[1]?.symbol || '', buy: 'TBC' }); setSwapCustom({ sell: '', buy: '' }); setQuote(null); setIntent(null); }}>
											{swapChains.map(c => <option key={c.chainId} value={c.chainId} className="bg-[#0f0f14]">{c.name}</option>)}
										</select>
										<input className={input} value={swapForm.taker} onChange={e => setSwapForm({ ...swapForm, taker: e.target.value })} placeholder="Your wallet address (0x…)" />
										<select className={input} value={swapForm.sell} onChange={e => setSwapForm({ ...swapForm, sell: e.target.value })}>
											{chainTokens(swapForm.chainId).filter(tok => tok.symbol !== 'TBC').map(tok => <option key={tok.symbol} value={tok.symbol} className="bg-[#0f0f14]">Sell {tok.symbol}</option>)}
											<option value="__custom" className="bg-[#0f0f14]">Sell custom token…</option>
										</select>
										<select className={input} value={swapForm.buy} onChange={e => setSwapForm({ ...swapForm, buy: e.target.value })}>
											{chainTokens(swapForm.chainId).map(tok => <option key={tok.symbol} value={tok.symbol} className="bg-[#0f0f14]">Buy {tok.symbol}</option>)}
											<option value="__custom" className="bg-[#0f0f14]">Buy custom token…</option>
										</select>
									</div>
									{(swapForm.sell === '__custom' || swapForm.buy === '__custom') && (
										<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
											{swapForm.sell === '__custom' && (
												<input className={input} value={swapCustom.sell} onChange={e => setSwapCustom({ ...swapCustom, sell: e.target.value })} placeholder="Sell token contract (0x…)" />
											)}
											{swapForm.buy === '__custom' && (
												<input className={input} value={swapCustom.buy} onChange={e => setSwapCustom({ ...swapCustom, buy: e.target.value })} placeholder="Buy token contract (0x…)" />
											)}
										</div>
									)}
									<p className="-mt-1 text-[11px] text-[#6a665a]">Any ERC-20 works — paste its contract address. Always verify the address on Etherscan/Basescan first.</p>
									<div className="flex flex-col gap-2 min-[420px]:flex-row">
										<input className={input} type="number" min="0" value={swapForm.sellAmount} onChange={e => setSwapForm({ ...swapForm, sellAmount: e.target.value })} placeholder="Amount to sell" />
										<GoldButton disabled={busy} onClick={doQuote}>Get quote</GoldButton>
									</div>
									{quote && (
										<div className="rounded-xl border border-[#d4af37]/15 bg-black/30 p-3 text-sm">
											<div className="font-mono text-[#f0ecdd]">≈ {quote.buyAmount} {quote.buy}</div>
											<div className="mt-1 text-xs text-[#8a8577]">Est. gas {quote.estimatedGas || '—'} · {web3 ? 'Sign below — keys never leave your wallet.' : 'Connect a wallet to sign in-app, or record a manual signature below.'}</div>
											{web3 ? (
												<div className="mt-2 flex flex-wrap gap-2">
													{needsApproval() && (
														<GhostButton disabled={signing === 'approving' || web3.chainId !== swapForm.chainId} onClick={doApprove} className="!px-3 !py-2 !text-xs">
															{signing === 'approving' ? 'Approving…' : `Approve ${quote.sell}`}
														</GhostButton>
													)}
													<GoldButton disabled={signing === 'swapping' || needsApproval() || web3.chainId !== swapForm.chainId} onClick={doSwapInApp} className="!px-3 !py-2 !text-xs">
														{signing === 'swapping' ? 'Swapping…' : `Swap in ${CHAIN_META[swapForm.chainId]?.name || 'wallet'}`}
													</GoldButton>
												</div>
											) : (
												<div className="mt-2 flex flex-wrap gap-2">
													<GhostButton disabled={busy} onClick={doIntent} className="!px-3 !py-2 !text-xs">I've signed externally — record it</GhostButton>
												</div>
											)}
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

				<Note icon={ShieldCheck}>
					Cash ledger: every deposit, payout, challenge fee and reward is recorded here — balance is the sum of non-failed rows. Crypto tracking and swaps are non-custodial: your keys never touch our servers.
				</Note>
				<div className="flex items-center gap-2 text-xs text-[#8a8577]"><ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" /> Operated by TradingBible LLC. Deposits via Stripe · bank payouts via Stripe Connect (ID-verified) · crypto is non-custodial.</div>
			</div>
		</AppLayout>
	);
}
