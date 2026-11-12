import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check, Download, FileText, Loader2, Lock, Mail, Plus, RefreshCw, Search,
  Send, ShieldCheck, TriangleAlert, Upload, UserMinus, Users, X,
} from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import {
  AtAlert, AtBadge, AtButton, AtEmpty, AtMetric, AtPageBar, AtPanel,
} from '@/components/AtelierUI';
import pb from '@/lib/pocketbaseClient';
import { API_SERVER_URL } from '@/lib/apiServerClient';

const TRACKS = [
  {
    id: 'private_506b',
    label: 'Private placement',
    regulation: 'Rule 506(b)',
    tone: 'red',
    blurb: 'One-to-one introductions only. Pre-existing substantive relationships. No general solicitation, no terms and no forwarding.',
  },
  {
    id: 'reg_cf',
    label: 'Regulation CF',
    regulation: 'Public investor updates',
    tone: 'blue',
    blurb: 'Confirmed subscribers only. Pre-launch education is non-offering; campaign emails require SEC qualification and the registered intermediary.',
  },
];

const STATUS_TONE = {
  active: 'green',
  unsubscribed: 'amber',
  suppressed: 'red',
  bounced: 'red',
  prepared: 'gold',
  sending: 'blue',
  sent: 'green',
  partial: 'amber',
  failed: 'red',
  interrupted: 'red',
};

const EMPTY_ADD = {
  name: '',
  email: '',
  relationshipBasis: 'existing_substantive',
  eligibility: 'not_yet_verified',
  consent: false,
  consentSource: '',
  source: 'admin-entry',
  notes: '',
};

const EMPTY_IMPORT = {
  emails: '',
  relationshipBasis: 'existing_substantive',
  eligibility: 'not_yet_verified',
  consent: false,
  consentSource: '',
  source: 'admin-import',
  notes: '',
};

const EMPTY_LEGAL = {
  counselApproved: false,
  counselName: '',
  counselReference: '',
  counselApprovedAt: '',
  privateRelationship: false,
  noGeneralSolicitation: false,
  noOffer: false,
  qualifiedOffering: false,
  registeredIntermediary: false,
  notes: '',
};

const EMPTY_VARS = {
  senderName: '',
  senderTitle: '',
  callBookingUrl: '',
  campaignDeadline: '',
};

const INPUT = 'at-input w-full';
const LABEL = 'mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--at-mut)]';

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

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

function CheckLine({ checked, onChange, children, disabled = false }) {
  return (
    <label className={`flex cursor-pointer items-start gap-2.5 rounded-xl border border-[var(--at-line-soft)] bg-[var(--at-panel-2)] px-3 py-2.5 ${disabled ? 'opacity-50' : ''}`}>
      <input
        type="checkbox"
        checked={Boolean(checked)}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--at-gold)]"
      />
      <span className="text-[11px] leading-relaxed text-[var(--at-ink-2)]">{children}</span>
    </label>
  );
}

