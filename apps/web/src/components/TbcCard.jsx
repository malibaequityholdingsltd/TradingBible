// TBC brand-credit card for the Wallet page.
// Real ledger-backed TBC credits (off-chain utility credits, NOT on-chain
// tokens and NOT an investment): convert USD → TBC at the published rate,
// link your personal EVM address, see on-chain balances when launched,
// queue treasury claims when the admin opens them.
import React, { useCallback, useEffect, useState } from 'react';
import { Coins, ArrowRightLeft, Wallet, Plus, Send } from 'lucide-react';
import { Card, GoldButton, GhostButton } from '@/components/ui-kit';
import { useToast } from '@/hooks/use-toast';
import pb from '@/lib/pocketbaseClient';
import { API_SERVER_URL } from '@/lib/apiServerClient';
import { TBC_LOGO_URL } from '@/lib/tbc';
import { TbcSign, TbcMoney } from '@/components/TbcSign';

const input = 'w-full rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-2.5 font-mono text-sm text-[#e9e7df] outline-none focus:border-[#d4af37]/50 min-h-[44px]';

function headers() {
  return { Authorization: `Bearer ${pb.authStore.token}`, 'Content-Type': 'application/json' };
}

export default function TbcCard({ onChanged }) {
  const { toast } = useToast();
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

  const load = useCallback(async () => {
    try {
      const [e, b] = await Promise.all([
        fetch(`${API_SERVER_URL}/tbc/econ`).then((r) => r.json()).catch(() => ({})),
        pb.authStore.token ? fetch(`${API_SERVER_URL}/tbc/balance`, { headers: headers() }).then((r) => r.json()).catch(() => ({})) : {},
      ]);
      if (typeof b.tbc === 'number') setBal(b);
      if (b.saved) setSavedAddr(b.saved);
      if (b.savedNative) setSavedNative(b.savedNative);
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
      if (d?.chains) { setOnchain(d); if (d.saved) setSavedAddr(d.saved); if (d.savedNative) setSavedNative(d.savedNative); }
    } catch { /* ignore */ }
  }, []);

  const convert = async () => {
    const n = Number(amount);
    if (!(n > 0)) { toast({ variant: 'destructive', title: direction === 'toTBC' ? 'Enter a USD amount' : 'Enter a TBC amount' }); return; }
    setBusy('convert');
    try {
      const res = await fetch(`${API_SERVER_URL}/tbc/convert`, { method: 'POST', headers: headers(), body: JSON.stringify({ direction, usdAmount: direction === 'toTBC' ? n : undefined, amount: direction === 'toUSD' ? n : undefined }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'conversion failed');
      toast({
        title: direction === 'toTBC' ? `Converted $${d.converted.usd} → ${d.converted.tbc} TBC` : `Converted ${d.converted.tbc} TBC → $${d.converted.usd}`,
        description: `${d.converted.rate} TBC per $1, no spread`,
      });
      setAmount('');
      setBal(d.balances);
      onChanged?.();
    } catch (e) { toast({ variant: 'destructive', title: 'Conversion failed', description: e.message }); }
    finally { setBusy(''); }
  };

  const send = async () => {
    const n = Number(sendAmt);
    if (!(n > 0)) { toast({ variant: 'destructive', title: 'Enter a TBC amount' }); return; }
    if (!sendTo.trim()) { toast({ variant: 'destructive', title: "Enter the member's email" }); return; }
    if (!window.confirm(`Send ${n} TBC to ${sendTo.trim()}?`)) return;
    setBusy('send');
    try {
      const res = await fetch(`${API_SERVER_URL}/tbc/send`, { method: 'POST', headers: headers(), body: JSON.stringify({ toEmail: sendTo.trim(), amount: n }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'send failed');
      toast({ title: `Sent ${d.sent.tbc} TBC to ${d.sent.to}` });
      setSendAmt(''); setSendTo('');
      setBal(d.balances);
      onChanged?.();
    } catch (e) { toast({ variant: 'destructive', title: 'Send failed', description: e.message }); }
    finally { setBusy(''); }
  };

  const saveAddress = async (address) => {
    if (!/^0x[0-9a-fA-F]{40}$/.test(address || '')) { toast({ variant: 'destructive', title: 'Enter a valid 0x address' }); return; }
    setBusy('addr');
    try {
      const res = await fetch(`${API_SERVER_URL}/tbc/address`, { method: 'POST', headers: headers(), body: JSON.stringify({ address }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.detail || d.error || 'save failed');
      setSavedAddr(address);
      toast({ title: 'Personal TBC address saved', description: 'On-chain claims will go here at launch.' });
      await lookup(address);
    } catch (e) { toast({ variant: 'destructive', title: 'Save failed', description: e.message }); }
    finally { setBusy(''); }
  };

  const saveNativeAddress = async (value) => {
    const { isTbcAddress } = await import('@/lib/bech32');
    if (!isTbcAddress(value || '')) { toast({ variant: 'destructive', title: 'Enter a valid tbc1… native address' }); return; }
    setBusy('native');
    try {
      const res = await fetch(`${API_SERVER_URL}/tbc/address`, { method: 'POST', headers: headers(), body: JSON.stringify({ nativeAddress: value.trim() }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.detail || d.error || 'save failed');
      setSavedNative(value.trim());
      toast({ title: 'Native tbc1… address saved', description: 'Used for chain staking and claims once the network is live.' });
    } catch (e) { toast({ variant: 'destructive', title: 'Save failed', description: e.message }); }
    finally { setBusy(''); }
  };

  const connectInjected = async () => {
    if (!window.ethereum) { toast({ variant: 'destructive', title: 'No wallet found', description: 'Install MetaMask or Coinbase Wallet first.' }); return; }
    try {
      const accs = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (accs?.[0]) { setAddr(accs[0]); await saveAddress(accs[0]); }
    } catch (e) { toast({ variant: 'destructive', title: 'Connect failed', description: e.message }); }
  };

  const addToMetaMask = async (chain) => {
    const info = onchain?.chains?.[chain];
    if (!info?.contract || !window.ethereum) return;
    try {
      await window.ethereum.request({
        method: 'wallet_watchAsset',
        params: { type: 'ERC20', options: { address: info.contract, symbol: 'TBC', decimals: 18, image: TBC_LOGO_URL.startsWith('http') ? TBC_LOGO_URL : `${window.location.origin}${TBC_LOGO_URL}` } },
      });
    } catch (e) { toast({ variant: 'destructive', title: 'Add token failed', description: e.message }); }
  };

  const claim = async () => {
    const n = Number(claimAmt);
    if (!(n > 0)) { toast({ variant: 'destructive', title: 'Enter a TBC amount' }); return; }
    setBusy('claim');
    try {
      const res = await fetch(`${API_SERVER_URL}/tbc/claim`, { method: 'POST', headers: headers(), body: JSON.stringify({ amount: n }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.detail || d.error || 'claim failed');
      toast({ title: 'Claim queued for treasury settlement' });
      setClaimAmt('');
      await load();
      onChanged?.();
    } catch (e) { toast({ variant: 'destructive', title: e.message === 'claim_unavailable' ? 'Claims open at token launch' : 'Claim failed', description: e.message }); }
    finally { setBusy(''); }
  };

  const KWD_RATE = 1 / 3.25; // 1 TBC = 1 KWD, NOT 1 USD
  const preview = direction === 'toTBC'
    ? Math.round((Number(amount) || 0) * (econ.tbcPerUsd || KWD_RATE) * 100) / 100
    : Math.round((Number(amount) || 0) / (econ.tbcPerUsd || KWD_RATE) * 100) / 100;

  return (
    <Card className="relative overflow-hidden border-[#d4af37]/30 p-4 sm:p-5">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#d4af37]/70 to-transparent" />
      <div className="flex flex-wrap items-center gap-4">
        <img src={TBC_LOGO_URL} alt="TBC" className="gold-glow h-14 w-14 shrink-0 rounded-2xl object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#8a8577]">TBC · pre-launch credit — only money that spends in-app</div>
          <div className="truncate text-3xl font-extrabold text-[#d4af37]"><TbcMoney amount={bal.tbc} /></div>
          <div className="mt-0.5 text-[11px] text-[#8a8577]">Plans pay by card/cash, everything else pays in TBC</div>
        </div>
        <div className="text-right">
          <div className="text-[11px] uppercase tracking-wide text-[#8a8577]">Rate</div>
          <div className="font-mono text-sm font-bold text-[#f0ecdd]">{econ.tbcPerUsd} TBC / $1</div>
        </div>
      </div>

      {/* 4 ways into TBC */}
      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
        {[
          ['Convert', 'cash → TBC, instant'],
          ['Swap', 'crypto → TBC, on-chain'],
          ['Buy', 'card → crypto'],
          ['Receive', 'member / address'],
        ].map(([k, s]) => (
          <div key={k} className="rounded-xl border border-[#d4af37]/15 bg-black/20 px-2.5 py-2 text-center">
            <div className="font-bold text-[#d4af37]">{k}</div>
            <div className="text-[#8a8577]">{s}</div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-[#6a665a]">Convert ≠ Swap. Convert is in-app ledger cash ⇄ TBC (instant, no gas, no spread). Swap is on-chain DEX in your own wallet (gas, self-custody) — use it to bring outside crypto toward TBC.</p>

      {/* Convert USD ⇄ TBC (in-app, NOT swap) */}
      <div className="mt-4 rounded-2xl border border-white/8 bg-black/20 p-4">
        <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[#f0ecdd]">
          <ArrowRightLeft className="h-4 w-4 text-[#d4af37]" /> Convert · cash ⇄ TBC (in-app, instant)
          <span className="ml-auto flex overflow-hidden rounded-lg border border-[#d4af37]/25 text-[11px]">
            {[['toTBC', 'USD → TBC'], ['toUSD', 'TBC → USD']].map(([id, label]) => (
              <button key={id} onClick={() => setDirection(id)} className={`px-2.5 py-1.5 font-bold ${direction === id ? 'bg-[#d4af37]/20 text-[#d4af37]' : 'text-[#8a8577]'}`}>{label}</button>
            ))}
          </span>
        </div>
        <div className="mt-3 flex flex-col gap-2 min-[420px]:flex-row">
          <input className={input} type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={direction === 'toTBC' ? `USD (you have $${bal.usd.toLocaleString()})` : `TBC (you have ${bal.tbc.toLocaleString()})`} />
          <GoldButton disabled={busy === 'convert'} onClick={convert} className="!px-4 !py-2 !text-xs">
            {busy === 'convert' ? '…' : preview > 0 ? (direction === 'toTBC' ? `Get ${preview.toLocaleString()} TBC` : `Get $${preview.toLocaleString()}`) : 'Convert'}
          </GoldButton>
        </div>
        <p className="mt-2 text-[11px] text-[#6a665a]">Same rate both ways, no spread. TBC → USD becomes withdrawable cash. For on-chain crypto trades use Swap below in your own wallet — different rail.</p>
      </div>

      {/* Receive TBC (member transfer = in-app receive) */}

      {/* Send / Receive TBC to a member */}
      <div className="mt-3 rounded-2xl border border-white/8 bg-black/20 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#f0ecdd]"><Send className="h-4 w-4 text-[#d4af37]" /> Receive / Send TBC (member to member, in-app)</div>
        <p className="mt-1 text-xs text-[#8a8577]">Ask anyone to send TBC to your login email — lands instantly as spendable till. Buy path: card → crypto (on-ramp in Wallet → Swap desk) → swap toward TBC → convert.</p>
        <div className="mt-3 grid grid-cols-1 gap-2 min-[420px]:grid-cols-[1fr_120px_auto]">
          <input className={`${input} font-mono`} value={sendTo} onChange={(e) => setSendTo(e.target.value)} placeholder="member@email.com" />
          <input className={input} type="number" min="0" value={sendAmt} onChange={(e) => setSendAmt(e.target.value)} placeholder="TBC" />
          <GoldButton disabled={busy === 'send'} onClick={send} className="!px-4 !py-2 !text-xs">{busy === 'send' ? '…' : 'Send'}</GoldButton>
        </div>
      </div>

      {/* Personal on-chain addresses — 0x for EVM flows, tbc1… for the native chain */}
      <div className="mt-3 rounded-2xl border border-white/8 bg-black/20 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#f0ecdd]"><Wallet className="h-4 w-4 text-[#d4af37]" /> Your personal TBC addresses</div>
        <p className="mt-1 text-xs leading-relaxed text-[#8a8577]">Your own wallets — EVM for ERC-20/WTBC flows today, native tbc1… for chain staking and claims once the network is live. We never hold your keys.</p>
        {savedAddr ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="min-w-0 flex-1 truncate rounded-xl bg-white/5 px-3 py-2.5 font-mono text-xs text-[#e9e7df]">{savedAddr}</span>
            <GhostButton onClick={() => lookup(savedAddr)} className="!px-3 !py-2 !text-xs">Refresh on-chain</GhostButton>
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-2 min-[420px]:flex-row">
            <input className={`${input} font-mono`} value={addr} onChange={(e) => { setAddr(e.target.value); }} onBlur={() => lookup(addr)} placeholder="0x… (or connect)" />
            <GhostButton disabled={busy === 'addr'} onClick={() => saveAddress(addr)} className="!px-3 !py-2 !text-xs"><Plus className="h-4 w-4" /> Save</GhostButton>
            <GhostButton onClick={connectInjected} className="!px-3 !py-2 !text-xs">Connect wallet</GhostButton>
          </div>
        )}
        <div className="mt-2 text-[11px] font-bold uppercase tracking-wide text-[#8a8577]">Native · tbc1…</div>
        {savedNative ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className="min-w-0 flex-1 truncate rounded-xl bg-white/5 px-3 py-2.5 font-mono text-xs text-[#e9e7df]">{savedNative}</span>
          </div>
        ) : (
          <div className="mt-1.5 flex flex-col gap-2 min-[420px]:flex-row">
            <input className={`${input} font-mono`} value={nativeAddr} onChange={(e) => setNativeAddr(e.target.value)} placeholder="tbc1…" />
            <GhostButton disabled={busy === 'native'} onClick={() => saveNativeAddress(nativeAddr)} className="!px-3 !py-2 !text-xs"><Plus className="h-4 w-4" /> Save</GhostButton>
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
                    <div className="mt-1 text-[#8a8577]">Token not launched on {chain} yet</div>
                  ) : (
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span className="font-mono text-[#f0ecdd]">{Number(info.balance || 0).toLocaleString()} TBC{info.unchecked ? ' (RPC unreachable)' : ''}</span>
                      <button onClick={() => addToMetaMask(chain)} className="shrink-0 font-semibold text-[#d4af37] hover:underline">+ MetaMask</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Claim */}
      <div className="mt-3 rounded-2xl border border-white/8 bg-black/20 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#f0ecdd]"><Send className="h-4 w-4 text-[#d4af37]" /> Claim on-chain {econ.claimEnabled ? '' : '(opens at launch)'}</div>
        {econ.claimEnabled ? (
          <div className="mt-3 flex flex-col gap-2 min-[420px]:flex-row">
            <input className={input} type="number" min="0" value={claimAmt} onChange={(e) => setClaimAmt(e.target.value)} placeholder={`Min ${econ.claimMin} TBC`} />
            <GoldButton disabled={busy === 'claim'} onClick={claim} className="!px-4 !py-2 !text-xs">{busy === 'claim' ? '…' : 'Queue claim'}</GoldButton>
          </div>
        ) : (
          <p className="mt-2 text-xs leading-relaxed text-[#8a8577]">On-chain claims open at token launch (after audit + treasury). Credits keep full in-app value until then — spend them on challenges, signals and mentorship.</p>
        )}
      </div>

      <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-[#6a665a]">
        <Coins className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        TBC credits are platform utility credits for use inside TradingBible — not on-chain tokens, not an investment, with no profit promised. On-chain TBC will be a fixed-supply utility token for fees and rewards.
      </p>
    </Card>
  );
}
