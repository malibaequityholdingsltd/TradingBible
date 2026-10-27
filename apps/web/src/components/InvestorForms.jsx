import React, { useState } from 'react';
import { ArrowRight, Bot, CheckCircle2, Loader2, Mail, Send, ShieldCheck, Sparkles } from 'lucide-react';
import { AtBadge, AtButton, AtPanel } from '@/components/AtelierUI';
import { investorFetch } from '@/lib/investorApi';
import { useAuth } from '@/hooks/useAuth';
import { TB_ISSUER } from '@/lib/investorRelations';

export function InvestorSubscribeForm({ compact = false }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const payload = await investorFetch('/subscribe', {
        method: 'POST',
        body: { email, name, consent, source: 'investor-site' },
      });
      setResult(payload);
      setEmail('');
      setName('');
      setConsent(false);
    } catch (err) {
      setError(err.message || 'Subscription failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="ir-form-grid">
      {!compact && (
        <div className="ir-field">
          <label htmlFor="ir-sub-name">Name (optional)</label>
          <input id="ir-sub-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Your name" />
        </div>
      )}
      <div className={`ir-field ${compact ? 'ir-field--full' : ''}`}>
        <label htmlFor="ir-sub-email">Email address</label>
        <input id="ir-sub-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" />
      </div>
      <div className="ir-field ir-field--full">
        <label className="ir-check">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>I consent to receive investor relations updates from TradingBible. I understand this is an information subscription, not a shareholder relationship or an offer of securities. I can unsubscribe at any time.</span>
        </label>
      </div>
      <div className="ir-field ir-field--full ir-actions">
        <AtButton type="submit" variant="gold" size="sm" icon={busy ? Loader2 : Mail} disabled={busy}>
          {busy ? 'Recording…' : 'Subscribe to updates'}
        </AtButton>
        <span className="ir-field-note">Confirmation email required before any update is sent.</span>
      </div>
      {result && (
        <div className="ir-field ir-field--full">
          <div className="at-alert at-alert--green !px-3 !py-2.5 !text-[10px]">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--at-green)]" />
            <span>{result.message}</span>
          </div>
        </div>
      )}
      {error && (
        <div className="ir-field ir-field--full">
          <div className="at-alert at-alert--red !px-3 !py-2.5 !text-[10px]">{error}</div>
        </div>
      )}
    </form>
  );
}

export function InvestorContactForm() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    organization: '',
    inquiryType: 'General',
    message: '',
    website: '',
  });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const update = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setSent(false);
    try {
      await investorFetch('/contact', { method: 'POST', body: form });
      setSent(true);
      setForm((prev) => ({ ...prev, message: '', website: '' }));
    } catch (err) {
      setError(err.message || 'Your message could not be sent.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="ir-form-grid">
      <div className="ir-field">
        <label htmlFor="ir-contact-name">Name</label>
        <input id="ir-contact-name" required value={form.name} onChange={update('name')} autoComplete="name" />
      </div>
      <div className="ir-field">
        <label htmlFor="ir-contact-email">Email</label>
        <input id="ir-contact-email" type="email" required value={form.email} onChange={update('email')} autoComplete="email" />
      </div>
      <div className="ir-field">
        <label htmlFor="ir-contact-org">Organization (optional)</label>
        <input id="ir-contact-org" value={form.organization} onChange={update('organization')} autoComplete="organization" />
      </div>
      <div className="ir-field">
        <label htmlFor="ir-contact-type">Inquiry type</label>
        <select id="ir-contact-type" value={form.inquiryType} onChange={update('inquiryType')}>
          {['General', 'Shareholder access', 'Financial reporting', 'IPO readiness', 'Media', 'Compliance', 'Technical support'].map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>
      <div className="ir-field ir-field--full">
        <label htmlFor="ir-contact-message">Message</label>
        <textarea id="ir-contact-message" required value={form.message} onChange={update('message')} placeholder="Tell us what you need. Do not include passwords, private keys, original signed documents or full bank details." />
      </div>
      <div className="ir-field ir-field--full" aria-hidden style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
        <label htmlFor="ir-contact-website">Website</label>
        <input id="ir-contact-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={update('website')} />
      </div>
      <div className="ir-field ir-field--full ir-actions">
        <AtButton type="submit" variant="gold" size="sm" icon={busy ? Loader2 : Send} disabled={busy}>
          {busy ? 'Sending…' : 'Send to investor relations'}
        </AtButton>
        <span className="ir-field-note">Messages are stored for IR review and copied to {TB_ISSUER.irEmail}.</span>
      </div>
      {sent && (
        <div className="ir-field ir-field--full">
          <div className="at-alert at-alert--green !px-3 !py-2.5 !text-[10px]">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--at-green)]" />
            Your message has been recorded. Investor relations will review it.
          </div>
        </div>
      )}
      {error && <div className="ir-field ir-field--full"><div className="at-alert at-alert--red !px-3 !py-2.5 !text-[10px]">{error}</div></div>}
    </form>
  );
}

