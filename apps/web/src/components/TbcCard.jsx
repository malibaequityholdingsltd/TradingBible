// TBC wallet card for the Wallet page.
// TBC is the official in-app currency: real ledger-backed platform credits
// (NOT on-chain tokens and NOT an investment). Convert USD ⇄ TBC at the
// published rate, send member-to-member, link personal EVM/native addresses,
// see on-chain balances when launched, queue treasury claims when opened.
import React, { useCallback, useEffect, useState } from 'react';
import { ArrowUpDown, ChevronDown, Coins, Plus, Send, Wallet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n';
import pb from '@/lib/pocketbaseClient';
import { txt, numOrNull } from '@/lib/safeRender';
import { API_SERVER_URL } from '@/lib/apiServerClient';
import { TBC_LOGO_URL } from '@/lib/tbc';
import { TbcMoney, TbcSign } from '@/components/TbcSign';
import { fmtMoney } from '@/lib/mockData';

function headers() {
  return { Authorization: `Bearer ${pb.authStore.token}`, 'Content-Type': 'application/json' };
}

export default function TbcCard({ onChanged }) {
  const { toast } = useToast();
  const { t } = useI18n();
  const [econ, setEcon] = useState({ tbcPerUsd: 0.3077, usdPerKwd: 3.25, peg: '1 TBC = 1 KWD', claimEnabled: false, claimMin: 100 });
  const [bal, setBal] = useState({ tbc: 0, usd: 0 });
  const [amount, setAmount] = useState('');
  const [direction, setDirection] = useState('toTBC');
  const [claimAmt, setClaimAmt] = useState('');
  const [sendTo, setSendTo] = useState('');
  const [sendAmt, setSendAmt] = useState('');
  const [addr, setAddr] = useState('');
  const [savedAddr, setSavedAddr] = useState('');
  const [nativeAddr, setNativeAddr] = useState('');
  const [savedNative, setSavedNative] = useState('');
  const [onchain, setOnchain] = useState(null);
  const [busy, setBusy] = useState('');
  const [openRail, setOpenRail] = useState(null);

  const toggleRail = (id) => setOpenRail((current) => (current === id ? null : id));

  useEffect(() => {
    const open = (event) => {
      const id = event?.detail;
      if (['convert', 'receive'].includes(id)) setOpenRail(id);
    };
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
      // Guard: 1 TBC = 1 KWD (≈0.3077 TBC/$1). Reject a 1:1 rate from stale config.
      const rate = Number(e?.tbcPerUsd);
      if (rate > 0.15 && rate < 0.6) setEcon(e);
      else if (Number(e?.usdPerKwd) >= 2 && Number(e?.usdPerKwd) <= 5) {
        setEcon({ ...e, tbcPerUsd: 1 / Number(e.usdPerKwd), usdPerKwd: Number(e.usdPerKwd) });
      }
    } catch { /* display defaults */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  const lookup = useCallback(async (address) => {
    if (!/^0x[0-9a-fA-F]{40}$/.test(address || '')) { setOnchain(null); return; }
    try {
      const data = await fetch(`${API_SERVER_URL}/tbc/onchain/${address}`, { headers: headers() }).then((r) => r.json()).catch(() => null);
      if (data?.chains) {
        setOnchain(data);
        if (data.saved) setSavedAddr(txt(data.saved, ''));
        if (data.savedNative) setSavedNative(txt(data.savedNative, ''));
      }
    } catch { /* ignore */ }
  }, []);

  const convert = async () => {
    const value = Number(amount);
    if (!(value > 0)) {
      toast({ variant: 'destructive', title: direction === 'toTBC' ? t('tbc.enterUsd') : t('tbc.enterTbc') });
      return;
    }
    setBusy('convert');
    try {
      const res = await fetch(`${API_SERVER_URL}/tbc/convert`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ direction, usdAmount: direction === 'toTBC' ? value : undefined, amount: direction === 'toUSD' ? value : undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t('tbc.convFail'));
      toast({
        title: direction === 'toTBC' ? t('tbc.convToastTo', data.converted) : t('tbc.convToastFrom', data.converted),
        description: t('tbc.convRateToast', data.converted),
      });
      setAmount('');
      setBal(data.balances);
      onChanged?.();
    } catch (error) {
      toast({ variant: 'destructive', title: t('tbc.convFail'), description: error.message });
    } finally {
      setBusy('');
    }
  };

  const send = async () => {
    const value = Number(sendAmt);
    if (!(value > 0)) { toast({ variant: 'destructive', title: t('tbc.enterTbcAmt') }); return; }
    if (!sendTo.trim()) { toast({ variant: 'destructive', title: t('tbc.enterMember') }); return; }
    if (!window.confirm(t('tbc.confirmSend', { n: value, who: sendTo.trim() }))) return;
    setBusy('send');
    try {
      const res = await fetch(`${API_SERVER_URL}/tbc/send`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ toEmail: sendTo.trim(), amount: value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t('tbc.sendFailToast'));
      toast({ title: t('tbc.sentToast', data.sent) });
      setSendAmt('');
      setSendTo('');
      setBal(data.balances);
      onChanged?.();
    } catch (error) {
      toast({ variant: 'destructive', title: t('tbc.sendFailToast'), description: error.message });
    } finally {
      setBusy('');
    }
  };

  const saveAddress = async (address) => {
    if (!/^0x[0-9a-fA-F]{40}$/.test(address || '')) {
      toast({ variant: 'destructive', title: t('tbc.badAddr') });
      return;
    }
    setBusy('addr');
    try {
      const res = await fetch(`${API_SERVER_URL}/tbc/address`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ address }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || data.error || t('tbc.saveFail'));
      setSavedAddr(address);
      toast({ title: t('tbc.addrSaved'), description: t('tbc.addrSavedSub') });
      await lookup(address);
    } catch (error) {
      toast({ variant: 'destructive', title: t('tbc.saveFail'), description: error.message });
    } finally {
      setBusy('');
    }
  };

  const saveNativeAddress = async (value) => {
    const { isTbcAddress } = await import('@/lib/bech32');
    if (!isTbcAddress(value || '')) {
      toast({ variant: 'destructive', title: t('tbc.badNative') });
      return;
    }
    setBusy('native');
    try {
      const res = await fetch(`${API_SERVER_URL}/tbc/address`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ nativeAddress: value.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || data.error || t('tbc.saveFail'));
      setSavedNative(value.trim());
      toast({ title: t('tbc.nativeSaved'), description: t('tbc.nativeSavedSub') });
    } catch (error) {
      toast({ variant: 'destructive', title: t('tbc.saveFail'), description: error.message });
    } finally {
      setBusy('');
    }
  };

  const connectInjected = async () => {
    if (!window.ethereum) {
      toast({ variant: 'destructive', title: t('tbc.noWallet'), description: t('tbc.installWallet') });
      return;
    }
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts?.[0]) { setAddr(accounts[0]); await saveAddress(accounts[0]); }
    } catch (error) {
      toast({ variant: 'destructive', title: t('tbc.connectFail'), description: error.message });
    }
  };

  const addToMetaMask = async (chain) => {
    const info = onchain?.chains?.[chain];
    if (!info?.contract || !window.ethereum) return;
    try {
      await window.ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: info.contract,
            symbol: 'TBC',
            decimals: 18,
            image: TBC_LOGO_URL.startsWith('http') ? TBC_LOGO_URL : `${window.location.origin}${TBC_LOGO_URL}`,
          },
        },
      });
    } catch (error) {
      toast({ variant: 'destructive', title: t('tbc.addTokenFail'), description: error.message });
    }
  };

  const claim = async () => {
    const value = Number(claimAmt);
    if (!(value > 0)) { toast({ variant: 'destructive', title: t('tbc.enterTbcAmt') }); return; }
    setBusy('claim');
    try {
      const res = await fetch(`${API_SERVER_URL}/tbc/claim`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ amount: value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || data.error || t('tbc.claimFail'));
      toast({ title: t('tbc.claimQueued') });
      setClaimAmt('');
      await load();
      onChanged?.();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: error.message === 'claim_unavailable' ? t('tbc.claimLaunch') : t('tbc.claimFail'),
        description: error.message,
      });
    } finally {
      setBusy('');
    }
  };

  const KWD_RATE = 1 / 3.25;
  const rate = numOrNull(econ.tbcPerUsd) ?? KWD_RATE;
  const kwdUsd = rate > 0 ? 1 / rate : 3.25;
  const preview = direction === 'toTBC'
    ? Math.round((Number(amount) || 0) * rate * 100) / 100
    : Math.round((Number(amount) || 0) / rate * 100) / 100;
  const fromSym = direction === 'toTBC' ? 'USD' : 'TBC';
  const toSym = direction === 'toTBC' ? 'TBC' : 'USD';
  const fromBal = direction === 'toTBC' ? fmtMoney(bal.usd) : `${Number(bal.tbc || 0).toLocaleString()} TBC`;
  const tbcUsd = rate > 0 ? Number(bal.tbc || 0) / rate : 0;

  return (
    <section className="wv-card wv-tbc-card" aria-labelledby="tbc-credit-title">
      <div className="wv-card-head">
        <div className="wv-asset-identity">
          <span className="wv-asset-icon wv-asset-icon--tbc">
            <img src={TBC_LOGO_URL} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          </span>
          <div>
            <h2 id="tbc-credit-title" className="wv-section-title">{t('tbc.cardEyebrow', null, 'TBC · Official in-app currency')}</h2>
            <p className="wv-section-sub">{t('tbc.cardSub', null, '1 TBC = 1 KWD · spendable across TradingBible')}</p>
          </div>
        </div>
        <span className="wv-tbc-rate">1 TBC = 1 KWD · {fmtMoney(kwdUsd)}</span>
      </div>

      <div className="wv-card-body">
        <div className="wv-tbc-balance-row">
          <div>
            <div className="wv-label">Available TBC</div>
            <div className="wv-tbc-balance"><TbcMoney amount={bal.tbc} /></div>
            <div className="wv-section-sub">≈ {fmtMoney(tbcUsd)} at the published KWD rate</div>
          </div>
          <div className="wv-tbc-actions">
            <button type="button" className={`wv-btn wv-btn--sm ${openRail === 'convert' ? 'wv-btn--primary' : 'wv-btn--secondary'}`} onClick={() => toggleRail('convert')}>
              <ArrowUpDown className="h-3.5 w-3.5" /> Convert
            </button>
            <button type="button" className={`wv-btn wv-btn--sm ${openRail === 'receive' ? 'wv-btn--primary' : 'wv-btn--secondary'}`} onClick={() => toggleRail('receive')}>
              <Send className="h-3.5 w-3.5" /> Send
            </button>
          </div>
        </div>

        {openRail === 'convert' && (
          <div className="wv-convert-box">
            <div className="wv-convert-tabs" role="tablist" aria-label="Conversion direction">
              <button type="button" role="tab" aria-selected={direction === 'toTBC'} className={direction === 'toTBC' ? 'is-active' : ''} onClick={() => { setDirection('toTBC'); setAmount(''); }}>USD → TBC</button>
              <button type="button" role="tab" aria-selected={direction === 'toUSD'} className={direction === 'toUSD' ? 'is-active' : ''} onClick={() => { setDirection('toUSD'); setAmount(''); }}>TBC → USD</button>
            </div>
            <div className="wv-convert-fields">
              <div className="wv-convert-field">
                <div className="wv-convert-top"><span>You pay</span><span>{t('tbc.avail')}: {fromBal}</span></div>
                <div className="wv-convert-input">
                  <input type="number" min="0" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" aria-label={`Amount in ${fromSym}`} />
                  <span>{fromSym}</span>
                </div>
              </div>
              <button
                type="button"
                className="wv-convert-swap"
                aria-label="Flip conversion direction"
                onClick={() => { setDirection(direction === 'toTBC' ? 'toUSD' : 'toTBC'); setAmount(''); }}
              >
                <ArrowUpDown />
              </button>
              <div className="wv-convert-field">
                <div className="wv-convert-top"><span>You receive</span><span>At published rate</span></div>
                <div className="wv-convert-input">
                  <div style={{ flex: 1, minWidth: 0, color: 'var(--at-ink)', fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 17, fontWeight: 600 }}>
                    {preview > 0 ? preview.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '0.00'}
                  </div>
                  <span>{toSym}</span>
                </div>
              </div>
            </div>
            <div className="wv-summary">
              <div className="wv-summary-row"><span>Rate</span><strong>1 TBC = 1 KWD ({fmtMoney(kwdUsd)})</strong></div>
              <div className="wv-summary-row"><span>Conversion fee</span><strong>None</strong></div>
              <div className="wv-summary-row"><span>Settlement</span><strong>Instant</strong></div>
            </div>
            <button type="button" className="wv-btn wv-btn--primary wv-btn--block" disabled={busy === 'convert'} onClick={convert}>
              {busy === 'convert' ? '…' : preview > 0 ? t('tbc.convCta', { v: preview.toLocaleString(), sym: toSym }) : t('wal.convertBtn')}
            </button>
            <p className="wv-fine" style={{ marginTop: 8, textAlign: 'center' }}>{t('tbc.convNote')}</p>
          </div>
        )}

        {openRail === 'receive' && (
          <div className="wv-convert-box">
            <div className="wv-section-title">Send TBC to a member</div>
            <p className="wv-section-sub">Instant member-to-member settlement. Ask the recipient for the email or username on their account.</p>
            <div className="wv-inline-form">
              <div className="wv-field-group">
                <label className="wv-field-label" htmlFor="tbc-send-to">Recipient</label>
                <input id="tbc-send-to" className="wv-field" value={sendTo} onChange={(e) => setSendTo(e.target.value)} placeholder="member@email.com" autoComplete="off" />
              </div>
              <div className="wv-field-group">
                <label className="wv-field-label" htmlFor="tbc-send-amount">Amount</label>
                <input id="tbc-send-amount" className="wv-field wv-field--amount" type="number" min="0" inputMode="decimal" value={sendAmt} onChange={(e) => setSendAmt(e.target.value)} placeholder="TBC" style={{ paddingLeft: 12 }} />
              </div>
              <button type="button" className="wv-btn wv-btn--primary" disabled={busy === 'send'} onClick={send}>{busy === 'send' ? '…' : 'Send'}</button>
            </div>
            <p className="wv-fine" style={{ marginTop: 8 }}>Transfers are ledger-final. Check the recipient before confirming.</p>
            <button type="button" className="wv-btn wv-btn--ghost wv-btn--sm" style={{ marginTop: 5, paddingLeft: 0 }} onClick={() => setOpenRail('addresses')}>
              Receive TBC · manage addresses <ChevronDown className="h-3 w-3" />
            </button>
          </div>
        )}

        {openRail === 'addresses' && (
          <div className="wv-convert-box">
            <div className="wv-section-title">Personal addresses</div>
            <p className="wv-section-sub">{t('tbc.addrSub')}</p>

            <div className="wv-address-box">
              <div className="wv-field-label" style={{ marginBottom: 6 }}>EVM address</div>
              {savedAddr ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 7 }}>
                  <span className="wv-address-value" style={{ flex: '1 1 220px' }}>{savedAddr}</span>
                  <button type="button" className="wv-btn wv-btn--secondary wv-btn--sm" onClick={() => lookup(savedAddr)}>{t('tbc.refreshChain')}</button>
                </div>
              ) : (
                <div className="wv-inline-form" style={{ marginTop: 0, paddingTop: 0, borderTop: 0 }}>
                  <input className="wv-field" value={addr} onChange={(e) => setAddr(e.target.value)} onBlur={() => lookup(addr)} placeholder="0x…" autoComplete="off" aria-label="EVM address" />
                  <button type="button" className="wv-btn wv-btn--secondary" disabled={busy === 'addr'} onClick={() => saveAddress(addr)}><Plus /> Save</button>
                  <button type="button" className="wv-btn wv-btn--ghost" onClick={connectInjected}>{t('tbc.connectWallet')}</button>
                </div>
              )}
            </div>

            <div className="wv-address-box">
              <div className="wv-field-label" style={{ marginBottom: 6 }}>{t('tbc.nativeLabel')}</div>
              {savedNative ? (
                <span className="wv-address-value" style={{ display: 'block' }}>{savedNative}</span>
              ) : (
                <div className="wv-inline-form" style={{ marginTop: 0, paddingTop: 0, borderTop: 0 }}>
                  <input className="wv-field" value={nativeAddr} onChange={(e) => setNativeAddr(e.target.value)} placeholder="tbc1…" autoComplete="off" aria-label="Native TBC address" />
                  <button type="button" className="wv-btn wv-btn--secondary" disabled={busy === 'native'} onClick={() => saveNativeAddress(nativeAddr)}><Plus /> Save</button>
                </div>
              )}
            </div>

            {onchain && (
              <div className="wv-onchain-grid">
                {['ethereum', 'base'].map((chain) => {
                  const info = onchain.chains?.[chain];
                  if (!info) return null;
                  return (
                    <div key={chain} className="wv-onchain-card">
                      <div className="wv-field-label">{chain}</div>
                      {!info.deployed ? (
                        <div className="wv-fine" style={{ marginTop: 3 }}>{t('tbc.notLaunched', { chain })}</div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 3 }}>
                          <strong>{(numOrNull(info.balance) ?? 0).toLocaleString()} TBC{info.unchecked ? t('tbc.rpcDown') : ''}</strong>
                          <button type="button" className="wv-link" onClick={() => addToMetaMask(chain)}>+ MetaMask</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <p className="wv-fine" style={{ marginTop: 9 }}>{t('tbc.addrSub')}</p>
          </div>
        )}

        {openRail === 'claim' && (
          <div className="wv-convert-box">
            <div className="wv-section-title">TBC claims</div>
            {econ.claimEnabled ? (
              <>
                <p className="wv-section-sub">Queue a treasury claim. Tokens remain off-chain until the launch gate is approved.</p>
                <div className="wv-inline-form">
                  <div className="wv-field-group">
                    <label className="wv-field-label" htmlFor="tbc-claim-amount">Amount</label>
                    <input id="tbc-claim-amount" className="wv-field wv-field--amount" type="number" min="0" value={claimAmt} onChange={(e) => setClaimAmt(e.target.value)} placeholder={t('tbc.claimMin', { n: econ.claimMin })} inputMode="decimal" style={{ paddingLeft: 12 }} />
                  </div>
                  <span />
                  <button type="button" className="wv-btn wv-btn--primary" disabled={busy === 'claim'} onClick={claim}>{busy === 'claim' ? '…' : t('tbc.queueClaim')}</button>
                </div>
              </>
            ) : (
              <p className="wv-fine" style={{ marginTop: 7 }}>{t('tbc.claimSub')}</p>
            )}
          </div>
        )}

        <div className="wv-tbc-foot">
          <button type="button" onClick={() => toggleRail('addresses')} aria-expanded={openRail === 'addresses'}>
            <Wallet className="h-3 w-3" /> On-chain addresses
            <ChevronDown className="h-3 w-3" style={{ transform: openRail === 'addresses' ? 'rotate(180deg)' : 'none', transition: 'transform .15s ease' }} />
          </button>
          <button type="button" onClick={() => toggleRail('claim')} aria-expanded={openRail === 'claim'}>
            <Coins className="h-3 w-3" /> Claims
            <ChevronDown className="h-3 w-3" style={{ transform: openRail === 'claim' ? 'rotate(180deg)' : 'none', transition: 'transform .15s ease' }} />
          </button>
          <span><TbcSign /> {t('tbc.disclaimer')}</span>
        </div>
      </div>
    </section>
  );
}
