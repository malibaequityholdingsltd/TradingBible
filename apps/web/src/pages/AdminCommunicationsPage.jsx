import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check, ChevronRight, Download, FileText, Loader2, Lock, Mail, MessageSquare,
  RefreshCw, Search, Send, ShieldCheck, Smartphone, TriangleAlert,
} from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import {
  AtAlert, AtBadge, AtButton, AtEmpty, AtPageBar, AtPanel,
} from '@/components/AtelierUI';
import pb from '@/lib/pocketbaseClient';
import { API_SERVER_URL } from '@/lib/apiServerClient';

const CHANNELS = [
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'sms', label: 'SMS', icon: MessageSquare },
  { id: 'in-app', label: 'In-app', icon: Smartphone },
];

const IMPLEMENTATION_TONE = {
  'brand-shell': 'green',
  template: 'blue',
  restricted: 'amber',
  'counsel-gated': 'red',
};

const COMPLIANCE_TONE = {
  transactional: 'muted',
  security: 'blue',
  account: 'amber',
  marketing: 'gold',
  'securities-private': 'red',
  'securities-cf': 'red',
  internal: 'muted',
};

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export default function AdminCommunicationsPage() {
  const [data, setData] = useState(null);
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [channel, setChannel] = useState('email');
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const token = () => pb.authStore?.token || '';

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const auth = token();
      if (!auth) throw new Error('Admin session unavailable. Sign in again.');
      const res = await fetch(`${API_SERVER_URL}/admin/communications/templates`, {
        headers: { Authorization: `Bearer ${auth}` },
      });
      if (!res.ok) throw new Error(res.status === 403 ? 'Admin access required.' : `Template registry unavailable (${res.status})`);
      const payload = await res.json();
      setData(payload);
      setSelectedId((current) => {
        if (current && payload.templates?.some((item) => item.id === current)) return current;
        return payload.templates?.[0]?.id || '';
      });
    } catch (err) {
      setError(err?.message || 'Template registry unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const selected = useMemo(
    () => data?.templates?.find((item) => item.id === selectedId) || null,
    [data, selectedId],
  );

  const categories = useMemo(() => data?.categories || [], [data]);
  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map((item) => [item.id, item])),
    [categories],
  );

  const counts = useMemo(() => {
    const next = { all: data?.templates?.length || 0 };
    for (const item of categories) next[item.id] = (data?.templates || []).filter((tpl) => tpl.category === item.id).length;
    return next;
  }, [data, categories]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.templates || []).filter((item) => {
      if (category !== 'all' && item.category !== category) return false;
      if (!q) return true;
      return `${item.name} ${item.id} ${item.description} ${item.subject} ${item.audience}`.toLowerCase().includes(q);
    });
  }, [data, category, query]);

  const loadPreview = useCallback(async (id, nextChannel) => {
    if (!id) return;
    setPreviewLoading(true);
    setError('');
    setNotice('');
    try {
      const res = await fetch(`${API_SERVER_URL}/admin/communications/templates/${encodeURIComponent(id)}/preview`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ channel: nextChannel }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.message || `Preview failed (${res.status})`);
      setPreview(payload.rendered || null);
    } catch (err) {
      setPreview(null);
      setError(err?.message || 'Preview failed');
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selected) { setPreview(null); return; }
    const available = CHANNELS.filter((item) => selected.channels?.includes(item.id));
    const nextChannel = available.some((item) => item.id === channel) ? channel : (available[0]?.id || 'email');
    if (nextChannel !== channel) setChannel(nextChannel);
    loadPreview(selected.id, nextChannel);
  }, [selected?.id, channel, loadPreview]);

  const copy = async (text, label) => {
    try {
      await navigator.clipboard.writeText(String(text || ''));
      setNotice(`${label} copied.`);
    } catch {
      window.alert(`Could not copy ${label.toLowerCase()}.`);
    }
  };

  const testSend = async () => {
    if (!selected) return;
    setBusy('test');
    setError('');
    setNotice('');
    try {
      const res = await fetch(`${API_SERVER_URL}/admin/communications/templates/${encodeURIComponent(selected.id)}/test-send`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.message || `Test send failed (${res.status})`);
      setNotice(`Test sent to ${payload.to}. The message was marked ADMIN TEST and was not sent to a member or investor.`);
    } catch (err) {
      setError(err?.message || 'Test send failed');
    } finally {
      setBusy('');
    }
  };

  const downloadPack = async () => {
    setBusy('pack');
    setError('');
    setNotice('');
    try {
      const res = await fetch(`${API_SERVER_URL}/admin/communications/templates.md`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) throw new Error(`Download failed (${res.status})`);
      const blob = await res.blob();
      downloadBlob(blob, 'TradingBible-Communications-Pack-2026-11.md');
      setNotice('Communications pack downloaded. It contains every email, SMS and in-app template in Markdown.');
    } catch (err) {
      setError(err?.message || 'Download failed');
    } finally {
      setBusy('');
    }
  };

  return (
    <AdminLayout title="Brand Communications">
      <div className="at-page at-scope at-enter">
        <AtPageBar
          meta={[
            `${counts.all || '—'} templates`,
            `${categories.length || '—'} categories`,
            'Email · SMS · in-app',
            'Admin test-send only',
          ]}
          actions={(
            <>
              <AtButton to="/admin/fundraising-documents" variant="quiet" icon={Lock}>Fundraising packet</AtButton>
              <AtButton onClick={load} variant="quiet" icon={loading ? Loader2 : RefreshCw} disabled={loading}>Refresh</AtButton>
              <AtButton onClick={downloadPack} disabled={busy === 'pack'} variant="gold" icon={busy === 'pack' ? Loader2 : Download}>
                {busy === 'pack' ? 'Preparing…' : 'Download pack'}
              </AtButton>
            </>
          )}
        />

        <div className="mt-3 space-y-3">
          <AtAlert icon={ShieldCheck} tone="green">
            <b className="text-[var(--at-ink)]">One brand system.</b> Every email uses the dark-and-gold TradingBible shell with the company logo,
            company name, website, support address and an absolute logo URL. Transactional, security, billing, platform, investor, fundraising and
            internal templates live in one registry, so the company does not drift into inconsistent copy or missing footers.
          </AtAlert>
          <AtAlert icon={TriangleAlert} tone="amber">
            <b className="text-[var(--at-ink)]">Test-send only.</b> The only delivery path in this console sends to the signed-in administrator.
            There is no bulk sender, no member list and no investor list here. Fundraising templates are restricted until counsel clears them.
            SMS is design-only until a provider, consent records and opt-out handling are in place.
          </AtAlert>
          {data && !data.postalAddressConfigured && (
            <AtAlert icon={TriangleAlert} tone="amber">
              <b className="text-[var(--at-ink)]">Postal address is not configured.</b> Marketing templates are blocked from a real commercial send
              until <span className="font-mono">COMPANY_POSTAL_ADDRESS</span> is set. Transactional and security templates do not require it for preview.
            </AtAlert>
          )}
        </div>

        <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-[var(--at-line-soft)] bg-[var(--at-card-bg)] p-3 xl:flex-row xl:items-center">
          <div className="at-segmented shrink-0 overflow-x-auto">
            <button type="button" onClick={() => setCategory('all')} className={category === 'all' ? 'is-active' : ''}>
              All
              <span className="font-mono text-[9px] opacity-70">{counts.all || 0}</span>
            </button>
            {categories.map((item) => (
              <button key={item.id} type="button" onClick={() => setCategory(item.id)} className={category === item.id ? 'is-active' : ''}>
                {item.label}
                <span className="font-mono text-[9px] opacity-70">{counts[item.id] || 0}</span>
              </button>
            ))}
          </div>
          <div className="relative min-w-0 flex-1 xl:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--at-mut-2)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search template, audience, subject…"
              className="at-input !pl-9"
            />
          </div>
          <div className="flex items-center gap-1.5 xl:ml-auto">
            <AtBadge tone="green">Branded shell</AtBadge>
            <AtBadge tone={data?.smsConfigured ? 'green' : 'amber'}>{data?.smsConfigured ? 'SMS configured' : 'SMS design-only'}</AtBadge>
            <AtBadge tone="muted">No bulk send</AtBadge>
          </div>
        </div>

        {error && <div className="mt-4"><AtAlert icon={TriangleAlert} tone="red">{error}</AtAlert></div>}
        {notice && <div className="mt-4"><AtAlert icon={Check} tone="green">{notice}</AtAlert></div>}

        {loading && !data ? (
          <div className="mt-5 grid gap-3 lg:grid-cols-[340px_1fr]">
            <div className="at-card h-[520px] animate-pulse bg-[var(--at-soft)]" />
            <div className="at-card h-[520px] animate-pulse bg-[var(--at-soft)]" />
          </div>
        ) : !data?.templates?.length ? (
          <div className="mt-5 at-card"><AtEmpty icon={Mail} title="No templates found" sub="The communication registry did not return any templates." /></div>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-[330px_minmax(0,1fr)]">
            <div className="at-card overflow-hidden">
              <div className="border-b border-[var(--at-line-soft)] px-3 py-2.5">
                <div className="at-eyebrow">Template index</div>
                <p className="mt-1 text-[10px] text-[var(--at-mut)]">{filtered.length} of {data.templates.length} templates</p>
              </div>
              <div className="max-h-[680px] overflow-y-auto p-2">
                {!filtered.length ? (
                  <AtEmpty icon={Search} title="No matches" sub="Clear the search or choose another category." />
                ) : (
                  <div className="space-y-1">
                    {filtered.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedId(item.id)}
                        className={`flex w-full items-start gap-2.5 rounded-xl border p-2.5 text-left transition ${
                          item.id === selectedId
                            ? 'border-[var(--at-gold)]/45 bg-[var(--at-gold-soft)]'
                            : 'border-transparent hover:border-[var(--at-line)] hover:bg-[var(--at-soft)]'
                        }`}
                      >
                        <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-[var(--at-line-soft)] bg-[var(--at-card-bg)] text-[var(--at-gold)]">
                          {item.channels?.includes('sms') ? <MessageSquare className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[11px] font-semibold text-[var(--at-ink)]">{item.name}</span>
                          <span className="mt-0.5 block truncate font-mono text-[8.5px] text-[var(--at-mut-2)]">{item.id}</span>
                          <span className="mt-1 flex flex-wrap items-center gap-1">
                            <AtBadge tone={COMPLIANCE_TONE[item.compliance] || 'muted'}>{item.compliance}</AtBadge>
                            {item.requiresCounsel && <AtBadge tone="red">counsel</AtBadge>}
                          </span>
                        </span>
                        <ChevronRight className={`mt-1 h-3.5 w-3.5 shrink-0 ${item.id === selectedId ? 'text-[var(--at-gold)]' : 'text-[var(--at-mut-2)]'}`} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {selected ? (
              <div className="min-w-0 space-y-4">
                <AtPanel
                  eyebrow={categoryMap[selected.category]?.label || selected.category}
                  title={selected.name}
                  sub={selected.description}
                  action={(
                    <div className="flex flex-wrap items-center gap-1.5">
                      <AtBadge tone={IMPLEMENTATION_TONE[selected.implementation] || 'muted'}>{selected.implementation}</AtBadge>
                      <AtBadge tone={COMPLIANCE_TONE[selected.compliance] || 'muted'}>{selected.compliance}</AtBadge>
                      {selected.requiresCounsel && <AtBadge tone="red">Counsel required</AtBadge>}
                    </div>
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="at-segmented">
                      {CHANNELS.map(({ id, label, icon: Icon }) => {
                        const available = selected.channels?.includes(id);
                        return (
                          <button
                            key={id}
                            type="button"
                            disabled={!available}
                            onClick={() => setChannel(id)}
                            className={`${channel === id ? 'is-active' : ''} ${!available ? 'opacity-40' : ''}`}
                            title={available ? label : `${label} copy is not defined for this template`}
                          >
                            <Icon className="mr-1 inline h-3 w-3" />
                            {label}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {selected.channels?.includes('email') && preview?.subject && (
                        <AtButton onClick={() => copy(preview.subject, 'Subject')} variant="quiet" size="sm" icon={FileText}>Copy subject</AtButton>
                      )}
                      {selected.channels?.includes('email') && preview?.text && (
                        <AtButton onClick={() => copy(preview.text, 'Plain text')} variant="quiet" size="sm" icon={FileText}>Copy text</AtButton>
                      )}
                      {channel === 'email' && (
                        <AtButton onClick={testSend} disabled={Boolean(busy) || previewLoading || Boolean(preview?.blockedReason)} variant="gold" size="sm" icon={busy === 'test' ? Loader2 : Send}>
                          {busy === 'test' ? 'Sending…' : 'Test to me'}
                        </AtButton>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[9px] text-[var(--at-mut-2)]">
                    <span className="font-mono">{selected.id}</span>
                    <span>Audience: {selected.audience}</span>
                    <span>Policy: {selected.sendPolicy}</span>
                    <span>Channels: {selected.channels?.join(', ')}</span>
                  </div>

                  {preview?.warnings?.length > 0 && (
                    <div className="mt-3">
                      <AtAlert icon={TriangleAlert} tone="amber">
                        <ul className="ml-4 list-disc space-y-1">
                          {preview.warnings.map((warning) => <li key={warning}>{warning}</li>)}
                        </ul>
                      </AtAlert>
                    </div>
                  )}
                  {preview?.blockedReason && (
                    <div className="mt-3">
                      <AtAlert icon={Lock} tone="red"><b>Send blocked:</b> {preview.blockedReason}</AtAlert>
                    </div>
                  )}
                  {selected.requiresCounsel && (
                    <div className="mt-3">
                      <AtAlert icon={ShieldCheck} tone="red">
                        This is a restricted fundraising template. A preview and an admin test-send do not authorize an investor communication.
                        Counsel must approve the exact copy, audience, timing and delivery channel before use.
                      </AtAlert>
                    </div>
                  )}
                </AtPanel>

                <div className="at-card overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--at-line-soft)] px-4 py-2.5">
                    <div>
                      <div className="at-eyebrow">Rendered preview</div>
                      <p className="mt-1 text-[10px] text-[var(--at-mut)]">
                        {channel === 'email' ? 'Exact branded HTML with the company logo and footer.' : channel === 'sms' ? 'SMS copy and opt-out line.' : 'In-app notification copy and action.'}
                      </p>
                    </div>
                    {previewLoading && <span className="flex items-center gap-1.5 text-[10px] text-[var(--at-mut)]"><Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--at-gold)]" /> Rendering…</span>}
                  </div>

                  {previewLoading && !preview ? (
                    <div className="grid h-[480px] place-items-center text-[11px] text-[var(--at-mut)]">Rendering template…</div>
                  ) : !preview ? (
                    <AtEmpty icon={Mail} title="Preview unavailable" sub="Choose a template or retry the preview." />
                  ) : channel === 'email' ? (
                    <div>
                      <div className="border-b border-[var(--at-line-soft)] bg-[var(--at-soft)] px-4 py-3">
                        <div className="text-[10px] text-[var(--at-mut-2)]">Subject</div>
                        <div className="mt-0.5 text-[12px] font-semibold text-[var(--at-ink)]">{preview.subject}</div>
                        <div className="mt-2 text-[10px] text-[var(--at-mut-2)]">Preheader</div>
                        <div className="mt-0.5 text-[10px] text-[var(--at-mut)]">{preview.preheader}</div>
                      </div>
                      <iframe
                        title={`${selected.name} email preview`}
                        srcDoc={preview.html}
                        sandbox=""
                        className="h-[640px] w-full border-0 bg-[#07070a]"
                      />
                      <details className="border-t border-[var(--at-line-soft)] px-4 py-3">
                        <summary className="cursor-pointer text-[10px] font-semibold text-[var(--at-mut)]">Plain-text version</summary>
                        <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl border border-[var(--at-line-soft)] bg-[var(--at-soft)] p-3 font-mono text-[10px] leading-relaxed text-[var(--at-ink-2)]">{preview.text}</pre>
                      </details>
                    </div>
                  ) : channel === 'sms' ? (
                    <div className="grid min-h-[380px] place-items-center bg-[var(--at-soft)] p-6">
                      <div className="w-full max-w-md rounded-[28px] border border-[var(--at-line)] bg-[var(--at-card-bg)] p-4 shadow-xl">
                        <div className="flex items-center gap-2 border-b border-[var(--at-line-soft)] pb-3">
                          <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--at-gold-soft)] text-[var(--at-gold)]"><MessageSquare className="h-4 w-4" /></span>
                          <div>
                            <div className="text-[11px] font-semibold text-[var(--at-ink)]">TradingBible</div>
                            <div className="text-[9px] text-[var(--at-mut-2)]">SMS preview · design only</div>
                          </div>
                        </div>
                        <div className="mt-4 rounded-2xl rounded-tl-md bg-[var(--at-gold-soft)] p-3 text-[11px] leading-relaxed text-[var(--at-ink)]">{preview.sms}</div>
                        <div className="mt-3 text-[9px] text-[var(--at-mut-2)]">{preview.optOut || 'Reply STOP to opt out.'}</div>
                        <div className="mt-4 rounded-xl border border-[var(--at-line-soft)] bg-[var(--at-soft)] p-2.5 text-[9px] leading-relaxed text-[var(--at-mut)]">
                          SMS delivery is not configured. A provider, documented consent, quiet hours and opt-out handling are required before any send.
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid min-h-[380px] place-items-center bg-[var(--at-soft)] p-6">
                      <div className="w-full max-w-md rounded-2xl border border-[var(--at-line)] bg-[var(--at-card-bg)] p-4 shadow-xl">
                        <div className="flex items-start gap-3">
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--at-gold-soft)] text-[var(--at-gold)]"><Smartphone className="h-4 w-4" /></span>
                          <div className="min-w-0">
                            <div className="text-[12px] font-semibold text-[var(--at-ink)]">{preview.inApp?.title}</div>
                            <p className="mt-1 text-[10px] leading-relaxed text-[var(--at-mut)]">{preview.inApp?.body}</p>
                            {preview.inApp?.actionLabel && (
                              <div className="mt-3 inline-flex rounded-lg border border-[var(--at-gold)]/35 bg-[var(--at-gold-soft)] px-2.5 py-1.5 text-[10px] font-semibold text-[var(--at-gold)]">
                                {preview.inApp.actionLabel}
                              </div>
                            )}
                            <div className="mt-2 font-mono text-[8.5px] text-[var(--at-mut-2)]">{preview.inApp?.href}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-[var(--at-line-soft)] bg-[var(--at-soft)] px-4 py-3 text-[10px] text-[var(--at-mut)]">
                  <span className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-[var(--at-green)]" /> Admin test-send only</span>
                  <span className="flex items-center gap-2"><Lock className="h-3.5 w-3.5 text-[var(--at-gold)]" /> No bulk list</span>
                  <span className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-[var(--at-blue)]" /> Logo served from {data?.logoUrl ? 'the public site' : 'the brand asset'}</span>
                  <span className="ml-auto font-mono uppercase tracking-[0.12em]">{selected.channels?.length || 0} channel(s)</span>
                </div>
              </div>
            ) : (
              <div className="at-card"><AtEmpty icon={Mail} title="Choose a template" sub="The preview, channel variants and test-send controls appear here." /></div>
            )}
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--at-line-soft)] bg-[var(--at-soft)] px-4 py-3 text-[10px] text-[var(--at-mut)]">
          <span className="flex items-center gap-2"><TriangleAlert className="h-3.5 w-3.5 text-[var(--at-amber)]" /> Fundraising templates remain draft, restricted and counsel-gated even when the DocuSign execution gate is open.</span>
          <AtButton to="/admin/fundraising-documents" variant="quiet" size="sm" className="ml-auto">Open the fundraising packet</AtButton>
        </div>
      </div>
    </AdminLayout>
  );
}