export default function AdminInvestorLettersPage() {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('private_506b');
  const [loading, setLoading] = useState(true);
  const [silentLoading, setSilentLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_ADD);
  const [importForm, setImportForm] = useState(EMPTY_IMPORT);
  const [busy, setBusy] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [variables, setVariables] = useState(EMPTY_VARS);
  const [legal, setLegal] = useState(EMPTY_LEGAL);
  const [preview, setPreview] = useState(null);
  const [previewScheme, setPreviewScheme] = useState('auto');
  const [blockers, setBlockers] = useState([]);
  const [invalidContacts, setInvalidContacts] = useState([]);
  const [confirmation, setConfirmation] = useState('');
  const [expandedCampaign, setExpandedCampaign] = useState('');

  const authToken = () => pb.authStore?.token || '';

  const api = useCallback(async (path, { method = 'GET', body } = {}) => {
    const token = authToken();
    if (!token) throw new Error('Admin session unavailable. Sign in again.');
    const res = await fetch(`${API_SERVER_URL}/investor-letters${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(payload?.message || `Request failed (${res.status})`);
      err.status = res.status;
      err.details = payload?.details || null;
      throw err;
    }
    return payload;
  }, []);

  const load = useCallback(async (silent = false) => {
    if (silent) setSilentLoading(true);
    else setLoading(true);
    if (!silent) setError('');
    try {
      const payload = await api('/admin/overview');
      setData(payload);
      const track = payload?.tracks?.find((item) => item.id === tab);
      const available = track?.templates || [];
      setTemplateId((current) => (available.some((item) => item.id === current) ? current : (available[0]?.id || '')));
    } catch (err) {
      setError(err?.message || 'Investor-letter register unavailable');
    } finally {
      setLoading(false);
      setSilentLoading(false);
    }
  }, [api, tab]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const sending = Boolean(data?.campaigns?.some((campaign) => campaign.status === 'sending'));
    if (!sending) return undefined;
    const timer = setInterval(() => load(true), 2500);
    return () => clearInterval(timer);
  }, [data?.campaigns, load]);

  const currentTrack = useMemo(
    () => data?.tracks?.find((item) => item.id === tab) || null,
    [data, tab],
  );
  const templates = currentTrack?.templates || [];
  const selectedTemplate = useMemo(
    () => templates.find((item) => item.id === templateId) || templates[0] || null,
    [templates, templateId],
  );
  const contacts = useMemo(
    () => (data?.contacts || []).filter((contact) => contact.track === tab),
    [data, tab],
  );
  const filteredContacts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((contact) => `${contact.name} ${contact.email} ${contact.status} ${contact.consentSource}`.toLowerCase().includes(q));
  }, [contacts, query]);
  const activeContacts = useMemo(
    () => contacts.filter((contact) => contact.status === 'active' && contact.consent),
    [contacts],
  );
  const latestCampaign = data?.campaigns?.find((row) => ['prepared', 'sending', 'interrupted', 'partial', 'failed'].includes(row.status)) || data?.campaigns?.[0] || null;
  const campaignNeedsAttention = Boolean(latestCampaign);
  const isRegCf = tab === 'reg_cf';
  const isLiveRegCf = ['fundraising.regcf-live', 'fundraising.regcf-reminder'].includes(selectedTemplate?.id);

  const updateVar = (key) => (event) => setVariables((current) => ({ ...current, [key]: event.target.value }));
  const updateLegal = (key) => (event) => setLegal((current) => ({ ...current, [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }));

  const resetComposer = () => {
    setCampaignName('');
    setVariables(EMPTY_VARS);
    setLegal(EMPTY_LEGAL);
    setPreview(null);
    setBlockers([]);
    setInvalidContacts([]);
    setConfirmation('');
  };

  useEffect(() => {
    setPreview(null);
    setBlockers([]);
    setInvalidContacts([]);
    setConfirmation('');
  }, [tab, templateId]);

  const runPreview = async (scheme = previewScheme) => {
    if (!selectedTemplate) return;
    setPreviewScheme(scheme);
    setBusy('preview');
    setError('');
    setNotice('');
    try {
      const payload = await api('/admin/preview', {
        method: 'POST',
        body: {
          track: tab,
          templateId: selectedTemplate.id,
          colorScheme: scheme,
          variables,
        },
      });
      setPreview(payload.rendered || null);
    } catch (err) {
      setPreview(null);
      setError(err?.message || 'Preview failed');
    } finally {
      setBusy('');
    }
  };

  const addContact = async (event) => {
    event.preventDefault();
    setBusy('add');
    setError('');
    setNotice('');
    try {
      await api('/admin/contacts', {
        method: 'POST',
        body: { ...addForm, track: tab },
      });
      setAddForm(EMPTY_ADD);
      setAddOpen(false);
      setNotice('Contact added to the controlled investor-letter register.');
      await load(true);
    } catch (err) {
      setError(err?.message || 'Contact could not be added');
    } finally {
      setBusy('');
    }
  };

  const importContacts = async (event) => {
    event.preventDefault();
    setBusy('import');
    setError('');
    setNotice('');
    try {
      const result = await api('/admin/import', {
        method: 'POST',
        body: { ...importForm, track: tab },
      });
      setImportForm(EMPTY_IMPORT);
      setImportOpen(false);
      setNotice(`Imported ${result.added} contact(s). ${result.duplicates || 0} duplicate(s) and ${result.invalid || 0} invalid line(s) were skipped.`);
      await load(true);
    } catch (err) {
      setError(err?.message || 'Import failed');
    } finally {
      setBusy('');
    }
  };

  const syncSubscribers = async () => {
    setBusy('sync');
    setError('');
    setNotice('');
    try {
      const result = await api('/admin/sync-regcf', { method: 'POST' });
      setNotice(`Subscriber sync complete: ${result.added} added, ${result.updated} updated, ${result.skipped} skipped.`);
      await load(true);
    } catch (err) {
      setError(err?.message || 'Subscriber sync failed');
    } finally {
      setBusy('');
    }
  };

  const setContactStatus = async (contact, status) => {
    if (status !== 'active' && !window.confirm(`Mark ${contact.email} as ${status}? They will not be selected for any future campaign.`)) return;
    setBusy(`status:${contact.id}`);
    setError('');
    setNotice('');
    try {
      await api(`/admin/contacts/${encodeURIComponent(contact.id)}`, { method: 'PATCH', body: { status } });
      setNotice(`${contact.email} is now ${status}.`);
      await load(true);
    } catch (err) {
      setError(err?.message || 'Contact status could not be updated');
    } finally {
      setBusy('');
    }
  };

  const prepareCampaign = async () => {
    if (!selectedTemplate) return;
    setBusy('prepare');
    setError('');
    setNotice('');
    setBlockers([]);
    setInvalidContacts([]);
    try {
      const payload = await api('/admin/campaigns', {
        method: 'POST',
        body: {
          track: tab,
          templateId: selectedTemplate.id,
          name: campaignName,
          variables,
          legal,
        },
      });
      setNotice(`Campaign ${payload.campaign.number} is prepared. Review the audience, test it to yourself, then send.`);
      setConfirmation('');
      await load(true);
    } catch (err) {
      setBlockers(err?.details?.blockers || []);
      setInvalidContacts(err?.details?.invalid || []);
      setError(err?.message || 'Campaign is not ready');
    } finally {
      setBusy('');
    }
  };

  const testCampaign = async (campaign) => {
    setBusy(`test:${campaign.id}`);
    setError('');
    setNotice('');
    try {
      const result = await api(`/admin/campaigns/${campaign.id}/test`, { method: 'POST' });
      setNotice(`Test letter sent to ${result.to}. It was marked ADMIN TEST and was not sent to an investor.`);
    } catch (err) {
      setError(err?.message || 'Test send failed');
    } finally {
      setBusy('');
    }
  };

  const sendCampaign = async (campaign) => {
    setBusy(`send:${campaign.id}`);
    setError('');
    setNotice('');
    try {
      const result = await api(`/admin/campaigns/${campaign.id}/send`, {
        method: 'POST',
        body: { confirmation },
      });
      setConfirmation('');
      setNotice(`Campaign ${result.campaign?.number || campaign.number} started. The send log updates as each letter is delivered.`);
      await load(true);
    } catch (err) {
      setBlockers(err?.details?.blockers || []);
      setInvalidContacts(err?.details?.invalid || []);
      setError(err?.message || 'Campaign could not be started');
    } finally {
      setBusy('');
    }
  };

  const downloadCsv = async () => {
    setBusy('csv');
    setError('');
    try {
      const res = await fetch(`${API_SERVER_URL}/investor-letters/admin/contacts.csv`, {
        headers: { Authorization: `Bearer ${authToken()}` },
      });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      downloadBlob(await res.blob(), 'TradingBible-Investor-Letter-Audience.csv');
      setNotice('Audience register exported as CSV.');
    } catch (err) {
      setError(err?.message || 'Export failed');
    } finally {
      setBusy('');
    }
  };

  const config = data?.config || {};
  const showBlockers = blockers.length > 0 || invalidContacts.length > 0;
  const currentTrackMeta = TRACKS.find((item) => item.id === tab) || TRACKS[0];

  return (
    <AdminLayout title="Investor letters">
      <div className="at-page at-scope at-enter pb-10">
        <AtPageBar
          meta={[
            `${data?.counts?.active || 0} active recipients`,
            `${data?.counts?.lettersSent || 0} letters sent`,
            'Rule 506(b) · Regulation CF',
            'Controlled sender',
          ]}
          actions={(
            <>
              <AtButton to="/admin/fundraising-documents" variant="quiet" icon={FileText}>Fundraising packet</AtButton>
              <AtButton to="/admin/communications" variant="quiet" icon={Mail}>Template library</AtButton>
              <AtButton onClick={downloadCsv} disabled={Boolean(busy)} variant="outline" icon={Download}>Export audience</AtButton>
              <AtButton onClick={() => load()} disabled={loading || silentLoading} variant="gold" icon={loading ? Loader2 : RefreshCw}>
                {loading ? 'Loading…' : 'Refresh'}
              </AtButton>
            </>
          )}
        >
          <p className="mt-2 max-w-4xl text-[11px] leading-relaxed text-[var(--at-mut)]">
            Add consented investor emails, prepare the exact letter, and send one-to-one. This console does not make an offering lawful.
            Private Rule 506(b) letters are limited to pre-existing substantive relationships and contain no offering terms. Regulation CF
            campaign emails stay blocked until the server records SEC qualification and the registered intermediary. Every commercial email
            includes the postal address and a signed unsubscribe link.
          </p>
        </AtPageBar>

        <div className="mt-3 space-y-3">
          <AtAlert icon={ShieldCheck} tone="red">
            <b className="text-[var(--at-ink)]">Two tracks. Two different legal gates.</b> Never move a private-placement contact into the
            Regulation CF list, and never send a public campaign letter to a private contact. The server checks the audience, consent,
            counsel approval and the track-specific gate before a campaign can be prepared or started.
          </AtAlert>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <AtMetric icon={Users} label="Active audience" value={(data?.counts?.active || 0).toLocaleString()} note="Consented and not suppressed" tone="text-[var(--at-green)]" />
            <AtMetric icon={Mail} label="Letters delivered" value={(data?.counts?.lettersSent || 0).toLocaleString()} note="All controlled campaigns" tone="text-[var(--at-gold)]" />
            <AtMetric icon={Send} label="Campaigns" value={(data?.counts?.campaigns || 0).toLocaleString()} note="Prepared and sent" />
            <AtMetric icon={Lock} label="Delivery gate" value={config.smtpConfigured && config.postalAddressConfigured ? 'Ready' : 'Blocked'} note={config.smtpConfigured ? (config.postalAddressConfigured ? 'SMTP + postal address present' : 'Postal address missing') : 'SMTP missing'} tone={config.smtpConfigured && config.postalAddressConfigured ? 'text-[var(--at-green)]' : 'text-[var(--at-amber)]'} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AtBadge tone={config.smtpConfigured ? 'green' : 'amber'}>{config.smtpConfigured ? 'SMTP configured' : 'SMTP missing'}</AtBadge>
            <AtBadge tone={config.postalAddressConfigured ? 'green' : 'amber'}>{config.postalAddressConfigured ? 'Postal address configured' : 'Postal address missing'}</AtBadge>
            <AtBadge tone={config.regCfStatus === 'qualified' ? 'green' : config.regCfStatus === 'closed' ? 'muted' : 'blue'}>Reg CF: {config.regCfStatus || 'prelaunch'}</AtBadge>
            {config.regCfIntermediary && <AtBadge tone="blue">Intermediary: {config.regCfIntermediary}</AtBadge>}
            {data?.counts?.lettersFailed > 0 && <AtBadge tone="red">{data.counts.lettersFailed} failed delivery(s)</AtBadge>}
          </div>
          {!config.smtpConfigured && <AtAlert icon={TriangleAlert} tone="amber"><b className="text-[var(--at-ink)]">Delivery is blocked.</b> Add the production SMTP variables on the API server. The audience and letter preparation still work, but no investor email can be sent.</AtAlert>}
          {!config.postalAddressConfigured && <AtAlert icon={TriangleAlert} tone="amber"><b className="text-[var(--at-ink)]">Postal address is missing.</b> Set <span className="font-mono">COMPANY_POSTAL_ADDRESS</span> before any commercial send. The server will block the campaign.</AtAlert>}
        </div>

        {error && <div className="mt-4"><AtAlert icon={TriangleAlert} tone="red">{error}</AtAlert></div>}
        {notice && <div className="mt-4"><AtAlert icon={Check} tone="green">{notice}</AtAlert></div>}

        <div className="mt-5 grid gap-2 md:grid-cols-2">
          {TRACKS.map((track) => {
            const trackData = data?.tracks?.find((item) => item.id === track.id);
            const active = tab === track.id;
            return (
              <button
                key={track.id}
                type="button"
                onClick={() => setTab(track.id)}
                className={`rounded-2xl border p-4 text-left transition ${active ? 'border-[var(--at-gold)]/55 bg-[var(--at-gold-soft)]' : 'border-[var(--at-line-soft)] bg-[var(--at-card-bg)] hover:border-[var(--at-line)]'}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-[var(--at-ink)]">{track.label}</span>
                  <AtBadge tone={track.tone}>{track.regulation}</AtBadge>
                  <span className="ml-auto font-mono text-[9px] text-[var(--at-mut)]">{trackData?.active || 0} active</span>
                </div>
                <p className="mt-2 text-[10px] leading-relaxed text-[var(--at-mut)]">{track.blurb}</p>
              </button>
            );
          })}
        </div>

        {latestCampaign && campaignNeedsAttention && (
          <AtPanel
            className="mt-4"
            eyebrow="Campaign control"
            title={`${latestCampaign.number} · ${latestCampaign.name}`}
            sub={`${latestCampaign.recipientCount} recipient(s) · ${latestCampaign.templateId} · ${latestCampaign.status}`}
            action={<AtBadge tone={STATUS_TONE[latestCampaign.status] || 'muted'}>{latestCampaign.status}</AtBadge>}
          >
            <div className="grid gap-3 lg:grid-cols-[1.1fr_.9fr]">
              <div className="space-y-2 text-[11px] text-[var(--at-mut)]">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span>Subject: <b className="text-[var(--at-ink)]">{latestCampaign.subject}</b></span>
                  <span>Created {formatDate(latestCampaign.createdAt)}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <AtBadge tone="green">{latestCampaign.sentCount || 0} sent</AtBadge>
                  <AtBadge tone={latestCampaign.failedCount ? 'red' : 'muted'}>{latestCampaign.failedCount || 0} failed</AtBadge>
                  <AtBadge tone="blue">{latestCampaign.track === 'private_506b' ? 'Rule 506(b)' : 'Regulation CF'}</AtBadge>
                </div>
                {latestCampaign.error && <AtAlert icon={TriangleAlert} tone="red">{latestCampaign.error}</AtAlert>}
                {latestCampaign.status === 'sending' && (
                  <div className="rounded-xl border border-[var(--at-line-soft)] bg-[var(--at-soft)] p-3 text-[10px]">
                    Sending in the background. This panel refreshes automatically. Do not start another campaign until this one finishes.
                  </div>
                )}
                {latestCampaign.status === 'interrupted' && (
                  <AtAlert icon={Lock} tone="amber">The API restarted during this campaign. Review the partial send log, then prepare a fresh campaign with the remaining recipients. Do not retry the interrupted campaign.</AtAlert>
                )}
                {latestCampaign.status === 'failed' && (latestCampaign.sentCount || 0) > 0 && (
                  <AtAlert icon={Lock} tone="amber">Some letters were delivered before the failure. Do not retry the same campaign; prepare a fresh campaign for the remaining active recipients.</AtAlert>
                )}
              </div>
              <div className="rounded-xl border border-[var(--at-line-soft)] bg-[var(--at-soft)] p-3">
                {latestCampaign.status === 'prepared' && (
                  <>
                    <p className="text-[10px] leading-relaxed text-[var(--at-mut)]">Send a test to yourself first. The live send is one email per recipient, with no CC or BCC, and includes the signed unsubscribe link.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <AtButton onClick={() => testCampaign(latestCampaign)} disabled={Boolean(busy)} variant="outline" icon={busy === `test:${latestCampaign.id}` ? Loader2 : Mail}>
                        {busy === `test:${latestCampaign.id}` ? 'Sending test…' : 'Test to me'}
                      </AtButton>
                    </div>
                    <label className="mt-3 block">
                      <span className={LABEL}>Type SEND to authorise</span>
                      <input className={INPUT} value={confirmation} onChange={(event) => setConfirmation(event.target.value.toUpperCase())} placeholder="SEND" />
                    </label>
                    <AtButton
                      className="mt-2 w-full justify-center"
                      onClick={() => sendCampaign(latestCampaign)}
                      disabled={Boolean(busy) || confirmation !== 'SEND'}
                      variant="gold"
                      icon={busy === `send:${latestCampaign.id}` ? Loader2 : Send}
                    >
                      {busy === `send:${latestCampaign.id}` ? 'Starting…' : `Send ${latestCampaign.recipientCount} letter(s)`}
                    </AtButton>
                  </>
                )}
                {latestCampaign.status === 'sending' && (
                  <div className="flex items-center gap-2 text-[11px] text-[var(--at-mut)]">
                    <Loader2 className="h-4 w-4 animate-spin text-[var(--at-gold)]" /> Sending {latestCampaign.sentCount || 0} of {latestCampaign.recipientCount}…
                  </div>
                )}
                {['interrupted', 'partial', 'failed'].includes(latestCampaign.status) && (
                  <AtButton onClick={() => { resetComposer(); setTab(latestCampaign.track); window.scrollTo({ top: 0, behavior: 'smooth' }); }} variant="quiet" icon={Plus}>Prepare a fresh campaign</AtButton>
                )}
              </div>
            </div>
          </AtPanel>
        )}

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <AtPanel
            eyebrow={currentTrackMeta.regulation}
            title={`${currentTrackMeta.label} audience`}
            sub={`${contacts.length} contact(s) in this track · ${activeContacts.length} active with consent`}
            action={(
              <div className="flex flex-wrap gap-1.5">
                <AtButton onClick={() => { setAddForm(EMPTY_ADD); setAddOpen((value) => !value); }} variant="gold" size="sm" icon={Plus}>Add</AtButton>
                <AtButton onClick={() => { setImportForm(EMPTY_IMPORT); setImportOpen((value) => !value); }} variant="quiet" size="sm" icon={Upload}>Import</AtButton>
                {isRegCf && <AtButton onClick={syncSubscribers} disabled={Boolean(busy)} variant="outline" size="sm" icon={busy === 'sync' ? Loader2 : RefreshCw}>{busy === 'sync' ? 'Syncing…' : 'Sync subscribers'}</AtButton>}
              </div>
            )}
          >
            {addOpen && (
              <form onSubmit={addContact} className="mb-3 rounded-xl border border-[var(--at-gold)]/30 bg-[var(--at-gold-soft)] p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-semibold text-[var(--at-ink)]">Add one investor email</p>
                    <p className="mt-1 text-[10px] leading-relaxed text-[var(--at-mut)]">Only add a person you can lawfully email. The consent source is stored with the contact and reviewed by the server at send time.</p>
                  </div>
                  <button type="button" onClick={() => setAddOpen(false)} className="rounded-lg p-1 text-[var(--at-mut)] hover:bg-black/10" aria-label="Close add contact"><X className="h-4 w-4" /></button>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <label><span className={LABEL}>Full name</span><input className={INPUT} value={addForm.name} onChange={(event) => setAddForm((current) => ({ ...current, name: event.target.value }))} placeholder="e.g. Ada Okafor" /></label>
                  <label><span className={LABEL}>Email</span><input type="email" required className={INPUT} value={addForm.email} onChange={(event) => setAddForm((current) => ({ ...current, email: event.target.value }))} placeholder="investor@example.com" /></label>
                  {!isRegCf && (
                    <>
                      <label><span className={LABEL}>Relationship</span><select className={INPUT} value={addForm.relationshipBasis} onChange={(event) => setAddForm((current) => ({ ...current, relationshipBasis: event.target.value }))}><option value="existing_substantive">Existing substantive relationship</option><option value="existing_limited">Existing but limited relationship</option><option value="inbound_request">Inbound request (review required)</option><option value="other">Other (review required)</option></select></label>
                      <label><span className={LABEL}>Eligibility</span><select className={INPUT} value={addForm.eligibility} onChange={(event) => setAddForm((current) => ({ ...current, eligibility: event.target.value }))}><option value="not_yet_verified">Not yet verified</option><option value="self_certified_accredited">Self-certified accredited</option><option value="verified_accredited">Verified accredited</option><option value="not_applicable">Not applicable</option></select></label>
                    </>
                  )}
                  <label><span className={LABEL}>Consent / relationship source</span><input required className={INPUT} value={addForm.consentSource} onChange={(event) => setAddForm((current) => ({ ...current, consentSource: event.target.value }))} placeholder="e.g. existing investor relationship, signed event list" /></label>
                  <label><span className={LABEL}>Internal note</span><input className={INPUT} value={addForm.notes} onChange={(event) => setAddForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Optional context for the compliance file" /></label>
                </div>
                <div className="mt-2"><CheckLine checked={addForm.consent} onChange={(checked) => setAddForm((current) => ({ ...current, consent: checked }))}>I confirm this person consented to receive this category of communication, or that a lawful existing relationship supports a one-to-one private letter. I will not use this list for general solicitation.</CheckLine></div>
                <div className="mt-2 flex justify-end gap-2"><AtButton onClick={() => setAddOpen(false)} variant="quiet" size="sm" disabled={busy === 'add'}>Cancel</AtButton><AtButton type="submit" variant="gold" size="sm" icon={busy === 'add' ? Loader2 : Plus} disabled={busy === 'add'}>{busy === 'add' ? 'Adding…' : 'Add contact'}</AtButton></div>
              </form>
            )}

            {importOpen && (
              <form onSubmit={importContacts} className="mb-3 rounded-xl border border-[var(--at-line-soft)] bg-[var(--at-soft)] p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-semibold text-[var(--at-ink)]">Import a consented list</p>
                    <p className="mt-1 text-[10px] leading-relaxed text-[var(--at-mut)]">One address per line: <span className="font-mono">Name &lt;email&gt;</span>, <span className="font-mono">email, Name</span> or just the email. Duplicates are skipped.</p>
                  </div>
                  <button type="button" onClick={() => setImportOpen(false)} className="rounded-lg p-1 text-[var(--at-mut)] hover:bg-black/10" aria-label="Close import"><X className="h-4 w-4" /></button>
                </div>
                <textarea rows="5" required className={`${INPUT} mt-3 font-mono text-[11px]`} value={importForm.emails} onChange={(event) => setImportForm((current) => ({ ...current, emails: event.target.value }))} placeholder={'Ada Okafor <ada@example.com>\ninvestor@example.com, John Doe'} />
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <label><span className={LABEL}>Consent source</span><input required className={INPUT} value={importForm.consentSource} onChange={(event) => setImportForm((current) => ({ ...current, consentSource: event.target.value }))} placeholder="e.g. signed webinar list, existing relationship register" /></label>
                  {!isRegCf && <label><span className={LABEL}>Relationship for this batch</span><select className={INPUT} value={importForm.relationshipBasis} onChange={(event) => setImportForm((current) => ({ ...current, relationshipBasis: event.target.value }))}><option value="existing_substantive">Existing substantive relationship</option><option value="existing_limited">Existing but limited relationship</option><option value="inbound_request">Inbound request (review required)</option><option value="other">Other (review required)</option></select></label>}
                </div>
                <div className="mt-2"><CheckLine checked={importForm.consent} onChange={(checked) => setImportForm((current) => ({ ...current, consent: checked }))}>I confirm every address on this list has documented consent and a lawful basis for this communication. I understand the server will block ineligible private-placement contacts.</CheckLine></div>
                <div className="mt-2 flex justify-end gap-2"><AtButton onClick={() => setImportOpen(false)} variant="quiet" size="sm" disabled={busy === 'import'}>Cancel</AtButton><AtButton type="submit" variant="gold" size="sm" icon={busy === 'import' ? Loader2 : Upload} disabled={busy === 'import'}>{busy === 'import' ? 'Importing…' : 'Import list'}</AtButton></div>
              </form>
            )}

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--at-mut-2)]" />
              <input className={`${INPUT} !pl-9`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${currentTrackMeta.label.toLowerCase()} contacts…`} />
            </div>

            <div className="mt-3 max-h-[560px] space-y-1.5 overflow-y-auto pr-1">
              {filteredContacts.length === 0 ? (
                <AtEmpty icon={Users} title={contacts.length ? 'No matching contacts' : 'No contacts in this track'} sub={contacts.length ? 'Clear the search or add another contact.' : (isRegCf ? 'Sync confirmed investor subscribers or import a consented list.' : 'Add a pre-existing relationship one at a time. Do not paste a scraped list.')} />
              ) : filteredContacts.map((contact) => (
                <div key={contact.id} className="rounded-xl border border-[var(--at-line-soft)] bg-[var(--at-soft)] p-2.5">
                  <div className="flex items-start gap-2">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[var(--at-line-soft)] bg-[var(--at-card-bg)] text-[var(--at-gold)]"><Mail className="h-3.5 w-3.5" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate text-[11px] font-semibold text-[var(--at-ink)]">{contact.name || contact.email}</span>
                        <AtBadge tone={STATUS_TONE[contact.status] || 'muted'}>{contact.status}</AtBadge>
                        {contact.consent ? <AtBadge tone="green">consent</AtBadge> : <AtBadge tone="red">no consent</AtBadge>}
                      </div>
                      <div className="mt-0.5 truncate font-mono text-[9px] text-[var(--at-mut-2)]">{contact.email}</div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[9px] text-[var(--at-mut)]">
                        {!isRegCf && <span>{contact.relationshipBasis.replaceAll('_', ' ')}</span>}
                        {!isRegCf && <span>{contact.eligibility.replaceAll('_', ' ')}</span>}
                        <span>source: {contact.consentSource || '—'}</span>
                        <span>last sent: {formatDate(contact.lastSentAt)}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      {contact.status === 'active' ? (
                        <>
                          <button type="button" onClick={() => setContactStatus(contact, 'unsubscribed')} disabled={Boolean(busy)} className="rounded-lg border border-[var(--at-line-soft)] p-1.5 text-[var(--at-mut)] hover:text-[var(--at-amber)]" title="Mark unsubscribed"><UserMinus className="h-3.5 w-3.5" /></button>
                          <button type="button" onClick={() => setContactStatus(contact, 'suppressed')} disabled={Boolean(busy)} className="rounded-lg border border-[var(--at-line-soft)] p-1.5 text-[var(--at-mut)] hover:text-[var(--at-red)]" title="Suppress"><X className="h-3.5 w-3.5" /></button>
                        </>
                      ) : (
                        <button type="button" onClick={() => setContactStatus(contact, 'active')} disabled={Boolean(busy)} className="rounded-lg border border-[var(--at-line-soft)] p-1.5 text-[var(--at-mut)] hover:text-[var(--at-green)]" title="Reactivate with consent"><Check className="h-3.5 w-3.5" /></button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </AtPanel>

          <AtPanel
            eyebrow="Controlled composer"
            title={isRegCf ? 'Prepare a Regulation CF letter' : 'Prepare a private letter'}
            sub={isRegCf ? 'Confirmed subscribers only. No offer before qualification. No money by email.' : 'One-to-one. No attachment. No offering terms. Counsel-approved copy and audience.'}
            action={<AtBadge tone={isRegCf ? 'blue' : 'red'}>{isRegCf ? 'Reg CF' : 'Rule 506(b)'}</AtBadge>}
          >
            <div className="grid gap-2 sm:grid-cols-2">
              <label><span className={LABEL}>Letter template</span><select className={INPUT} value={templateId} onChange={(event) => setTemplateId(event.target.value)}>{templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label>
              <label><span className={LABEL}>Campaign name (internal)</span><input className={INPUT} value={campaignName} onChange={(event) => setCampaignName(event.target.value)} placeholder="e.g. Q4 private introduction" /></label>
            </div>
            {selectedTemplate && <p className="mt-2 rounded-xl border border-[var(--at-line-soft)] bg-[var(--at-soft)] p-2.5 text-[10px] leading-relaxed text-[var(--at-mut)]">{selectedTemplate.description}</p>}

            {!isRegCf && (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <label><span className={LABEL}>Sender full name</span><input className={INPUT} value={variables.senderName} onChange={updateVar('senderName')} placeholder="Name in the sign-off" /></label>
                <label><span className={LABEL}>Sender title</span><input className={INPUT} value={variables.senderTitle} onChange={updateVar('senderTitle')} placeholder="e.g. Chief Executive Officer" /></label>
                <label className="sm:col-span-2"><span className={LABEL}>Private reply / scheduling link</span><input className={INPUT} value={variables.callBookingUrl} onChange={updateVar('callBookingUrl')} placeholder={`mailto:${config.legalEmail || 'legal@tradingbible.app'}`} /></label>
              </div>
            )}
            {isRegCf && isLiveRegCf && (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <label><span className={LABEL}>Campaign deadline (from the qualified offering)</span><input className={INPUT} value={variables.campaignDeadline} onChange={updateVar('campaignDeadline')} placeholder="e.g. 31 March 2027" /></label>
                <div className="rounded-xl border border-[var(--at-line-soft)] bg-[var(--at-soft)] p-2.5 text-[10px] leading-relaxed text-[var(--at-mut)]">Offering URL and intermediary name are read from the server configuration, not typed into the letter. Reg CF status: <b className="text-[var(--at-ink)]">{config.regCfStatus || 'prelaunch'}</b>.</div>
              </div>
            )}

            <div className="mt-3 rounded-xl border border-[var(--at-line-soft)] bg-[var(--at-soft)] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--at-gold)]">Audience check</p>
                  <p className="mt-1 text-[10px] text-[var(--at-mut)]">{activeContacts.length} active consented contact(s) will receive this letter. The server re-checks the list at send time.</p>
                </div>
                <AtBadge tone={activeContacts.length ? 'green' : 'red'}>{activeContacts.length ? 'audience ready' : 'no audience'}</AtBadge>
              </div>
              {!isRegCf && activeContacts.some((contact) => contact.relationshipBasis !== 'existing_substantive') && (
                <p className="mt-2 text-[10px] text-[var(--at-amber)]">Some contacts are not marked as an existing substantive relationship. The server will block the campaign until they are corrected or suppressed.</p>
              )}
            </div>

            <div className="mt-3 rounded-xl border border-[var(--at-line-soft)] bg-[var(--at-soft)] p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--at-gold)]">Counsel approval</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <label><span className={LABEL}>Counsel / approver name</span><input className={INPUT} value={legal.counselName} onChange={updateLegal('counselName')} placeholder="Actual approving lawyer or officer" /></label>
                <label><span className={LABEL}>Approval reference</span><input className={INPUT} value={legal.counselReference} onChange={updateLegal('counselReference')} placeholder="Matter, memo or email reference" /></label>
                <label><span className={LABEL}>Approval date</span><input type="date" className={INPUT} value={legal.counselApprovedAt} onChange={updateLegal('counselApprovedAt')} /></label>
                <label><span className={LABEL}>Internal legal note</span><input className={INPUT} value={legal.notes} onChange={updateLegal('notes')} placeholder="Scope, conditions or expiry" /></label>
              </div>
              <div className="mt-2 space-y-1.5">
                <CheckLine checked={legal.counselApproved} onChange={(checked) => setLegal((current) => ({ ...current, counselApproved: checked }))}>Counsel approved this exact copy, audience, timing and channel. I understand the platform stores this approval but does not create it.</CheckLine>
                {!isRegCf ? (
                  <>
                    <CheckLine checked={legal.privateRelationship} onChange={(checked) => setLegal((current) => ({ ...current, privateRelationship: checked }))}>Every recipient is a pre-existing substantive relationship of TradingBible. This is a one-to-one private communication.</CheckLine>
                    <CheckLine checked={legal.noGeneralSolicitation} onChange={(checked) => setLegal((current) => ({ ...current, noGeneralSolicitation: checked }))}>There is no general solicitation, public advertisement, forwarding, CC or BCC. No offering terms or documents are included.</CheckLine>
                  </>
                ) : (
                  <>
                    <CheckLine checked={legal.noOffer} onChange={(checked) => setLegal((current) => ({ ...current, noOffer: checked }))}>This copy is educational or campaign-stage compliant and does not itself accept money, reservations or allocations.</CheckLine>
                    {isLiveRegCf && (
                      <>
                        <CheckLine checked={legal.qualifiedOffering} onChange={(checked) => setLegal((current) => ({ ...current, qualifiedOffering: checked }))}>The SEC has qualified the offering statement and the campaign is open on the registered intermediary’s platform.</CheckLine>
                        <CheckLine checked={legal.registeredIntermediary} onChange={(checked) => setLegal((current) => ({ ...current, registeredIntermediary: checked }))}>The offering is conducted through a FINRA-registered intermediary. I am not using this email to take investments directly.</CheckLine>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>

            {showBlockers && (
              <div className="mt-3 space-y-2">
                <AtAlert icon={Lock} tone="red">
                  <b className="text-[var(--at-ink)]">Send gate not satisfied.</b>
                  {blockers.length > 0 && <ul className="ml-4 mt-1 list-disc space-y-1">{blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul>}
                  {invalidContacts.length > 0 && <p className="mt-1">{invalidContacts.length} contact(s) are ineligible or lack consent. Review the audience list.</p>}
                </AtAlert>
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <AtButton onClick={() => runPreview()} disabled={Boolean(busy) || !selectedTemplate} variant="quiet" icon={busy === 'preview' ? Loader2 : FileText}>{busy === 'preview' ? 'Rendering…' : 'Preview exact email'}</AtButton>
              <AtButton onClick={prepareCampaign} disabled={Boolean(busy) || !selectedTemplate || !activeContacts.length} variant="gold" icon={busy === 'prepare' ? Loader2 : ShieldCheck}>{busy === 'prepare' ? 'Checking…' : 'Prepare campaign'}</AtButton>
              <span className="text-[9px] text-[var(--at-mut-2)]">Preparation does not send. You review and type SEND separately.</span>
            </div>

            {preview && (
              <div className="mt-3 overflow-hidden rounded-xl border border-[var(--at-line-soft)]">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--at-line-soft)] bg-[var(--at-soft)] px-3 py-2">
                  <div>
                    <div className="text-[9px] uppercase tracking-[0.12em] text-[var(--at-mut-2)]">Exact email preview</div>
                    <div className="mt-0.5 text-[11px] font-semibold text-[var(--at-ink)]">{preview.subject}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    {['auto', 'light', 'dark'].map((scheme) => <button key={scheme} type="button" onClick={() => runPreview(scheme)} className={`rounded-md border px-2 py-1 text-[9px] font-semibold capitalize ${previewScheme === scheme ? 'border-[var(--at-gold)]/50 bg-[var(--at-gold-soft)] text-[var(--at-gold)]' : 'border-[var(--at-line-soft)] text-[var(--at-mut)]'}`}>{scheme}</button>)}
                    <button type="button" onClick={() => setPreview(null)} className="rounded-md p-1 text-[var(--at-mut)]" aria-label="Close preview"><X className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                <iframe title="Investor letter preview" srcDoc={preview.html} sandbox="" className="h-[520px] w-full border-0 bg-[#eef3f9]" />
                <details className="border-t border-[var(--at-line-soft)] px-3 py-2">
                  <summary className="cursor-pointer text-[10px] font-semibold text-[var(--at-mut)]">Plain-text version</summary>
                  <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-[var(--at-line-soft)] bg-[var(--at-soft)] p-2 font-mono text-[9px] leading-relaxed text-[var(--at-ink-2)]">{preview.text}</pre>
                </details>
              </div>
            )}
          </AtPanel>
        </div>

        <AtPanel className="mt-4" title="Campaign record" sub="Every prepared, started, delivered and failed letter is recorded. The register never records a non-existent approval." action={<AtBadge tone="muted">{data?.campaigns?.length || 0} recent</AtBadge>} flush>
          {data?.campaigns?.length ? (
            <div className="at-table-wrap !rounded-none !border-0 !bg-transparent">
              <table className="at-table min-w-[780px]">
                <thead><tr><th>Campaign</th><th>Track</th><th>Status</th><th>Recipients</th><th>Sent</th><th>Failed</th><th>Created</th><th className="text-right">Detail</th></tr></thead>
                <tbody>
                  {data.campaigns.map((campaign) => (
                    <React.Fragment key={campaign.id}>
                      <tr>
                        <td>
                          <div className="font-semibold text-[var(--at-ink)]">{campaign.name}</div>
                          <div className="font-mono text-[9px] text-[var(--at-mut-2)]">{campaign.number}</div>
                        </td>
                        <td><AtBadge tone={campaign.track === 'private_506b' ? 'red' : 'blue'}>{campaign.track === 'private_506b' ? 'Rule 506(b)' : 'Reg CF'}</AtBadge></td>
                        <td><AtBadge tone={STATUS_TONE[campaign.status] || 'muted'}>{campaign.status}</AtBadge></td>
                        <td className="font-mono text-[10px] text-[var(--at-ink-2)]">{campaign.recipientCount}</td>
                        <td className="font-mono text-[10px] text-[var(--at-green)]">{campaign.sentCount || 0}</td>
                        <td className="font-mono text-[10px] text-[var(--at-red)]">{campaign.failedCount || 0}</td>
                        <td className="font-mono text-[10px] text-[var(--at-mut)]">{formatDate(campaign.createdAt)}</td>
                        <td className="text-right">
                          <button type="button" onClick={() => setExpandedCampaign((current) => current === campaign.id ? '' : campaign.id)} className="text-[10px] font-semibold text-[var(--at-gold)]">{expandedCampaign === campaign.id ? 'Hide' : 'View'}</button>
                        </td>
                      </tr>
                      {expandedCampaign === campaign.id && (
                        <tr>
                          <td colSpan="8" className="bg-[var(--at-soft)]">
                            <div className="grid gap-3 p-3 lg:grid-cols-2">
                              <div className="text-[10px] leading-relaxed text-[var(--at-mut)]">
                                <div><b className="text-[var(--at-ink)]">Subject:</b> {campaign.subject}</div>
                                <div className="mt-1"><b className="text-[var(--at-ink)]">Template:</b> <span className="font-mono">{campaign.templateId}</span></div>
                                <div className="mt-1"><b className="text-[var(--at-ink)]">Counsel:</b> {campaign.legal?.counselName || '—'} · {campaign.legal?.counselReference || '—'} · {formatDate(campaign.legal?.counselApprovedAt)}</div>
                                {campaign.error && <div className="mt-1 text-[var(--at-red)]">{campaign.error}</div>}
                              </div>
                              <div className="rounded-lg border border-[var(--at-line-soft)] bg-[var(--at-card-bg)] p-2">
                                <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--at-mut)]">Recent sends</div>
                                {campaign.recentSends?.length ? (
                                  <div className="mt-1 space-y-1">{campaign.recentSends.map((send) => <div key={`${campaign.id}-${send.email}-${send.sentAt}`} className="flex flex-wrap items-center justify-between gap-2 text-[9px]"><span className="font-mono text-[var(--at-ink-2)]">{send.email}</span><AtBadge tone={send.status === 'sent' ? 'green' : 'red'}>{send.status}</AtBadge></div>)}</div>
                                ) : <p className="mt-1 text-[9px] text-[var(--at-mut)]">No delivery rows yet.</p>}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <AtEmpty icon={Send} title="No campaigns yet" sub="Prepare a letter from the composer. A prepared campaign appears here before anything is sent." />}
        </AtPanel>

        <div className="mt-4 rounded-2xl border border-[var(--at-line-soft)] bg-[var(--at-soft)] p-4 text-[10px] leading-relaxed text-[var(--at-mut)]">
          <div className="flex items-start gap-2"><Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--at-gold)]" /><span><b className="text-[var(--at-ink)]">Legal boundary.</b> This page is an operational sender, not a legal opinion or an offering platform. Rule 506(b) prohibits general solicitation; Regulation CF requires the qualified offering statement and the registered intermediary. Counsel must approve the exact copy and audience. The platform records the approval you enter and never invents one.</span></div>
        </div>
      </div>
    </AdminLayout>
  );
}
