// TBC brand-credit terminal for the Wallet page + TBC dashboard.
// Real ledger-backed TBC credits (off-chain utility credits, NOT on-chain
// tokens and NOT an investment): convert USD ⇄ TBC at the published rate,
// send member-to-member, link personal EVM/native addresses, see on-chain
// balances when launched, queue treasury claims when the admin opens them.
import React, { useCallback, useEffect, useState } from 'react';
import { Coins, ArrowUpDown, Wallet, Plus, Send, ChevronDown } from 'lucide-react';
import { Card, GoldButton, GhostButton } from '@/components/ui-kit';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n';
import pb from '@/lib/pocketbaseClient';
import { txt, numOrNull } from '@/lib/safeRender';
import { API_SERVER_URL } from '@/lib/apiServerClient';
import { TBC_LOGO_URL } from '@/lib/tbc';
import { TbcSign, TbcMoney } from '@/components/TbcSign';

const input = 'w-full rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-2.5 font-mono text-sm text-[#e9e7df] outline-none focus:border-[#d4af37]/50 min-h-[44px]';

function headers() {
  return { Authorization: `Bearer ${pb.authStore.token}`, 'Content-Type': 'application/json' };
}

export default function TbcCard({ onChanged }) {
  const { toast } = useToast();
  const { t } = useI18n();
  const [econ, setEcon] = useState({ tbcPerUsd: 0.3077, usdPerKwd: 3.25, peg: '1 TBC = 1 KWD', claimEnabled: false, claimMin: 100 });
  const [bal, setBal] = useState({ tbc: 0, usd: 0 });
  const [amount, setAmount] = useState('');
  const [direction, setDirection] = useState('toTBC'); // toTBC | toUSD
  const [claimAmt, setClaimAmt] = useState('');
  const [sendTo, setSendTo] = useState('');
  const [sendAmt, setSendAmt] = useState('');
  const [addr, setAddr] = useState('');
  const [savedAddr, setSavedAddr] = useState('');
  const [nativeAddr, setNativeAddr] = useState('');
  const [savedNative, setSavedNative] = useState('');
  const [onchain, setOnchain] = useState(null);
  const [busy, setBusy] = useState('');
  // Rails as collapsible widgets — keeps the card short; tap to expand.
  const [openRail, setOpenRail] = useState(null); // convert | buy | receive | null
  const toggleRail = (id) => setOpenRail((o) => (o === id ? null : id));
  useEffect(() => {
    const open = (e) => { const id = e?.detail; if (['convert', 'receive'].includes(id)) setOpenRail(id); };
    window.addEventListener('tb:open-rail', open);
    return () => window.removeEventListener('tb:open-rail', open);
  }, []);

  const load = useCallback(async () => {
    try {
      const [e, b] = await Promise.all([
        fetch(`${API_SERVER_URL}/tbc/econ`).then((r) => r.json()).catch(() => ({})),
        pb.authStore.token ? fetch(`${API_SERVER_URL}/tbc/balance`, { headers: headers() }).then((r) => r.json()).catch(() => ({})) : {},
      ]);
      if (numOrNull(b.tbc) != null || typeof b.usd === 'number') setBal({ tbc: numOrNull(b.tbc) ?? 0, usd: numOrNull(b.usd) ?? 0 });
      if (b.saved) setSavedAddr(txt(b.saved, ''));
      if (b.savedNative) setSavedNative(txt(b.savedNative, ''));
      // Guard: 1 TBC = 1 KWD (≈0.3077 TBC/$1). Reject a 1:1 rate from a stale config.
      const r = Number(e?.tbcPerUsd);
      if (r > 0.15 && r < 0.6) setEcon(e);
      else if (Number(e?.usdPerKwd) >= 2 && Number(e?.usdPerKwd) <= 5) {
        setEcon({ ...e, tbcPerUsd: 1 / Number(e.usdPerKwd), usdPerKwd: Number(e.usdPerKwd) });
      }
    } catch { /* display defaults */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  const lookup = useCallback(async (address) => {
    if (!/^0x[0-9a-fA-F]{40}$/.test(address || '')) { setOnchain(null); return; }
    try {
      const d = await fetch(`${API_SERVER_URL}/tbc/onchain/${address}`, { headers: headers() }).then((r) => r.json()).catch(() => null);
      if (d?.chains) { setOnchain(d); if (d.saved) setSavedAddr(txt(d.saved, '')); if (d.savedNative) setSavedNative(txt(d.savedNative, '')); }
    } catch { /* ignore */ }
  }, []);

  const convert = async () => {
    const n = Number(amount);
    if (!(n > 0)) { toast({ variant: 'destructive', title: direction === 'toTBC' ? t('tbc.enterUsd') : t('tbc.enterTbc') }); return; }
    setBusy('convert');
    try {
      const res = await fetch(`${API_SERVER_URL}/tbc/convert`, { method: 'POST', headers: headers(), body: JSON.stringify({ direction, usdAmount: direction === 'toTBC' ? n : undefined, amount: direction === 'toUSD' ? n : undefined }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || t('tbc.convFail'));
      toast({
        title: direction === 'toTBC' ? t('tbc.convToastTo', d.converted) : t('tbc.convToastFrom', d.converted),
        description: t('tbc.convRateToast', d.converted),
      });
      setAmount('');
      setBal(d.balances);
      onChanged?.();
    } catch (e) { toast({ variant: 'destructive', title: t('tbc.convFail'), description: e.message }); }
    finally { setBusy(''); }
  };

  const send = async () => {
    const n = Number(sendAmt);
    if (!(n > 0)) { toast({ variant: 'destructive', title: t('tbc.enterTbcAmt') }); return; }
    if (!sendTo.trim()) { toast({ variant: 'destructive', title: t('tbc.enterMember') }); return; }
    if (!window.confirm(t('tbc.confirmSend', { n, who: sendTo.trim() }))) return;
    setBusy('send');
    try {
      const res = await fetch(`${API_SERVER_URL}/tbc/send`, { method: 'POST', headers: headers(), body: JSON.stringify({ toEmail: sendTo.trim(), amount: n }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || t('tbc.sendFailToast'));
      toast({ title: t('tbc.sentToast', d.sent) });
      setSendAmt(''); setSendTo('');
      setBal(d.balances);
      onChanged?.();
    } catch (e) { toast({ variant: 'destructive', title: t('tbc.sendFailToast'), description: e.message }); }
    finally { setBusy(''); }
  };

  const saveAddress = async (address) => {
    if (!/^0x[0-9a-fA-F]{40}$/.test(address || '')) { toast({ variant: 'destructive', title: t('tbc.badAddr') }); return; }
    setBusy('addr');
    try {
      const res = await fetch(`${API_SERVER_URL}/tbc/address`, { method: 'POST', headers: headers(), body: JSON.stringify({ address }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.detail || d.error || t('tbc.saveFail'));
      setSavedAddr(address);
      toast({ title: t('tbc.addrSaved'), description: t('tbc.addrSavedSub') });
      await lookup(address);
    } catch (e) { toast({ variant: 'destructive', title: t('tbc.saveFail'), description: e.message }); }
    finally { setBusy(''); }
  };

  const saveNativeAddress = async (value) => {
    const { isTbcAddress } = await import('@/lib/bech32');
    if (!isTbcAddress(value || '')) { toast({ variant: 'destructive', title: t('tbc.badNative') }); return; }
    setBusy('native');
    try {
      const res = await fetch(`${API_SERVER_URL}/tbc/address`, { method: 'POST', headers: headers(), body: JSON.stringify({ nativeAddress: value.trim() }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.detail || d.error || t('tbc.saveFail'));
      setSavedNative(value.trim());
      toast({ title: t('tbc.nativeSaved'), description: t('tbc.nativeSavedSub') });
    } catch (e) { toast({ variant: 'destructive', title: t('tbc.saveFail'), description: e.message }); }
    finally { setBusy(''); }
  };

  const connectInjected = async () => {
    if (!window.ethereum) { toast({ variant: 'destructive', title: t('tbc.noWallet'), description: t('tbc.installWallet') }); return; }
    try {
      const accs = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (accs?.[0]) { setAddr(accs[0]); await saveAddress(accs[0]); }
    } catch (e) { toast({ variant: 'destructive', title: t('tbc.connectFail'), description: e.message }); }
  };

  const addToMetaMask = async (chain) => {
    const info = onchain?.chains?.[chain];
    if (!info?.contract || !window.ethereum) return;
    try {
      await window.ethereum.request({
        method: 'wallet_watchAsset',
        params: { type: 'ERC20', options: { address: info.contract, symbol: 'TBC', decimals: 18, image: TBC_LOGO_URL.startsWith('http') ? TBC_LOGO_URL : `${window.location.origin}${TBC_LOGO_URL}` } },
      });
    } catch (e) { toast({ variant: 'destructive', title: t('tbc.addTokenFail'), description: e.message }); }
  };

  const claim = async () => {
    const n = Number(claimAmt);
    if (!(n > 0)) { toast({ variant: 'destructive', title: t('tbc.enterTbcAmt') }); return; }
    setBusy('claim');
    try {
      const res = await fetch(`${API_SERVER_URL}/tbc/claim`, { method: 'POST', headers: headers(), body: JSON.stringify({ amount: n }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.detail || d.error || t('tbc.claimFail'));
      toast({ title: t('tbc.claimQueued') });
      setClaimAmt('');
      await load();
      onChanged?.();
    } catch (e) { toast({ variant: 'destructive', title: e.message === 'claim_unavailable' ? t('tbc.claimLaunch') : t('tbc.claimFail'), description: e.message }); }
    finally { setBusy(''); }
  };

  const KWD_RATE = 1 / 3.25; // 1 TBC = 1 KWD, NOT 1 USD
  const rate = numOrNull(econ.tbcPerUsd) ?? KWD_RATE;
  const preview = direction === 'toTBC'
    ? Math.round((Number(amount) || 0) * rate * 100) / 100
    : Math.round((Number(amount) || 0) / rate * 100) / 100;
  const fromSym = direction === 'toTBC' ? 'USD' : 'TBC';
  const toSym = direction === 'toTBC' ? 'TBC' : 'USD';
  const fromBal = direction === 'toTBC' ? `$${Number(bal.usd || 0).toLocaleString()}` : `${Number(bal.tbc || 0).toLocaleString()} TBC`;

  const scrollToId = (id) => {
    const host = document.getElementById(id);
    if (host) host.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else window.location.href = `/app/wallet?tab=crypto#${id}`;
  };

  return (
    <Card className="relative overflow-hidden border-[#d4af37]/30 p-0">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#d4af37]/70 to-transparent" />
      <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#d4af37]/[0.08] blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-8 -left-4 select-none font-black leading-none text-[#d4af37]/[0.05]" style={{ fontSize: '11rem' }}>₮</div>

      {/* ── Mint hero ── */}
      <div className="relative p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="relative grid h-14 w-14 shrink-0 place-items-center">
            <span aria-hidden className="absolute inset-0 rounded-full border border-[#d4af37]/50" />
            <span aria-hidden className="absolute inset-1 rounded-full border border-[#d4af37]/25" />
            <img src={TBC_LOGO_URL} alt="TBC" className="h-10 w-10 rounded-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          </span>
          <div className="min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#d4af37]">{t('tbc.cardEyebrow')}</div>
            <div className="truncate text-xs text-[#8a8577]">{t('tbc.cardSub')}</div>
          </div>
          <span className="ml-auto shrink-0 rounded-full border border-[#d4af37]/30 bg-[#d4af37]/[0.07] px-3 py-1.5 text-center font-mono text-[11px] font-bold leading-tight text-[#d4af37]">
            {t('tbc.cardRate')}<br />{rate} <TbcSign />
          </span>
        </div>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
          <div className="text-[40px] font-extrabold leading-none tracking-tight text-[#f0ecdd]"><TbcMoney amount={bal.tbc} /></div>
          <div className="pb-1 text-right font-mono text-xs text-[#8a8577]">≈ ${Math.round((Number(bal.tbc) || 0) / rate).toLocaleString()} · {t('tbc.cardPlans')}</div>
        </div>
      </div>

      {/* ── 3 rails as widgets: convert · buy · receive ── */}
      <div className="relative grid grid-cols-2 gap-2 px-4 sm:grid-cols-3 sm:px-6">
        {[
          ['01', t('wal.convertBtn'), t('tbc.tileConvertSub'), 'convert'],
          ['02', t('tbc.tileBuy'), t('tbc.tileBuySub'), 'buy'],
          ['03', t('tbc.tileReceive'), t('tbc.tileReceiveSub'), 'receive'],
        ].map(([n, k, s, id]) => {
          const open = openRail === id;
          const go = () => {
            if (id === 'buy') {
              try { window.dispatchEvent(new CustomEvent('tb:open-section', { detail: 'buy' })); } catch { /* ignore */ }
              setTimeout(() => document.getElementById('buy-crypto')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 220);
            } else toggleRail(id);
          };
          return (
            <button key={n} onClick={go} aria-expanded={id === 'buy' ? undefined : open}
              className={`group rounded-2xl border px-3 py-3 text-left transition hover:-translate-y-0.5 ${open ? 'border-[#d4af37]/60 bg-[#d4af37]/[0.07]' : 'border-[#d4af37]/15 bg-black/20 hover:border-[#d4af37]/40'}`}>
              <div className="flex items-center justify-between gap-1">
                <span className="font-mono text-[10px] font-bold text-[#5f5b50]">{n}</span>
                <ChevronDown className={`h-3.5 w-3.5 text-[#d4af37] transition ${open ? 'rotate-180' : ''}`} />
              </div>
              <div className="mt-0.5 text-sm font-extrabold text-[#d4af37]">{k}</div>
              <div className="mt-0.5 text-[11px] leading-snug text-[#8a8577]">{s}</div>
            </button>
          );
        })}
      </div>
      <p className="relative px-4 pt-2 text-[11px] leading-relaxed text-[#6a665a] sm:px-6">{t('tbc.convertVsDefi', null, 'Convert ≠ DeFi. Convert is in-app ledger cash ⇄ TBC (instant, no gas). DeFi pools and lending open with the network — stage positions below, nothing moves before its gate.')}</p>

      {/* ── Convert widget ── */}
      {openRail === 'convert' && (
      <div id="tbc-converter" className="relative mx-4 mt-3 scroll-mt-24 rounded-2xl border border-[#d4af37]/25 bg-gradient-to-b from-[#d4af37]/[0.07] to-transparent p-4 sm:mx-6">
        <div className="flex items-center gap-2 text-sm font-bold text-[#f0ecdd]">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#d4af37]/15 text-[#d4af37]">⇄</span>
          {t('tbc.convTitle')}
        </div>
        <div className="mt-3 rounded-xl border border-white/8 bg-black/30 p-3">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-[#5f5b50]">
            <span>{t('tbc.from')}</span><span className="font-mono normal-case tracking-normal">{t('tbc.avail')}: {fromBal}</span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <input className="min-w-0 flex-1 bg-transparent font-mono text-2xl font-extrabold text-[#f0ecdd] outline-none placeholder:text-[#5f5b50]" type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" inputMode="decimal" />
            <span className="shrink-0 rounded-lg bg-white/5 px-2.5 py-1.5 font-mono text-xs font-bold text-[#d4af37]">{fromSym}</span>
          </div>
        </div>
        <div className="relative z-10 -my-2 flex justify-center">
          <button onClick={() => { setDirection(direction === 'toTBC' ? 'toUSD' : 'toTBC'); setAmount(''); }} aria-label="Flip direction" className="grid h-9 w-9 place-items-center rounded-full border border-[#d4af37]/40 bg-[#0c0c11] text-[#d4af37] shadow-lg transition hover:rotate-180">
            <ArrowUpDown className="h-4 w-4" />
          </button>
        </div>
        <div className="rounded-xl border border-white/8 bg-black/30 p-3">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-[#5f5b50]"><span>{t('tbc.to')}</span></div>
          <div className="mt-1 flex items-center gap-2">
            <div className="min-w-0 flex-1 truncate font-mono text-2xl font-extrabold text-[#d4af37]">{preview > 0 ? preview.toLocaleString() : '0.00'}</div>
            <span className="shrink-0 rounded-lg bg-[#d4af37]/15 px-2.5 py-1.5 font-mono text-xs font-bold text-[#d4af37]">{toSym}</span>
          </div>
        </div>
        <GoldButton disabled={busy === 'convert'} onClick={convert} className="mt-3 !min-h-[48px] w-full !text-sm">
          {busy === 'convert' ? '…' : preview > 0 ? t('tbc.convCta', { v: preview.toLocaleString(), sym: toSym }) : t('wal.convertBtn')}
        </GoldButton>
        <p className="mt-2 text-center font-mono text-[11px] text-[#8a8577]">{t('tbc.convRateLine', { rate })}</p>
        <p className="mt-1 text-center text-[11px] leading-relaxed text-[#6a665a]">{t('tbc.convNote')}</p>
      </div>
      )}

      {/* ── Buy widget ── */}
      {openRail === 'buy' && (
        <div className="relative mx-4 mt-3 scroll-mt-24 rounded-2xl border border-white/8 bg-black/20 p-4 sm:mx-6">
          <div className="flex items-center gap-2 text-sm font-bold text-[#f0ecdd]">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#d4af37]/15 text-[#d4af37]">+</span>
            {t('tbc.tileBuy')} · card → crypto
          </div>
          <p className="mt-1 text-xs leading-relaxed text-[#8a8577]">{t('tbc.cardSendSub')}</p>
          <GhostButton onClick={() => scrollToId('buy-crypto')} className="mt-3 !min-h-[44px] w-full !text-xs sm:w-auto sm:!px-6">{t('tbc.tileBuy')} →</GhostButton>
        </div>
      )}

      {/* ── Receive / Send widget ── */}
      {openRail === 'receive' && (
      <div id="tbc-send" className="relative mx-4 mt-3 scroll-mt-24 rounded-2xl border border-white/8 bg-black/20 p-4 sm:mx-6">
        <div className="flex items-center gap-2 text-sm font-bold text-[#f0ecdd]">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#d4af37]/15 text-[#d4af37]"><Send className="h-3.5 w-3.5" /></span>
          {t('tbc.cardSendTitle')}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-[#8a8577]">{t('tbc.cardSendSub')}</p>
        <div className="mt-3 grid grid-cols-1 gap-2 min-[420px]:grid-cols-[1fr_120px_auto]">
          <input className={`${input} font-mono`} value={sendTo} onChange={(e) => setSendTo(e.target.value)} placeholder="member@email.com" autoComplete="off" />
          <input className={input} type="number" min="0" value={sendAmt} onChange={(e) => setSendAmt(e.target.value)} placeholder="TBC" inputMode="decimal" />
          <GoldButton disabled={busy === 'send'} onClick={send} className="!px-5 !py-2 !text-xs">{busy === 'send' ? '…' : t('wal.sendBtn')}</GoldButton>
        </div>
      </div>
      )}

      {/* ── Personal on-chain addresses (widget) ── */}
      <div className="relative mx-4 mt-3 rounded-2xl border border-white/8 bg-black/20 p-4 sm:mx-6">
        <button onClick={() => toggleRail('addresses')} aria-expanded={openRail === 'addresses'} className="flex w-full items-center gap-2 text-left text-sm font-bold text-[#f0ecdd]">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#d4af37]/15 text-[#d4af37]"><Wallet className="h-3.5 w-3.5" /></span>
          <span className="min-w-0 flex-1">{t('tbc.addrTitle')}</span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-[#d4af37] transition ${openRail === 'addresses' ? 'rotate-180' : ''}`} />
        </button>
        {openRail === 'addresses' && (<>
        <p className="mt-1 text-xs leading-relaxed text-[#8a8577]">{t('tbc.addrSub')}</p>
        {savedAddr ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="min-w-0 flex-1 truncate rounded-xl bg-white/5 px-3 py-2.5 font-mono text-xs text-[#e9e7df]">{savedAddr}</span>
            <GhostButton onClick={() => lookup(savedAddr)} className="!px-3 !py-2 !text-xs">{t('tbc.refreshChain')}</GhostButton>
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-2 min-[420px]:flex-row">
            <input className={`${input} font-mono`} value={addr} onChange={(e) => { setAddr(e.target.value); }} onBlur={() => lookup(addr)} placeholder="0x… (or connect)" autoComplete="off" />
            <GhostButton disabled={busy === 'addr'} onClick={() => saveAddress(addr)} className="!px-3 !py-2 !text-xs"><Plus className="h-4 w-4" /> {t('c.save')}</GhostButton>
            <GhostButton onClick={connectInjected} className="!px-3 !py-2 !text-xs">{t('tbc.connectWallet')}</GhostButton>
          </div>
        )}
        <div className="mt-3 text-[11px] font-bold uppercase tracking-wide text-[#8a8577]">{t('tbc.nativeLabel')}</div>
        {savedNative ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className="min-w-0 flex-1 truncate rounded-xl bg-white/5 px-3 py-2.5 font-mono text-xs text-[#e9e7df]">{savedNative}</span>
          </div>
        ) : (
          <div className="mt-1.5 flex flex-col gap-2 min-[420px]:flex-row">
            <input className={`${input} font-mono`} value={nativeAddr} onChange={(e) => setNativeAddr(e.target.value)} placeholder="tbc1…" autoComplete="off" />
            <GhostButton disabled={busy === 'native'} onClick={() => saveNativeAddress(nativeAddr)} className="!px-3 !py-2 !text-xs"><Plus className="h-4 w-4" /> {t('c.save')}</GhostButton>
          </div>
        )}
        {onchain && (
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {['ethereum', 'base'].map((chain) => {
              const info = onchain.chains?.[chain];
              if (!info) return null;
              return (
                <div key={chain} className="rounded-xl bg-white/5 px-3 py-2.5 text-xs">
                  <div className="font-semibold uppercase tracking-wide text-[#8a8577]">{chain}</div>
                  {!info.deployed ? (
                    <div className="mt-1 text-[#8a8577]">{t('tbc.notLaunched', { chain })}</div>
                  ) : (
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span className="font-mono text-[#f0ecdd]">{(numOrNull(info.balance) ?? 0).toLocaleString()} TBC{info.unchecked ? t('tbc.rpcDown') : ''}</span>
                      <button onClick={() => addToMetaMask(chain)} className="shrink-0 font-semibold text-[#d4af37] hover:underline">+ MetaMask</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        </>)}
      </div>

      {/* ── Claim (widget) ── */}
      <div className="relative mx-4 mt-3 rounded-2xl border border-white/8 bg-black/20 p-4 sm:mx-6">
        <button onClick={() => toggleRail('claim')} aria-expanded={openRail === 'claim'} className="flex w-full items-center gap-2 text-left text-sm font-bold text-[#f0ecdd]">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#d4af37]/15 text-[#d4af37]"><Coins className="h-3.5 w-3.5" /></span>
          <span className="min-w-0 flex-1">{t('tbc.claimTitle')} {econ.claimEnabled ? null : <span className="font-normal text-[#8a8577]">{t('tbc.claimOpensAt')}</span>}</span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-[#d4af37] transition ${openRail === 'claim' ? 'rotate-180' : ''}`} />
        </button>
        {openRail === 'claim' && (<>
        {econ.claimEnabled ? (
          <div className="mt-3 flex flex-col gap-2 min-[420px]:flex-row">
            <input className={input} type="number" min="0" value={claimAmt} onChange={(e) => setClaimAmt(e.target.value)} placeholder={t('tbc.claimMin', { n: econ.claimMin })} inputMode="decimal" />
            <GoldButton disabled={busy === 'claim'} onClick={claim} className="!px-4 !py-2 !text-xs">{busy === 'claim' ? '…' : t('tbc.queueClaim')}</GoldButton>
          </div>
        ) : (
          <p className="mt-2 text-xs leading-relaxed text-[#8a8577]">{t('tbc.claimSub')}</p>
        )}
        </>)}
      </div>

      <p className="relative mx-4 mb-4 mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-[#6a665a] sm:mx-6 sm:mb-5">
        <Coins className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {t('tbc.disclaimer')}
      </p>
    </Card>
  );
}
