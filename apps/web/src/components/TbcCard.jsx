// TBC wallet card for the Wallet page.
// TBC is the official in-app currency: real ledger-backed platform credits
// (NOT on-chain tokens and NOT an investment). Convert USD ⇄ TBC at the
// published rate and send member-to-member. The proposed on-chain token and
// its launch gates live on the public /tbc pages, not in this wallet.
import React, { useCallback, useEffect, useState } from 'react';
import { ArrowUpDown, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n';
import pb from '@/lib/pocketbaseClient';
import { numOrNull } from '@/lib/safeRender';
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
  const [econ, setEcon] = useState({ tbcPerUsd: 0.3077, usdPerKwd: 3.25, peg: '1 TBC = 1 KWD' });
  const [bal, setBal] = useState({ tbc: 0, usd: 0 });
  const [amount, setAmount] = useState('');
  const [direction, setDirection] = useState('toTBC');
  const [sendTo, setSendTo] = useState('');
  const [sendAmt, setSendAmt] = useState('');
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
      // Guard: 1 TBC = 1 KWD (≈0.3077 TBC/$1). Reject a 1:1 rate from stale config.
      const rate = Number(e?.tbcPerUsd);
      if (rate > 0.15 && rate < 0.6) setEcon(e);
      else if (Number(e?.usdPerKwd) >= 2 && Number(e?.usdPerKwd) <= 5) {
        setEcon({ ...e, tbcPerUsd: 1 / Number(e.usdPerKwd), usdPerKwd: Number(e.usdPerKwd) });
      }
    } catch { /* display defaults */ }
  }, []);

  useEffect(() => { load(); }, [load]);

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
          </div>
        )}

        <div className="wv-tbc-foot">
          <span><TbcSign /> {t('tbc.disclaimer')}</span>
        </div>
      </div>
    </section>
  );
}
