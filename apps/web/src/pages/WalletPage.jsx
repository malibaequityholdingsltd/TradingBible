import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowDownRight,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleDollarSign,
  Coins,
  CreditCard,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  HelpCircle,
  Info,
  KeyRound,
  Landmark,
  LayoutDashboard,
  Loader2,
  Lock,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  Wallet,
} from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import CardPreview from '@/components/CardPreview';
import TbcCard from '@/components/TbcCard';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useWallet, NETWORK_LIST } from '@/hooks/useWallet';
import { fmtMoney } from '@/lib/mockData';
import { TBC_LOGO_URL } from '@/lib/tbc';
import { useI18n } from '@/lib/i18n';
import { API_SERVER_URL } from '@/lib/apiServerClient';
import pb from '@/lib/pocketbaseClient';
import { txt, numOrNull } from '@/lib/safeRender';

const EXPLORER = {
  bitcoin: (a) => `https://mempool.space/address/${a}`,
  ethereum: (a) => `https://etherscan.io/address/${a}`,
  'usdc-ethereum': (a) => `https://etherscan.io/address/${a}`,
  'usdt-ethereum': (a) => `https://etherscan.io/address/${a}`,
  'usdc-base': (a) => `https://basescan.org/address/${a}`,
  'usdc-polygon': (a) => `https://polygonscan.com/address/${a}`,
  solana: (a) => `https://solscan.io/account/${a}`,
};

const ACTIVITY_FILTERS = [
  { id: 'all', label: 'All', types: null },
  { id: 'deposits', label: 'Deposits', types: ['deposit'] },
  { id: 'withdrawals', label: 'Withdrawals', types: ['withdraw', 'withdraw_crypto'] },
  { id: 'transfers', label: 'Transfers', types: ['transfer_out', 'transfer_in'] },
  { id: 'credits', label: 'Credits & fees', types: ['reward', 'payout', 'affiliate_payout', 'pay', 'fee'] },
];

const TX_LABELS = {
  deposit: 'Deposit',
  withdraw: 'Bank withdrawal',
  withdraw_crypto: 'Crypto withdrawal',
  pay: 'Account payment',
  reward: 'Reward',
  payout: 'Payout',
  affiliate_payout: 'Affiliate credit',
  transfer_out: 'Sent',
  transfer_in: 'Received',
  fee: 'Platform fee',
};

function shortAddr(value) {
  const str = txt(value, '');
  if (!str) return '';
  return str.length > 20 ? `${str.slice(0, 12)}…${str.slice(-8)}` : str;
}

function titleCase(value) {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function txLabel(type) {
  return TX_LABELS[txt(type, '')] || titleCase(type) || 'Ledger entry';
}

function statusLabel(status) {
  const value = txt(status, 'completed').toLowerCase();
  if (value === 'completed' || value === 'paid' || value === 'settled') return 'Completed';
  if (value === 'failed' || value === 'cancelled' || value === 'canceled') return 'Failed';
  if (value === 'pending' || value === 'processing') return 'Pending';
  return titleCase(value);
}

function statusTone(status) {
  const value = txt(status, 'completed').toLowerCase();
  if (value === 'failed' || value === 'cancelled' || value === 'canceled') return 'red';
  if (value === 'pending' || value === 'processing') return 'amber';
  return 'green';
}

function formatDate(value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatAmount(value, asset = 'USD', { sign = false } = {}) {
  const n = Number(value) || 0;
  const prefix = sign ? (n > 0 ? '+' : '') : '';
  // TBC is the official in-app currency. Render its ledger balance with the
  // ticker so it is never mistaken for a USD amount.
  if (asset === 'TBC') {
    return `${prefix}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TBC`;
  }
  return `${prefix}${fmtMoney(n)}`;
}

function formatTokenAmount(value) {
  return Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 6 });
}

function networkLabel(id, list) {
  return list.find((n) => n.id === id)?.label || titleCase(String(id || '').replace(/-/g, ' '));
}

function HoldingRow({ children, className = '' }) {
  return <div className={`wv-holding ${className}`}>{children}</div>;
}