const SUGGESTIONS = [
  'Is TB publicly traded?',
  'What is the difference between TB and TBC?',
  'How far along is IPO preparation?',
  'Where can I find approved financial reports?',
];

export function InvestorAssistant({ compact = false }) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState('');

  async function ask(question) {
    const text = String(question || message).trim();
    if (!text) return;
    setBusy(true);
    setError('');
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setMessage('');
    try {
      const result = await investorFetch('/assistant', { method: 'POST', body: { message: text } });
      setMessages((prev) => [...prev, {
        role: 'assistant',
        text: result.answer,
        sources: result.sources || [],
        aiAvailable: result.aiAvailable,
      }]);
    } catch (err) {
      setError(err.message || 'The investor assistant is temporarily unavailable.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AtPanel
      eyebrow="Grounded explainer"
      title="Ask the investor relations assistant"
      sub="Answers are limited to approved public information. It cannot quote a price, show a holding, recommend an investment or execute a transaction."
      action={<AtBadge tone="gold"><Sparkles className="h-3 w-3" /> Public sources</AtBadge>}
      className={compact ? 'ir-assistant ir-assistant--compact' : 'ir-assistant'}
    >
      <div className="ir-sep !mt-0" />
      <div className="ir-chip-row mb-3">
        {SUGGESTIONS.map((item) => (
          <button key={item} type="button" onClick={() => ask(item)} disabled={busy} className="at-chip at-chip--plain text-left hover:border-[var(--at-line-strong)]">
            {item}
          </button>
        ))}
      </div>
      <div className="grid gap-3" aria-live="polite">
        {messages.length === 0 && (
          <div className="ir-card ir-card--soft !p-4">
            <div className="flex items-start gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[var(--at-line)] bg-[var(--at-gold-soft)]"><Bot className="h-4 w-4 text-[var(--at-gold)]" /></span>
              <div>
                <p className="ir-card-title">I can explain the public record.</p>
                <p className="ir-card-text">Try a question about listing status, TB vs TBC, IPO readiness, approved reports or shareholder access. I will say when something is not published.</p>
              </div>
            </div>
          </div>
        )}
        {messages.map((item, index) => (
          <div key={`${item.role}-${index}`} className={`max-w-[96%] rounded-2xl border px-3.5 py-3 text-[11px] leading-relaxed ${item.role === 'user' ? 'ml-auto border-[var(--at-line)] bg-[var(--at-gold-soft)] text-[var(--at-ink)]' : 'border-[var(--at-line-soft)] bg-[var(--at-soft)] text-[var(--at-ink-2)]'}`}>
            <div className="mb-1 font-mono text-[8px] font-bold uppercase tracking-[0.14em] text-[var(--at-mut)]">{item.role === 'user' ? 'You' : 'IR assistant'}</div>
            <p className="whitespace-pre-wrap">{item.text}</p>
            {item.role === 'assistant' && item.sources?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2 border-t border-[var(--at-line-soft)] pt-2">
                {item.sources.slice(0, 4).map((source, i) => (
                  <a key={`${source.title}-${i}`} href={source.url} className="text-[9px] font-semibold text-[var(--at-gold)] hover:underline">{source.title}</a>
                ))}
              </div>
            )}
          </div>
        ))}
        {busy && (
          <div className="flex items-center gap-2 text-[10px] text-[var(--at-mut)]"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking approved public sources…</div>
        )}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); ask(); }} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <div className="ir-field flex-1">
          <label htmlFor="ir-assistant-message" className="sr-only">Question</label>
          <input id="ir-assistant-message" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1200} placeholder="Ask about listing status, reporting or shareholder access…" />
        </div>
        <AtButton type="submit" variant="gold" size="sm" icon={Send} disabled={busy || !message.trim()}>Ask</AtButton>
      </form>
      {error && <div className="at-alert at-alert--red mt-3 !px-3 !py-2.5 !text-[10px]">{error}</div>}
      <div className="ir-security-note mt-3">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--at-amber)]" />
        <span>Never send passwords, private keys, bank details or confidential shareholder records through this assistant. It is not a channel for material non-public information.</span>
      </div>
    </AtPanel>
  );
}

export function InvestorCtaStrip() {
  return (
    <section className="ir-cta-strip">
      <div>
        <div className="ir-eyebrow mb-2">Investor updates</div>
        <h2>Receive approved disclosures, not speculation.</h2>
        <p>Subscribe for corporate announcements, published reports and IPO-readiness updates. Every message is tied to an approved public source. No price alerts, no trading signals and no offers.</p>
      </div>
      <AtButton to="/investors/contact" variant="gold" size="md" iconRight={ArrowRight}>Open investor centre</AtButton>
    </section>
  );
}