export default function WalletPage() {
  const wallet = useWallet();
  const { user, isAuthReady } = useAuth();
  const {
    wallets, totalUsd, ledger, loading, syncing, reload, addWallet, removeWallet,
    deposit, withdraw, rails, loadRails, onboardConnect, refreshConnectStatus,
    startKyc, refreshKycStatus, onrampOrder, transfer, getAccounts,
    getStatement, downloadStatement,
  } = wallet;
  const { toast } = useToast();
  const { t } = useI18n();
  const trackNetworks = NETWORK_LIST;

  const [bankTab, setBankTab] = useState('accounts');
  const [cashMode, setCashMode] = useState('deposit');
  const [hideBalance, setHideBalance] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ network: 'bitcoin', address: '', label: '' });
  const [busy, setBusy] = useState(false);
  const [depAmount, setDepAmount] = useState('50');
  const [withAmount, setWithAmount] = useState('');
  const [railBusy, setRailBusy] = useState('');
  const [needsSetup, setNeedsSetup] = useState(false);
  const [rampForm, setRampForm] = useState({ walletAddress: '', currency: 'USDC', network: 'ethereum', fiatAmount: '100' });
  const [sendForm, setSendForm] = useState({ to: '', asset: 'USD', amount: '', memo: '' });
  const [sendBusy, setSendBusy] = useState(false);
  const [stmtMonth, setStmtMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [statement, setStatement] = useState(null);
  const [stmtBusy, setStmtBusy] = useState(false);
  const [activityFilter, setActivityFilter] = useState('all');
  const [txQuery, setTxQuery] = useState('');
  const [tbcRate, setTbcRate] = useState(0.3077);
  const [cardBusy, setCardBusy] = useState('');

  const walletBalance = Number(ledger?.balances?.USD) || 0;
  const trackedUsd = Number(totalUsd) || 0;
  const tbcAccount = accounts.find((a) => a.asset === 'TBC');
  const tbcBalance = Number(ledger?.balances?.TBC ?? tbcAccount?.balance) || 0;
  const tbcUsd = tbcRate > 0 ? tbcBalance / tbcRate : 0;
  const portfolioUsd = walletBalance + trackedUsd + tbcUsd;
  const cashAccount = accounts.find((a) => a.asset === 'USD') || accounts[0];
  const kycStatus = rails?.kyc?.status || 'none';
  const connectStatus = rails?.connect?.status || 'none';
  const onrampEnabled = Boolean(rails?.providers?.onramp);
  const transactions = ledger?.transactions || [];
  const identityTone = kycStatus === 'verified' ? 'green' : kycStatus === 'pending' ? 'amber' : 'red';
  const identityLabel = kycStatus === 'verified' ? 'Verified' : kycStatus === 'pending' ? 'In review' : 'Not started';
  const payoutTone = connectStatus === 'active' ? 'green' : 'red';
  const payoutLabel = connectStatus === 'active' ? 'Connected' : 'Not connected';

  const allocation = ([
    ['cash', walletBalance, 'var(--at-green)'],
    ['tbc', tbcUsd, 'var(--at-gold)'],
    ['external', trackedUsd, 'var(--at-blue)'],
  ]).map(([key, value, color]) => ({
    key,
    color,
    pct: portfolioUsd > 0 ? Math.max(0, (value / portfolioUsd) * 100) : 0,
  }));

  const filteredTransactions = useMemo(() => {
    const filter = ACTIVITY_FILTERS.find((f) => f.id === activityFilter);
    const q = txQuery.trim().toLowerCase();
    return transactions.filter((tx) => {
      const matchesType = !filter?.types || filter.types.includes(txt(tx.type, ''));
      if (!matchesType) return false;
      if (!q) return true;
      return [tx.type, tx.status, tx.reference, tx.asset, tx.currency, tx.counterparty]
        .some((value) => txt(value, '').toLowerCase().includes(q));
    });
  }, [activityFilter, transactions, txQuery]);

  const recentTransfers = useMemo(
    () => transactions
      .filter((tx) => ['transfer_in', 'transfer_out'].includes(txt(tx.type, '')))
      .slice(0, 4),
    [transactions],
  );

  const BANK_TABS = [
    { id: 'accounts', label: 'Overview', icon: LayoutDashboard },
    { id: 'money', label: 'Cash & banking', icon: Landmark },
    { id: 'send', label: 'Send', icon: Send },
    { id: 'crypto', label: 'Crypto', icon: Coins },
    { id: 'cards', label: 'Cards', icon: CreditCard },
    { id: 'activity', label: 'Activity', icon: ReceiptText },
  ];

  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      if (q.get('connect') === 'return' || q.get('connect') === 'refresh') {
        refreshConnectStatus().then((data) => {
          if (data?.status === 'active') toast({ title: 'Bank account connected' });
        });
      }
      if (q.get('kyc') === 'return') {
        refreshKycStatus().then((data) => {
          if (data?.status === 'verified') toast({ title: 'Identity verified' });
        });
      }
      if (q.get('onramp') === 'return') loadRails();
      if (q.get('connect') || q.get('kyc') || q.get('onramp') || q.get('deposit')) {
        const url = new URL(window.location.href);
        ['connect', 'kyc', 'onramp', 'deposit'].forEach((key) => url.searchParams.delete(key));
        window.history.replaceState({}, '', url.toString());
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isAuthReady) return;
    getAccounts().then(setAccounts).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthReady]);

  useEffect(() => {
    let live = true;
    fetch(`${API_SERVER_URL}/tbc/econ`)
      .then((res) => res.json())
      .then((data) => {
        const rate = Number(data?.tbcPerUsd);
        if (live && rate > 0.15 && rate < 0.6) setTbcRate(rate);
      })
      .catch(() => {});
    return () => { live = false; };
  }, []);

  useEffect(() => {
    try {
      const tab = new URLSearchParams(window.location.search).get('tab');
      if (['accounts', 'send', 'money', 'crypto', 'cards', 'activity'].includes(tab)) setBankTab(tab);
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const open = (event) => {
      const id = event?.detail;
      if (id === 'buy' || id === 'buy-crypto') {
        setBankTab('crypto');
        window.setTimeout(() => document.getElementById('buy-crypto')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 220);
      }
      if (id === 'defi' || id === 'defi-section' || id === 'swap' || id === 'swap-desk') {
        setBankTab('crypto');
        window.setTimeout(() => document.getElementById('defi-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 220);
      }
    };
    window.addEventListener('tb:open-section', open);
    return () => window.removeEventListener('tb:open-section', open);
  }, []);

  const markSetup = (error) => {
    if (error?.message === 'setup_required' || String(error?.message || '').includes('APPLY_MISSING_TABLES')) {
      setNeedsSetup(true);
      return true;
    }
    return false;
  };

  const openCash = (mode) => {
    setCashMode(mode);
    setBankTab('money');
    window.setTimeout(() => document.getElementById('cash-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
  };

  const openSend = () => {
    setBankTab('send');
    window.setTimeout(() => document.getElementById('transfer-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!form.address.trim()) return;
    setBusy(true);
    try {
      await addWallet(form);
      setForm({ network: form.network, address: '', label: '' });
      setAdding(false);
      toast({ title: t('wal.addWallet'), description: t('wal.loadingBal') });
    } catch (error) {
      toast({ variant: 'destructive', title: t('c.error'), description: error?.message || t('c.retry') });
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
    const amount = Number(depAmount);
    if (!amount || amount < 1) {
      toast({ variant: 'destructive', title: t('wal.amountUsd') });
      return;
    }
    setBusy(true);
    try {
      await deposit(amount);
    } catch (error) {
      toast({ variant: 'destructive', title: t('wal.deposit'), description: error.message });
    } finally {
      setBusy(false);
    }
  };

  const needsAddress = !String(user?.address || '').trim();
  const addressGate = () => {
    if (!needsAddress) return false;
    toast({
      variant: 'destructive',
      title: 'Residential address required',
      description: 'Add your residential address in Profile — it is compulsory for withdrawals and identity (KYC) verification.',
    });
    return true;
  };

  const doWithdraw = async () => {
    if (addressGate()) return;
    const amount = Number(withAmount);
    if (!amount) {
      toast({ variant: 'destructive', title: t('wal.amountUsd') });
      return;
    }
    setBusy(true);
    try {
      const data = await withdraw(amount);
      toast({
        title: t('wal.withdraw'),
        description: `$${amount} on its way to your bank (transfer ${shortAddr(data?.transferId || '')})`,
      });
      setWithAmount('');
    } catch (error) {
      if (markSetup(error)) toast({ variant: 'destructive', title: 'Database setup needed', description: 'Run APPLY_MISSING_TABLES.sql once, then retry.' });
      else if (error?.code === 'kyc_required') {
        toast({ variant: 'destructive', title: 'Identity verification required', description: 'Verify your identity to enable withdrawals.' });
      } else if (error?.code === 'account_suspended') {
        toast({ variant: 'destructive', title: 'Account suspended', description: 'Flagged during the payout identity review. Contact live support.' });
        window.setTimeout(() => window.location.reload(), 1200);
      } else if (error?.code === 'connect_required') {
        toast({ variant: 'destructive', title: 'Bank account required', description: 'Connect your bank account to withdraw.' });
      } else {
        toast({ variant: 'destructive', title: t('wal.withdraw'), description: error.message });
      }
    } finally {
      setBusy(false);
    }
  };

  const doOnboard = async () => {
    setRailBusy('connect');
    try {
      await onboardConnect('US');
    } catch (error) {
      if (markSetup(error)) toast({ variant: 'destructive', title: 'Database setup needed', description: 'Run APPLY_MISSING_TABLES.sql once, then retry.' });
      else toast({ variant: 'destructive', title: 'Bank setup', description: error.message });
    } finally {
      setRailBusy('');
    }
  };

  const doKyc = async () => {
    if (addressGate()) return;
    setRailBusy('kyc');
    try {
      await startKyc();
    } catch (error) {
      if (markSetup(error)) toast({ variant: 'destructive', title: 'Database setup needed', description: 'Run APPLY_MISSING_TABLES.sql once, then retry.' });
      else toast({ variant: 'destructive', title: 'Identity verification', description: error.message });
    } finally {
      setRailBusy('');
    }
  };

  const requestCard = async (type) => {
    if (!pb.authStore.token) {
      toast({ variant: 'destructive', title: 'Sign in required', description: 'Sign in to register interest in a card.' });
      return;
    }
    setCardBusy(type);
    try {
      const res = await fetch(`${API_SERVER_URL}/tbc/support`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${pb.authStore.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: `card-${type}`,
          message: `Please register my interest in a ${type} TradingBible card. I understand no card is issued until identity verification and the card programme are approved.`,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not register interest');
      toast({
        title: 'Card interest registered',
        description: `Your ${type} card request is in the support queue. No card has been issued yet.`,
      });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Card request failed', description: error.message });
    } finally {
      setCardBusy('');
    }
  };

  const doOnramp = async () => {
    if (!rampForm.walletAddress.trim()) {
      toast({ variant: 'destructive', title: 'Your wallet address is required' });
      return;
    }
    setBusy(true);
    try {
      await onrampOrder({ ...rampForm, fiatAmount: Number(rampForm.fiatAmount) || undefined });
      toast({ title: 'Opening secure checkout', description: 'Complete the purchase with Transak — crypto lands in your wallet.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Card-to-crypto', description: error.message });
    } finally {
      setBusy(false);
    }
  };

  const doSend = async (event) => {
    event?.preventDefault?.();
    if (!sendForm.to.trim()) {
      toast({ variant: 'destructive', title: t('wal.recipientRequired'), description: t('wal.recipientHint') });
      return;
    }
    const amount = Number(sendForm.amount);
    if (!amount || amount < 1) {
      toast({ variant: 'destructive', title: t('wal.sendAmount'), description: t('wal.minSend') });
      return;
    }
    setSendBusy(true);
    try {
      const data = await transfer({
        to: sendForm.to.trim(),
        asset: sendForm.asset,
        amount,
        memo: sendForm.memo.trim(),
        idempotencyKey: `${user?.id || 'u'}_${Date.now()}_${amount}`,
      });
      const who = data?.to?.username || data?.to?.email || sendForm.to.trim();
      toast({ title: data?.replay ? t('wal.noDouble') : t('wal.sentTo', { n: amount, asset: sendForm.asset, who }) });
      setSendForm({ to: '', asset: sendForm.asset, amount: '', memo: '' });
      getAccounts().then(setAccounts).catch(() => {});
    } catch (error) {
      if (error?.code === 'kyc_required') {
        toast({ variant: 'destructive', title: t('wal.kycSendTitle'), description: t('wal.kycSendSub') });
      } else if (error?.code === 'recipient_not_found') {
        toast({ variant: 'destructive', title: t('wal.noRecipient'), description: t('wal.noRecipientSub') });
      } else {
        toast({ variant: 'destructive', title: t('wal.sendFail'), description: error?.message || 'Try again.' });
      }
    } finally {
      setSendBusy(false);
    }
  };

  const loadStatement = async () => {
    if (!/^\d{4}-\d{2}$/.test(stmtMonth)) return;
    setStmtBusy(true);
    try {
      setStatement(await getStatement(stmtMonth));
    } catch (error) {
      toast({ variant: 'destructive', title: 'Statement failed', description: error?.message || 'Try again.' });
    } finally {
      setStmtBusy(false);
    }
  };

  const saveStatementCsv = async () => {
    if (!/^\d{4}-\d{2}$/.test(stmtMonth)) return;
    setStmtBusy(true);
    try {
      await downloadStatement(stmtMonth);
    } catch {
      toast({ variant: 'destructive', title: 'Download failed' });
    } finally {
      setStmtBusy(false);
    }
  };

  const maxSend = () => {
    setSendForm({ ...sendForm, amount: String(Math.floor(walletBalance * 100) / 100) });
  };

  const limitWith = () => setWithAmount(String(Math.floor(walletBalance * 100) / 100));

  const sendAvailable = `${fmtMoney(walletBalance)} available`;
  const statusText = syncing
    ? 'Refreshing balances…'
    : loading
      ? 'Loading balances…'
      : 'Balances up to date';

  return (
    <AppLayout title={t('nav.wallet')}>
      <div className="at-page at-scope at-enter wv-page">
        <div className="wv-shell">
          <div className="wv-toolbar">
            <div className="wv-toolbar-state">
              <span className={`wv-status-dot ${syncing || loading ? 'is-busy' : ''}`} aria-hidden />
              <span>{statusText}</span>
              <span className="wv-fine">·</span>
              <span>{txt(user?.email, 'Personal account')}</span>
            </div>
            <div className="wv-toolbar-actions">
              <button type="button" className="wv-icon-btn" onClick={reload} disabled={syncing || loading} aria-label="Refresh balances">
                <RefreshCw className={syncing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} strokeWidth={1.8} />
              </button>
              <Link to="/contact" className="wv-icon-btn" aria-label="Contact support">
                <HelpCircle className="h-4 w-4" strokeWidth={1.8} />
              </Link>
            </div>
          </div>

          <nav className="wv-tabs" aria-label="Wallet sections">
            {BANK_TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                className={`wv-tab ${bankTab === id ? 'is-active' : ''}`}
                aria-current={bankTab === id ? 'page' : undefined}
                onClick={() => setBankTab(id)}
              >
                <Icon strokeWidth={1.8} />
                <span>{label}</span>
              </button>
            ))}
          </nav>

          {needsSetup && (
            <div className="wv-alert">
              <AlertTriangle />
              <div>
                <strong>One-time database setup needed.</strong> Bank and identity features need their tables. Run{' '}
                <span className="wv-mono">APPLY_MISSING_TABLES.sql</span> from the project root, then reload.
              </div>
            </div>
          )}

          {bankTab === 'accounts' && (
            <>
              <section className="wv-portfolio" aria-labelledby="wallet-portfolio-value">
                <div>
                  <div className="wv-balance-label-row">
                    <span className="wv-label">Estimated total value</span>
                    <button type="button" className="wv-reveal" onClick={() => setHideBalance((v) => !v)} aria-label={hideBalance ? 'Show balance' : 'Hide balance'}>
                      {hideBalance ? <EyeOff /> : <Eye />}
                    </button>
                  </div>
                  <div id="wallet-portfolio-value" className="wv-balance-value">
                    {hideBalance ? '••••••' : fmtMoney(portfolioUsd)}
                  </div>
                  <div className="wv-balance-breakdown">
                    <span><strong>{hideBalance ? '••' : fmtMoney(walletBalance)}</strong> cash</span>
                    <span><strong>{hideBalance ? '••' : fmtMoney(tbcUsd)}</strong> TBC</span>
                    <span><strong>{hideBalance ? '••' : fmtMoney(trackedUsd)}</strong> external wallets</span>
                  </div>
                  <div className="wv-allocation">
                    <div className="wv-allocation-bar" aria-hidden>
                      {allocation.map((part) => (
                        <span key={part.key} className={`wv-alloc-${part.key}`} style={{ width: `${part.pct}%`, background: part.color }} />
                      ))}
                    </div>
                    <div className="wv-allocation-legend">
                      <span><i className="wv-dot wv-dot--cash" />Cash {Math.round(allocation[0].pct)}%</span>
                      <span><i className="wv-dot wv-dot--tbc" />TBC {Math.round(allocation[1].pct)}%</span>
                      <span><i className="wv-dot wv-dot--external" />External {Math.round(allocation[2].pct)}%</span>
                    </div>
                  </div>
                  <p className="wv-fine" style={{ marginTop: 10 }}>External wallet balances are read-only and never move funds.</p>
                </div>
                <div className="wv-quick-actions" aria-label="Quick actions">
                  <button type="button" className="wv-action" onClick={() => openCash('deposit')}>
                    <span className="wv-action-icon"><ArrowDownLeft /></span>
                    <span>Deposit</span>
                  </button>
                  <button type="button" className="wv-action" onClick={() => openCash('withdraw')}>
                    <span className="wv-action-icon"><ArrowUpRight /></span>
                    <span>Withdraw</span>
                  </button>
                  <button type="button" className="wv-action" onClick={openSend}>
                    <span className="wv-action-icon"><Send /></span>
                    <span>Send</span>
                  </button>
                  <button type="button" className="wv-action" onClick={() => setBankTab('crypto')}>
                    <span className="wv-action-icon"><Coins /></span>
                    <span>TBC &amp; crypto</span>
                  </button>
                </div>
              </section>

              <div className="wv-overview-grid">
                <div className="wv-main-stack">
                  <section className="wv-card" aria-labelledby="wallet-holdings-title">
                    <div className="wv-card-head">
                      <div>
                        <h2 id="wallet-holdings-title" className="wv-section-title">Holdings</h2>
                        <p className="wv-section-sub">Cash and connected wallets</p>
                      </div>
                      <button type="button" className="wv-link" onClick={() => setBankTab('activity')}>
                        View activity <ArrowRight />
                      </button>
                    </div>
                    <div className="wv-holdings">
                      <HoldingRow className="wv-holding--head">
                        <div>Asset</div>
                        <div>Network</div>
                        <div className="wv-balance-cell">Balance</div>
                        <div className="wv-value-cell">Value</div>
                        <div />
                      </HoldingRow>

                      <HoldingRow>
                        <div className="wv-asset-cell">
                          <span className="wv-asset-icon wv-asset-icon--usd"><CircleDollarSign /></span>
                          <span>
                            <span className="wv-asset-name">US Dollar</span>
                            <span className="wv-asset-sub">
                              Cash account{cashAccount?.last4 ? ` ···· ${cashAccount.last4}` : ''}
                            </span>
                          </span>
                        </div>
                        <div className="wv-network-cell">TradingBible ledger</div>
                        <div className="wv-balance-cell">{hideBalance ? '••••' : fmtMoney(walletBalance)}</div>
                        <div className="wv-value-cell">{hideBalance ? '••••' : fmtMoney(walletBalance)}</div>
                        <div className="wv-row-action">
                          <button type="button" className="wv-btn wv-btn--secondary wv-btn--sm" onClick={() => openCash('deposit')}>Deposit</button>
                        </div>
                      </HoldingRow>

                      <HoldingRow>
                        <div className="wv-asset-cell">
                          <span className="wv-asset-icon wv-asset-icon--tbc">
                            <img src={TBC_LOGO_URL} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                          </span>
                          <span>
                            <span className="wv-asset-name">TBC</span>
                            <span className="wv-asset-sub">
                              Official in-app currency{tbcAccount?.last4 ? ` ···· ${tbcAccount.last4}` : ''}
                            </span>
                          </span>
                        </div>
                        <div className="wv-network-cell">TradingBible TBC ledger</div>
                        <div className="wv-balance-cell">{hideBalance ? '••••' : formatAmount(tbcBalance, 'TBC')}</div>
                        <div className="wv-value-cell">{hideBalance ? '••••' : fmtMoney(tbcUsd)}</div>
                        <div className="wv-row-action">
                          <button type="button" className="wv-btn wv-btn--secondary wv-btn--sm" onClick={() => setBankTab('crypto')}>Convert</button>
                        </div>
                      </HoldingRow>

                      {wallets.slice(0, 3).map((item) => (
                        <HoldingRow key={item.id}>
                          <div className="wv-asset-cell">
                            <span className="wv-asset-icon wv-asset-icon--external"><Coins /></span>
                            <span>
                              <span className="wv-asset-name">{txt(item.currency, 'Token')}</span>
                              <span className="wv-asset-sub">{txt(item.label, networkLabel(item.network, trackNetworks))}</span>
                            </span>
                          </div>
                          <div className="wv-network-cell">{networkLabel(item.network, trackNetworks)}</div>
                          <div className="wv-balance-cell">{item.ok ? `${formatTokenAmount(item.amount)} ${txt(item.currency, '')}` : 'Unavailable'}</div>
                          <div className="wv-value-cell">{item.ok ? fmtMoney(item.usdValue || 0) : '—'}</div>
                          <div className="wv-row-action">
                            {EXPLORER[item.network] ? (
                              <a className="wv-icon-btn" href={EXPLORER[item.network](item.address)} target="_blank" rel="noreferrer" aria-label="Open in explorer">
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            ) : null}
                          </div>
                        </HoldingRow>
                      ))}
                    </div>
                    <div className="wv-card-foot">
                      <span>{wallets.length ? `${wallets.length} external wallet${wallets.length === 1 ? '' : 's'} tracked read-only` : 'No external wallets connected'}</span>
                      <button type="button" className="wv-link" onClick={() => { setBankTab('crypto'); setAdding(true); }}>
                        {wallets.length ? 'Manage wallets' : 'Add a wallet'} <ArrowRight />
                      </button>
                    </div>
                  </section>

                  <TbcCard onChanged={reload} />

                  <section className="wv-card" aria-labelledby="wallet-recent-title">
                    <div className="wv-card-head">
                      <div>
                        <h2 id="wallet-recent-title" className="wv-section-title">Recent activity</h2>
                        <p className="wv-section-sub">The last five ledger entries</p>
                      </div>
                      <button type="button" className="wv-link" onClick={() => setBankTab('activity')}>
                        All activity <ArrowRight />
                      </button>
                    </div>
                    {transactions.length === 0 ? (
                      <div className="wv-empty">
                        <ReceiptText />
                        <strong>No wallet activity yet</strong>
                        <span>Your first deposit, withdrawal or transfer will appear here.</span>
                      </div>
                    ) : (
                      <div className="wv-activity-list">
                        {transactions.slice(0, 5).map((tx) => {
                          const amount = numOrNull(tx.amount) ?? 0;
                          const isIn = amount >= 0;
                          return (
                            <div key={tx.id} className="wv-activity-mini">
                              <span className={`wv-tx-icon ${isIn ? 'wv-tx-icon--in' : 'wv-tx-icon--out'}`}>
                                {isIn ? <ArrowDownLeft /> : <ArrowUpRight />}
                              </span>
                              <div className="wv-activity-mini-main">
                                <div className="wv-activity-mini-title">{txLabel(tx.type)}</div>
                                <div className="wv-activity-mini-date">{formatDate(tx.created)} · {statusLabel(tx.status)}</div>
                              </div>
                              <div className={`wv-activity-mini-amount ${isIn ? 'is-in' : 'is-out'}`}>
                                {formatAmount(amount, txt(tx.asset, 'USD'), { sign: true })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>
                </div>

                <aside className="wv-side-stack">
                  <section className="wv-card" aria-labelledby="wallet-status-title">
                    <div className="wv-card-head">
                      <div>
                        <h2 id="wallet-status-title" className="wv-section-title">Account status</h2>
                        <p className="wv-section-sub">Payout readiness and connected wallets</p>
                      </div>
                    </div>
                    <div className="wv-card-body">
                      <div className="wv-stat-row">
                        <span className="wv-stat-label">Identity verification</span>
                        <span className={`wv-chip wv-chip--${identityTone}`}>{identityLabel}</span>
                      </div>
                      <div className="wv-stat-row">
                        <span className="wv-stat-label">Bank payouts</span>
                        <span className={`wv-chip wv-chip--${payoutTone}`}>{payoutLabel}</span>
                      </div>
                      <div className="wv-stat-row">
                        <span className="wv-stat-label">External wallets</span>
                        <span className="wv-stat-value">{wallets.length || 'None'}</span>
                      </div>
                      {kycStatus === 'none' && (
                        <button type="button" className="wv-btn wv-btn--secondary wv-btn--block" style={{ marginTop: 12 }} disabled={railBusy === 'kyc'} onClick={doKyc}>
                          {railBusy === 'kyc' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                          Verify identity
                        </button>
                      )}
                      {kycStatus === 'verified' && connectStatus !== 'active' && (
                        <button type="button" className="wv-btn wv-btn--secondary wv-btn--block" style={{ marginTop: 12 }} disabled={railBusy === 'connect'} onClick={doOnboard}>
                          {railBusy === 'connect' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Landmark className="h-4 w-4" />}
                          Connect bank account
                        </button>
                      )}
                      {kycStatus === 'verified' && connectStatus === 'active' && (
                        <button type="button" className="wv-btn wv-btn--secondary wv-btn--block" style={{ marginTop: 12 }} onClick={() => openCash('withdraw')}>
                          <ArrowUpRight className="h-4 w-4" /> Withdraw cash
                        </button>
                      )}
                      {kycStatus === 'pending' && <p className="wv-fine" style={{ marginTop: 10 }}>Your identity review is in progress. We will unlock payouts as soon as it is approved.</p>}
                    </div>
                  </section>

                  <section className="wv-card" aria-labelledby="wallet-cards-title">
                    <div className="wv-card-head">
                      <div>
                        <h2 id="wallet-cards-title" className="wv-section-title">Cards</h2>
                        <p className="wv-section-sub">Virtual and physical</p>
                      </div>
                      <CreditCard className="h-4 w-4" style={{ color: 'var(--at-gold)' }} />
                    </div>
                    <div className="wv-card-body">
                      <div className="wv-card-mini-grid">
                        <button type="button" className="wv-card-mini" onClick={() => setBankTab('cards')}>
                          <span className="wv-card-mini-icon"><CreditCard /></span>
                          <span><strong>Virtual</strong><small>Not issued</small></span>
                        </button>
                        <button type="button" className="wv-card-mini" onClick={() => setBankTab('cards')}>
                          <span className="wv-card-mini-icon"><Wallet /></span>
                          <span><strong>Physical</strong><small>Not issued</small></span>
                        </button>
                      </div>
                      <p className="wv-fine" style={{ marginTop: 10 }}>Cards require an approved card programme and identity verification. No card number or balance is shown until a card is actually issued.</p>
                      <button type="button" className="wv-link" style={{ marginTop: 10 }} onClick={() => setBankTab('cards')}>
                        Open cards <ArrowRight />
                      </button>
                    </div>
                  </section>

                  <section className="wv-card">
                    <div className="wv-card-head">
                      <div>
                        <h2 className="wv-section-title">Ledger</h2>
                        <p className="wv-section-sub">Every balance has a matching entry</p>
                      </div>
                    </div>
                    <div className="wv-card-body">
                      <div className="wv-stat-row">
                        <span className="wv-stat-label">Ledger entries</span>
                        <span className="wv-stat-value">{transactions.length}</span>
                      </div>
                      <div className="wv-stat-row">
                        <span className="wv-stat-label">Cash available</span>
                        <span className="wv-stat-value">{hideBalance ? '••••' : fmtMoney(walletBalance)}</span>
                      </div>
                      <div className="wv-stat-row">
                        <span className="wv-stat-label">TBC available</span>
                        <span className="wv-stat-value">{hideBalance ? '••••' : formatAmount(tbcBalance, 'TBC')}</span>
                      </div>
                      <button type="button" className="wv-btn wv-btn--ghost wv-btn--block" style={{ marginTop: 9 }} onClick={() => setBankTab('activity')}>
                        Open ledger <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </section>
                </aside>
              </div>
            </>
          )}

          {bankTab === 'money' && (
            <>
              <div className="wv-page-head">
                <div>
                  <h2 className="wv-page-heading">Cash &amp; banking</h2>
                  <p className="wv-page-sub">Fund your USD balance by card, withdraw to a verified bank account, and keep payout readiness current.</p>
                </div>
                <span className={`wv-chip wv-chip--${connectStatus === 'active' ? 'green' : 'amber'}`}>
                  {connectStatus === 'active' ? 'Payouts ready' : 'Withdrawals locked'}
                </span>
              </div>

              <div className="wv-two-col">
                <section className="wv-card" id="cash-panel" aria-labelledby="cash-panel-title">
                  <div className="wv-card-head">
                    <div className="wv-segmented" role="tablist" aria-label="Cash action">
                      <button type="button" role="tab" aria-selected={cashMode === 'deposit'} className={cashMode === 'deposit' ? 'is-active' : ''} onClick={() => setCashMode('deposit')}>Deposit</button>
                      <button type="button" role="tab" aria-selected={cashMode === 'withdraw'} className={cashMode === 'withdraw' ? 'is-active' : ''} onClick={() => setCashMode('withdraw')}>Withdraw</button>
                    </div>
                    <span className="wv-chip wv-chip--green"><ShieldCheck /> Stripe secured</span>
                  </div>
                  <div className="wv-card-body">
                    {cashMode === 'deposit' ? (
                      <div className="wv-form-stack">
                        <div>
                          <h3 id="cash-panel-title" className="wv-section-title">Add cash to your USD balance</h3>
                          <p className="wv-section-sub">Card payments are processed by Stripe. Funds are credited only after the payment is confirmed.</p>
                        </div>
                        <div className="wv-field-group">
                          <label className="wv-field-label" htmlFor="deposit-amount">Amount (USD)</label>
                          <div className="wv-amount-wrap">
                            <span className="wv-amount-prefix">$</span>
                            <input
                              id="deposit-amount"
                              className="wv-field wv-field--amount"
                              type="number"
                              min="1"
                              inputMode="decimal"
                              value={depAmount}
                              onChange={(e) => setDepAmount(e.target.value)}
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                        <div className="wv-presets">
                          {[50, 100, 250, 500].map((value) => (
                            <button key={value} type="button" className="wv-preset" onClick={() => setDepAmount(String(value))}>{fmtMoney(value)}</button>
                          ))}
                        </div>
                        <p className="wv-field-help">No platform fee. Your bank or card issuer may apply its own charges.</p>
                        <button type="button" className="wv-btn wv-btn--primary wv-btn--block" disabled={busy || !(Number(depAmount) > 0)} onClick={doDeposit}>
                          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                          Continue to secure checkout
                        </button>
                      </div>
                    ) : (
                      <div className="wv-form-stack">
                        <div>
                          <h3 className="wv-section-title">Withdraw to your bank</h3>
                          <p className="wv-section-sub">Bank withdrawals require a verified identity and a connected payout account.</p>
                        </div>
                        <div className="wv-steps">
                          <div className={`wv-step ${kycStatus === 'verified' ? 'is-done' : 'is-active'}`}>
                            <span className="wv-step-dot">{kycStatus === 'verified' ? <Check /> : '1'}</span>
                            <div className="wv-step-main">
                              <div className="wv-step-title">Identity verification</div>
                              <div className="wv-step-sub">{kycStatus === 'verified' ? 'Verified' : kycStatus === 'pending' ? 'Review in progress' : 'Required before any payout'}</div>
                            </div>
                            {kycStatus === 'none' && (
                              <button type="button" className="wv-btn wv-btn--secondary wv-btn--sm" disabled={railBusy === 'kyc'} onClick={doKyc}>
                                {railBusy === 'kyc' ? '…' : 'Verify'}
                              </button>
                            )}
                          </div>
                          <div className={`wv-step ${connectStatus === 'active' ? 'is-done' : kycStatus === 'verified' ? 'is-active' : ''}`}>
                            <span className="wv-step-dot">{connectStatus === 'active' ? <Check /> : '2'}</span>
                            <div className="wv-step-main">
                              <div className="wv-step-title">Bank payout account</div>
                              <div className="wv-step-sub">{connectStatus === 'active' ? 'Connected and ready' : kycStatus === 'verified' ? 'Connect a bank account' : 'Unlocks after identity verification'}</div>
                            </div>
                            {kycStatus === 'verified' && connectStatus !== 'active' && (
                              <button type="button" className="wv-btn wv-btn--secondary wv-btn--sm" disabled={railBusy === 'connect'} onClick={doOnboard}>
                                {railBusy === 'connect' ? '…' : 'Connect'}
                              </button>
                            )}
                          </div>
                          <div className={`wv-step ${connectStatus === 'active' ? 'is-active' : ''}`}>
                            <span className="wv-step-dot">3</span>
                            <div className="wv-step-main">
                              <div className="wv-step-title">Withdraw cash</div>
                              <div className="wv-step-sub">Available balance {fmtMoney(walletBalance)} · 2–5 business days</div>
                            </div>
                          </div>
                        </div>
                        {connectStatus === 'active' && (
                          <>
                            <div className="wv-field-group">
                              <label className="wv-field-label" htmlFor="withdraw-amount">Amount (USD)</label>
                              <div className="wv-amount-wrap">
                                <span className="wv-amount-prefix">$</span>
                                <input
                                  id="withdraw-amount"
                                  className="wv-field wv-field--amount"
                                  type="number"
                                  min="1"
                                  inputMode="decimal"
                                  value={withAmount}
                                  onChange={(e) => setWithAmount(e.target.value)}
                                  placeholder="0.00"
                                />
                                <button type="button" className="wv-field-action" onClick={limitWith}>Max</button>
                              </div>
                            </div>
                            <button type="button" className="wv-btn wv-btn--primary wv-btn--block" disabled={busy || !(Number(withAmount) > 0)} onClick={doWithdraw}>
                              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4" />}
                              Withdraw to bank
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </section>

                <aside className="wv-side-stack">
                  <section className="wv-card">
                    <div className="wv-card-head">
                      <div>
                        <h2 className="wv-section-title">Balances</h2>
                        <p className="wv-section-sub">Internal ledger balances</p>
                      </div>
                    </div>
                    <div className="wv-card-body">
                      <div className="wv-stat-row">
                        <span className="wv-stat-label">Cash balance</span>
                        <span className="wv-stat-value">{fmtMoney(walletBalance)}</span>
                      </div>
                      <div className="wv-stat-row">
                        <span className="wv-stat-label">Cash account</span>
                        <span className="wv-stat-value">{cashAccount?.last4 ? `···· ${cashAccount.last4}` : 'Issued on activity'}</span>
                      </div>
                      <p className="wv-fine" style={{ marginTop: 10 }}>Plans are paid from cash or card.</p>
                    </div>
                  </section>

                  <section className="wv-card">
                    <div className="wv-card-head">
                      <div>
                        <h2 className="wv-section-title">Banking readiness</h2>
                        <p className="wv-section-sub">Two checks before cash can leave</p>
                      </div>
                    </div>
                    <div className="wv-card-body">
                      <div className="wv-stat-row">
                        <span className="wv-stat-label">Identity</span>
                        <span className={`wv-chip wv-chip--${identityTone}`}>{identityLabel}</span>
                      </div>
                      <div className="wv-stat-row">
                        <span className="wv-stat-label">Payout account</span>
                        <span className={`wv-chip wv-chip--${payoutTone}`}>{payoutLabel}</span>
                      </div>
                      <p className="wv-fine" style={{ marginTop: 10 }}>Payouts are sent through Stripe Connect to the verified bank account on file. TradingBible does not custody crypto.</p>
                    </div>
                  </section>
                </aside>
              </div>
            </>
          )}

          {bankTab === 'send' && (
            <>
              <div className="wv-page-head">
                <div>
                  <h2 className="wv-page-heading">Send funds</h2>
                  <p className="wv-page-sub">Transfer cash to another TradingBible member. Transfers settle instantly inside the ledger.</p>
                </div>
                <span className="wv-chip wv-chip--green"><Check /> Instant settlement</span>
              </div>

              <div className="wv-two-col">
                <section className="wv-card" id="transfer-panel" aria-labelledby="transfer-title">
                  <div className="wv-card-head">
                    <div>
                      <h2 id="transfer-title" className="wv-section-title">New transfer</h2>
                      <p className="wv-section-sub">Send to a verified member by email or username</p>
                    </div>
                    <span className="wv-chip">No platform fee</span>
                  </div>
                  <form className="wv-card-body wv-form-stack" onSubmit={doSend}>
                    <div className="wv-field-group">
                      <label className="wv-field-label" htmlFor="send-to">Recipient</label>
                      <input
                        id="send-to"
                        className="wv-field"
                        value={sendForm.to}
                        onChange={(e) => setSendForm({ ...sendForm, to: e.target.value })}
                        placeholder="Email or username"
                        autoComplete="off"
                      />
                    </div>
                    <div className="wv-form-grid">
                      <div className="wv-field-group">
                        <label className="wv-field-label" htmlFor="send-asset">Asset</label>
                        <input id="send-asset" className="wv-field" value="USD cash" readOnly aria-label="Asset" />
                      </div>
                      <div className="wv-field-group">
                        <label className="wv-field-label" htmlFor="send-amount">Amount</label>
                        <div className="wv-amount-wrap">
                          <input
                            id="send-amount"
                            className="wv-field wv-field--amount"
                            type="number"
                            min="1"
                            step="any"
                            inputMode="decimal"
                            value={sendForm.amount}
                            onChange={(e) => setSendForm({ ...sendForm, amount: e.target.value })}
                            placeholder="0.00"
                          />
                          <button type="button" className="wv-field-action" onClick={maxSend}>Max</button>
                        </div>
                      </div>
                    </div>
                    <div className="wv-field-group">
                      <label className="wv-field-label" htmlFor="send-memo">Note <span style={{ textTransform: 'none', fontWeight: 400 }}>(optional)</span></label>
                      <input
                        id="send-memo"
                        className="wv-field"
                        value={sendForm.memo}
                        onChange={(e) => setSendForm({ ...sendForm, memo: e.target.value })}
                        placeholder="What is this for?"
                        maxLength={120}
                        autoComplete="off"
                      />
                    </div>
                    <div className="wv-summary">
                      <div className="wv-summary-row"><span>Available</span><strong>{sendAvailable}</strong></div>
                      <div className="wv-summary-row"><span>Platform fee</span><strong>$0.00</strong></div>
                      <div className="wv-summary-row"><span>Arrival</span><strong>Instant</strong></div>
                    </div>
                    <p className="wv-fine">Identity verification is required to send funds. Check the recipient details before confirming — ledger transfers are final.</p>
                    <button type="submit" className="wv-btn wv-btn--primary wv-btn--block" disabled={sendBusy}>
                      {sendBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      {sendBusy ? t('wal.sending') : 'Send USD'}
                    </button>
                  </form>
                </section>

                <aside className="wv-side-stack">
                  <section className="wv-card">
                    <div className="wv-card-head">
                      <div>
                        <h2 className="wv-section-title">Transfer details</h2>
                        <p className="wv-section-sub">Limits and settlement</p>
                      </div>
                    </div>
                    <div className="wv-card-body">
                      <div className="wv-stat-row">
                        <span className="wv-stat-label">Minimum</span>
                        <span className="wv-stat-value">1.00</span>
                      </div>
                      <div className="wv-stat-row">
                        <span className="wv-stat-label">Maximum per transfer</span>
                        <span className="wv-stat-value">10,000.00</span>
                      </div>
                      <div className="wv-stat-row">
                        <span className="wv-stat-label">Settlement</span>
                        <span className="wv-stat-value">Instant</span>
                      </div>
                      <div className="wv-stat-row">
                        <span className="wv-stat-label">Platform fee</span>
                        <span className="wv-stat-value">None</span>
                      </div>
                    </div>
                  </section>

                  <section className="wv-card">
                    <div className="wv-card-head">
                      <div>
                        <h2 className="wv-section-title">Recent transfers</h2>
                        <p className="wv-section-sub">Sent and received</p>
                      </div>
                    </div>
                    {recentTransfers.length === 0 ? (
                      <div className="wv-card-body"><p className="wv-fine">No member transfers yet.</p></div>
                    ) : (
                      <div className="wv-activity-list">
                        {recentTransfers.map((tx) => {
                          const amount = numOrNull(tx.amount) ?? 0;
                          const isIn = amount >= 0;
                          return (
                            <div key={tx.id} className="wv-activity-mini">
                              <span className={`wv-tx-icon ${isIn ? 'wv-tx-icon--in' : 'wv-tx-icon--out'}`}>
                                {isIn ? <ArrowDownLeft /> : <ArrowUpRight />}
                              </span>
                              <div className="wv-activity-mini-main">
                                <div className="wv-activity-mini-title">{isIn ? 'Received' : 'Sent'}</div>
                                <div className="wv-activity-mini-date">{formatDate(tx.created)}</div>
                              </div>
                              <div className={`wv-activity-mini-amount ${isIn ? 'is-in' : 'is-out'}`}>
                                {formatAmount(amount, txt(tx.asset, 'USD'), { sign: true })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>
                </aside>
              </div>
            </>
          )}

          {bankTab === 'crypto' && (
            <>
              <div className="wv-page-head">
                <div>
                  <h2 className="wv-page-heading">TBC &amp; crypto</h2>
                  <p className="wv-page-sub">TBC is the official in-app currency. Convert, send and hold TBC here, and track external wallets read-only. TradingBible never custodies crypto.</p>
                </div>
                <span className="wv-chip wv-chip--gold"><ShieldCheck /> Non-custodial tracking</span>
              </div>

              <TbcCard onChanged={reload} />

              <section className="wv-card" id="vault" aria-labelledby="external-wallets-title">
                <div className="wv-card-head">
                  <div>
                    <h2 id="external-wallets-title" className="wv-section-title">External wallets</h2>
                    <p className="wv-section-sub">Read-only balance lookups. We see the address, never the keys.</p>
                  </div>
                  <button type="button" className="wv-btn wv-btn--secondary wv-btn--sm" onClick={() => setAdding((value) => !value)}>
                    <Plus className="h-3.5 w-3.5" /> {adding ? 'Close form' : 'Add wallet'}
                  </button>
                </div>

                {adding && (
                  <form className="wv-add-wallet" onSubmit={submit}>
                    <div className="wv-form-grid">
                      <div className="wv-field-group">
                        <label className="wv-field-label" htmlFor="track-network">Network</label>
                        <select id="track-network" className="wv-field" value={form.network} onChange={(e) => setForm({ ...form, network: e.target.value })}>
                          {trackNetworks.map((network) => <option key={network.id} value={network.id}>{network.label}</option>)}
                        </select>
                      </div>
                      <div className="wv-field-group">
                        <label className="wv-field-label" htmlFor="track-address">Public address</label>
                        <input id="track-address" className="wv-field" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Wallet address" autoComplete="off" />
                      </div>
                      <div className="wv-field-group">
                        <label className="wv-field-label" htmlFor="track-label">Label</label>
                        <input id="track-label" className="wv-field" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Optional" autoComplete="off" />
                      </div>
                    </div>
                    <p className="wv-fine" style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 8 }}>
                      <KeyRound className="h-3.5 w-3.5" /> Public addresses only. Never enter a seed phrase or private key.
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 10 }}>
                      <button type="submit" className="wv-btn wv-btn--primary wv-btn--sm" disabled={busy || !form.address.trim()}>
                        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                        Track wallet
                      </button>
                      <button type="button" className="wv-btn wv-btn--ghost wv-btn--sm" onClick={() => setAdding(false)}>Cancel</button>
                    </div>
                  </form>
                )}

                {loading ? (
                  <div className="wv-wallet-grid">
                    <div className="wv-skeleton" style={{ height: 128 }} />
                    <div className="wv-skeleton" style={{ height: 128 }} />
                  </div>
                ) : wallets.length === 0 ? (
                  <div className="wv-empty">
                    <Wallet />
                    <strong>No external wallets tracked</strong>
                    <span>Add a Bitcoin, Ethereum, Solana or stablecoin address to see its public balance here.</span>
                  </div>
                ) : (
                  <div className="wv-wallet-grid">
                    {wallets.map((item) => (
                      <div key={item.id} className="wv-wallet-card">
                        <div className="wv-wallet-top">
                          <div className="wv-asset-cell">
                            <span className="wv-asset-icon wv-asset-icon--external"><Coins /></span>
                            <span>
                              <span className="wv-asset-name">{txt(item.label, txt(item.currency, 'Wallet'))}</span>
                              <span className="wv-asset-sub">{networkLabel(item.network, trackNetworks)}</span>
                            </span>
                          </div>
                          <button type="button" className="wv-btn wv-btn--danger wv-btn--sm" onClick={() => remove(item.id, item.label || item.network)} aria-label="Stop tracking wallet">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="wv-wallet-amount">
                          {item.ok ? formatTokenAmount(item.amount) : '—'} <span>{txt(item.currency, '')}</span>
                        </div>
                        <div className="wv-wallet-value">{item.ok ? fmtMoney(item.usdValue || 0) : 'Balance unavailable'}</div>
                        <div className="wv-wallet-address">{shortAddr(item.address)}</div>
                        <div className="wv-wallet-foot">
                          <span className={`wv-chip wv-chip--${item.ok ? 'green' : 'red'}`}>{item.ok ? 'Synced' : 'Unavailable'}</span>
                          {EXPLORER[item.network] ? (
                            <a className="wv-link" href={EXPLORER[item.network](item.address)} target="_blank" rel="noreferrer">
                              Explorer <ExternalLink />
                            </a>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="wv-card-foot">
                  <span>External wallet balances are read-only and never included in spendable cash.</span>
                  <span className="wv-fine">TradingBible does not hold your keys.</span>
                </div>
              </section>

              <div className="wv-two-col">
                <section className="wv-card" id="buy-crypto" aria-labelledby="buy-crypto-title" style={{ scrollMarginTop: 24 }}>
                  <div className="wv-card-head">
                    <div>
                      <h2 id="buy-crypto-title" className="wv-section-title">Buy crypto with card</h2>
                      <p className="wv-section-sub">Transak checkout delivers crypto directly to your own wallet</p>
                    </div>
                    <span className={`wv-chip ${onrampEnabled ? 'wv-chip--green' : ''}`}>{onrampEnabled ? 'Available' : 'Unavailable'}</span>
                  </div>
                  <div className="wv-card-body wv-form-stack">
                    <div className="wv-field-group">
                      <label className="wv-field-label" htmlFor="ramp-address">Your wallet address</label>
                      <input id="ramp-address" className="wv-field" value={rampForm.walletAddress} onChange={(e) => setRampForm({ ...rampForm, walletAddress: e.target.value })} placeholder="Destination wallet address" autoComplete="off" />
                    </div>
                    <div className="wv-form-grid">
                      <div className="wv-field-group">
                        <label className="wv-field-label" htmlFor="ramp-asset">Asset</label>
                        <select id="ramp-asset" className="wv-field" value={rampForm.currency} onChange={(e) => setRampForm({ ...rampForm, currency: e.target.value })}>
                          {['USDC', 'USDT', 'ETH', 'BTC', 'SOL'].map((currency) => <option key={currency} value={currency}>{currency}</option>)}
                        </select>
                      </div>
                      <div className="wv-field-group">
                        <label className="wv-field-label" htmlFor="ramp-amount">Amount (USD)</label>
                        <input id="ramp-amount" className="wv-field wv-field--amount" type="number" min="0" value={rampForm.fiatAmount} onChange={(e) => setRampForm({ ...rampForm, fiatAmount: e.target.value })} placeholder="100.00" style={{ paddingLeft: 12 }} />
                      </div>
                    </div>
                    <p className="wv-fine">Card-to-crypto is provided by Transak and is not a TradingBible deposit. Crypto lands in the wallet address you enter.</p>
                    <button type="button" className="wv-btn wv-btn--secondary wv-btn--block" disabled={busy || !onrampEnabled} onClick={doOnramp}>
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                      {onrampEnabled ? 'Continue to Transak' : 'Card on-ramp unavailable'}
                    </button>
                  </div>
                </section>

              </div>
            </>
          )}

          {bankTab === 'cards' && (
            <>
              <div className="wv-page-head">
                <div>
                  <h2 className="wv-page-heading">Cards</h2>
                  <p className="wv-page-sub">Virtual and physical cards for spending TBC and cash across TradingBible. TBC is the official in-app currency.</p>
                </div>
                <span className="wv-chip wv-chip--amber">Programme not active</span>
              </div>

              <div className="wv-card-products">
                <section className="wv-card" aria-labelledby="virtual-card-title">
                  <div className="wv-card-head">
                    <div>
                      <h2 id="virtual-card-title" className="wv-section-title">Virtual card</h2>
                      <p className="wv-section-sub">Instant spending once the programme opens</p>
                    </div>
                    <CreditCard className="h-4 w-4" style={{ color: 'var(--at-gold)' }} />
                  </div>
                  <div className="wv-card-body">
                    <CardPreview variant="virtual" />
                    <p className="wv-fine wv-card-size-note">Standard ISO/IEC 7810 ID-1 proportions · 85.60 × 53.98 mm</p>
                    <div className="wv-stat-row">
                      <span className="wv-stat-label">Status</span>
                      <span className="wv-chip wv-chip--amber">Not issued</span>
                    </div>
                    <div className="wv-stat-row">
                      <span className="wv-stat-label">Identity verification</span>
                      <span className={`wv-chip wv-chip--${identityTone}`}>{identityLabel}</span>
                    </div>
                    <div className="wv-stat-row">
                      <span className="wv-stat-label">Card issuer</span>
                      <span className="wv-stat-value">Not connected</span>
                    </div>
                    <button type="button" className="wv-btn wv-btn--secondary wv-btn--block" disabled={cardBusy === 'virtual'} onClick={() => requestCard('virtual')}>
                      {cardBusy === 'virtual' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                      Register interest
                    </button>
                    <p className="wv-fine" style={{ marginTop: 9 }}>Registering interest is not an approval and does not create a card. No card number, expiry, CVV or balance exists until an issuer provisions it.</p>
                  </div>
                </section>

                <section className="wv-card" aria-labelledby="physical-card-title">
                  <div className="wv-card-head">
                    <div>
                      <h2 id="physical-card-title" className="wv-section-title">Physical card</h2>
                      <p className="wv-section-sub">Mailed after approval and identity checks</p>
                    </div>
                    <Wallet className="h-4 w-4" style={{ color: 'var(--at-gold)' }} />
                  </div>
                  <div className="wv-card-body">
                    <CardPreview variant="physical" />
                    <p className="wv-fine wv-card-size-note">Standard ISO/IEC 7810 ID-1 proportions · 85.60 × 53.98 mm</p>
                    <div className="wv-stat-row">
                      <span className="wv-stat-label">Status</span>
                      <span className="wv-chip wv-chip--amber">Not issued</span>
                    </div>
                    <div className="wv-stat-row">
                      <span className="wv-stat-label">Identity verification</span>
                      <span className={`wv-chip wv-chip--${identityTone}`}>{identityLabel}</span>
                    </div>
                    <div className="wv-stat-row">
                      <span className="wv-stat-label">Delivery</span>
                      <span className="wv-stat-value">Not scheduled</span>
                    </div>
                    <button type="button" className="wv-btn wv-btn--secondary wv-btn--block" disabled={cardBusy === 'physical'} onClick={() => requestCard('physical')}>
                      {cardBusy === 'physical' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
                      Register interest
                    </button>
                    <p className="wv-fine" style={{ marginTop: 9 }}>Delivery is not scheduled until the card programme is approved. Registering interest does not reserve a card or a delivery date.</p>
                  </div>
                </section>
              </div>

              <section className="wv-card" aria-labelledby="card-readiness-title">
                <div className="wv-card-head">
                  <div>
                    <h2 id="card-readiness-title" className="wv-section-title">Card readiness</h2>
                    <p className="wv-section-sub">What has to be true before a real card can be issued</p>
                  </div>
                  <ShieldCheck className="h-4 w-4" style={{ color: 'var(--at-green)' }} />
                </div>
                <div className="wv-card-body">
                  <div className="wv-steps">
                    <div className={`wv-step ${kycStatus === 'verified' ? 'is-done' : 'is-active'}`}>
                      <span className="wv-step-dot">{kycStatus === 'verified' ? <Check /> : '1'}</span>
                      <div className="wv-step-main">
                        <div className="wv-step-title">Identity verification</div>
                        <div className="wv-step-sub">{kycStatus === 'verified' ? 'Verified' : kycStatus === 'pending' ? 'Review in progress' : 'Required before any card application'}</div>
                      </div>
                      {kycStatus === 'none' && (
                        <button type="button" className="wv-btn wv-btn--secondary wv-btn--sm" disabled={railBusy === 'kyc'} onClick={doKyc}>Verify</button>
                      )}
                    </div>
                    <div className="wv-step">
                      <span className="wv-step-dot">2</span>
                      <div className="wv-step-main">
                        <div className="wv-step-title">Card programme approval</div>
                        <div className="wv-step-sub">An approved issuer, terms and spending controls must be in place</div>
                      </div>
                      <span className="wv-chip wv-chip--amber">Pending</span>
                    </div>
                    <div className="wv-step">
                      <span className="wv-step-dot">3</span>
                      <div className="wv-step-main">
                        <div className="wv-step-title">Card issuance</div>
                        <div className="wv-step-sub">The issuer provisions the card and its real number, expiry and CVV</div>
                      </div>
                      <span className="wv-chip">Not issued</span>
                    </div>
                  </div>
                  <p className="wv-fine" style={{ marginTop: 10 }}>TBC remains fully available in your wallet now. Cards are a separate regulated programme; this page does not create, activate or fund one.</p>
                </div>
              </section>
            </>
          )}

          {bankTab === 'activity' && (
            <>
              <div className="wv-page-head">
                <div>
                  <h2 className="wv-page-heading">Activity</h2>
                  <p className="wv-page-sub">A complete record of deposits, withdrawals, transfers, conversions and credits. Every line is tied to the ledger balance.</p>
                </div>
                <span className="wv-chip wv-chip--green"><ShieldCheck /> Ledger verified</span>
              </div>

              <div className="wv-two-col">
                <section className="wv-card" aria-labelledby="activity-list-title">
                  <div className="wv-card-head">
                    <div>
                      <h2 id="activity-list-title" className="wv-section-title">Transaction history</h2>
                      <p className="wv-section-sub">{filteredTransactions.length} of {transactions.length} entries</p>
                    </div>
                  </div>
                  <div className="wv-activity-toolbar">
                    <div className="wv-filter-row" role="tablist" aria-label="Activity filters">
                      {ACTIVITY_FILTERS.map((filter) => (
                        <button
                          key={filter.id}
                          type="button"
                          role="tab"
                          aria-selected={activityFilter === filter.id}
                          className={`wv-filter ${activityFilter === filter.id ? 'is-active' : ''}`}
                          onClick={() => setActivityFilter(filter.id)}
                        >
                          {filter.label}
                        </button>
                      ))}
                    </div>
                    <label className="wv-search">
                      <Search />
                      <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Search activity</span>
                      <input className="wv-field" value={txQuery} onChange={(e) => setTxQuery(e.target.value)} placeholder="Search activity" />
                    </label>
                  </div>

                  {filteredTransactions.length === 0 ? (
                    <div className="wv-empty">
                      <Search />
                      <strong>{transactions.length ? 'No matching entries' : 'No ledger activity yet'}</strong>
                      <span>{transactions.length ? 'Try a different filter or search term.' : 'Deposits, withdrawals, transfers and conversions will appear here.'}</span>
                    </div>
                  ) : (
                    <div>
                      {filteredTransactions.map((tx) => {
                        const amount = numOrNull(tx.amount) ?? 0;
                        const isIn = amount >= 0;
                        const tone = statusTone(tx.status);
                        return (
                          <div key={tx.id} className="wv-tx-row">
                            <div className="wv-tx-date">{formatDate(tx.created)}</div>
                            <div className="wv-tx-type">
                              <span className={`wv-tx-icon ${isIn ? 'wv-tx-icon--in' : 'wv-tx-icon--out'}`}>
                                {isIn ? <ArrowDownLeft /> : <ArrowUpRight />}
                              </span>
                              <span className="wv-tx-type-main">{txLabel(tx.type)}</span>
                            </div>
                            <div className="wv-tx-ref">{txt(tx.reference, '—')}</div>
                            <div className={`wv-tx-amount ${isIn ? 'is-in' : 'is-out'}`}>{formatAmount(amount, txt(tx.asset, 'USD'), { sign: true })}</div>
                            <div className="wv-tx-status"><span className={`wv-chip wv-chip--${tone}`}>{statusLabel(tx.status)}</span></div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                <aside className="wv-side-stack">
                  <section className="wv-card">
                    <div className="wv-card-head">
                      <div>
                        <h2 className="wv-section-title">Statements</h2>
                        <p className="wv-section-sub">Opening, lines and closing balance</p>
                      </div>
                      <FileText className="h-4 w-4" style={{ color: 'var(--at-gold)' }} />
                    </div>
                    <div className="wv-card-body">
                      <div className="wv-stmt-form">
                        <div className="wv-stmt-grid">
                          <input
                            type="month"
                            className="wv-field"
                            value={stmtMonth}
                            max={new Date().toISOString().slice(0, 7)}
                            onChange={(e) => setStmtMonth(e.target.value)}
                            aria-label="Statement month"
                          />
                          <button type="button" className="wv-btn wv-btn--secondary" disabled={stmtBusy} onClick={loadStatement}>{stmtBusy ? '…' : 'View'}</button>
                        </div>
                        <button type="button" className="wv-btn wv-btn--ghost wv-btn--block" disabled={stmtBusy} onClick={saveStatementCsv}>
                          <Download className="h-3.5 w-3.5" /> Download CSV
                        </button>
                      </div>
                      {statement ? (
                        <div className="wv-stmt-result">
                          <div className="wv-stmt-row"><span>Opening cash</span><strong>{fmtMoney(statement.opening?.USD || 0)}</strong></div>
                          <div className="wv-stmt-row"><span>Lines</span><strong>{statement.count}</strong></div>
                          <div className="wv-stmt-row"><span>Closing cash</span><strong>{fmtMoney(statement.closing?.USD || 0)}</strong></div>
                        </div>
                      ) : (
                        <p className="wv-fine" style={{ marginTop: 10 }}>Choose a month, then view its opening balance, every line and closing balance.</p>
                      )}
                    </div>
                  </section>

                  <section className="wv-card">
                    <div className="wv-card-head">
                      <div>
                        <h2 className="wv-section-title">How balances work</h2>
                        <p className="wv-section-sub">Internal ledger rules</p>
                      </div>
                      <Info className="h-4 w-4" style={{ color: 'var(--at-mut)' }} />
                    </div>
                    <div className="wv-card-body">
                      <p className="wv-fine">Cash is held in a double-entry ledger. The displayed balance is the sum of every non-failed entry. Deposits credit only after Stripe confirms payment; crypto tracking never moves funds.</p>
                      <Link to="/contact" className="wv-link" style={{ marginTop: 10 }}>
                        Contact support <ArrowUpRight />
                      </Link>
                    </div>
                  </section>
                </aside>
              </div>
            </>
          )}

          <div className="wv-card-foot" style={{ borderTop: '1px solid var(--at-line-soft)', paddingLeft: 0, paddingRight: 0 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <ShieldCheck className="h-3.5 w-3.5" style={{ color: 'var(--at-green)' }} />
              Operated by TradingBible Holdings, Inc. TBC is the official in-app currency · deposits via Stripe · payouts via Stripe Connect · crypto is non-custodial.
            </span>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
