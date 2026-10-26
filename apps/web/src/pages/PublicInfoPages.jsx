import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '@/components/Footer';
import ErrorBoundary from '@/components/ErrorBoundary';
import { AdSlot } from '@/lib/ads/components.jsx';
import { Card, EmptyState, GhostButton, GoldButton, PageHero } from '@/components/ui-kit';
import { AtBadge, AtHero } from '@/components/AtelierUI';
import { TRADINGBIBLE_LOGO } from '@/components/BrandLogo';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/lib/i18n';
import { homeRouteForUser } from '@/lib/homeRoute';

function PublicShell({ titleKey, descKey, pointKeys, adPlacementId }) {
  const { user, isAuthed } = useAuth();
  const { t } = useI18n();
  const homeTo = homeRouteForUser(isAuthed ? user : null);

  return (
    <div className="min-h-screen bg-[#07070a] px-6 pt-24 pb-16 sm:pt-28">
      <div className="mx-auto max-w-none">
        <Link to={homeTo} className="mb-10 flex items-center gap-2.5">
          <img src={TRADINGBIBLE_LOGO} alt="TradingBible logo" className="h-9 w-9 rounded-lg object-contain" />
          <span className="font-semibold">Trading<span className="tb-gold-text">Bible</span></span>
        </Link>
        <Card>
          <h1 className="text-3xl font-bold text-[#f0ecdd] sm:text-4xl">{t(titleKey)}</h1>
          <p className="mt-2 max-w-3xl text-[#8a8577]">{t(descKey)}</p>
          <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {pointKeys.map((k) => (
              <li key={k} className="rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-4 py-3 text-sm text-[#c9c4b4]">{t(k)}</li>
            ))}
          </ul>
        </Card>
        {adPlacementId && (
          <ErrorBoundary fallback={null}>
            <div className="mx-auto mt-6 max-w-3xl">
              <AdSlot placementId={adPlacementId} />
            </div>
          </ErrorBoundary>
        )}
      </div>
      <Footer />
    </div>
  );
}

const GUIDE_STEPS = [
  { n: '01', tk: 'guide.s1t', bk: 'guide.s1b', ck: 'guide.s1c', to: '/signup' },
  { n: '02', tk: 'guide.s2t', bk: 'guide.s2b', ck: 'guide.s2c', to: '/app/brokers' },
  { n: '03', tk: 'guide.s3t', bk: 'guide.s3b', ck: 'guide.s3c', to: '/app/terminal-pro' },
  { n: '04', tk: 'guide.s4t', bk: 'guide.s4b', ck: 'guide.s4c', to: '/app/journal' },
  { n: '05', tk: 'guide.s5t', bk: 'guide.s5b', ck: 'guide.s5c', to: '/app/coach' },
  { n: '06', tk: 'guide.s6t', bk: 'guide.s6b', ck: 'guide.s6c', to: '/app/academy' },
];

const GUIDE_POINTS = ['guide.p1', 'guide.p2', 'guide.p3', 'guide.p4'];

export const GuidesPage = () => {
  const { user, isAuthed } = useAuth();
  const { t } = useI18n();
  const homeTo = homeRouteForUser(isAuthed ? user : null);
  return (
    <div className="min-h-screen bg-[#07070a] px-6 pt-24 pb-16 sm:pt-28">
      <div className="mx-auto max-w-none">
        <Link to={homeTo} className="mb-10 flex items-center gap-2.5">
          <img src={TRADINGBIBLE_LOGO} alt="TradingBible logo" className="h-9 w-9 rounded-lg object-contain" />
          <span className="font-semibold">Trading<span className="tb-gold-text">Bible</span></span>
        </Link>
        <div className="mb-10 max-w-2xl">
          <PageHero
            kicker={t('guide.kicker')}
            title={t('guide.titleA')}
            accent={t('guide.titleB')}
            subtitle={t('guide.sub')}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
          {GUIDE_STEPS.map((s) => (
            <Card hover key={s.n} className="relative flex flex-col">
              <span className="font-mono text-3xl font-bold tb-gold-text">{s.n}</span>
              <h3 className="mt-3 text-lg font-semibold text-[#f0ecdd]">{t(s.tk)}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-[#8a8577]">{t(s.bk)}</p>
              <GhostButton to={s.to} className="mt-5 w-full">{t(s.ck)}</GhostButton>
            </Card>
          ))}
        </div>
        <Card className="mt-8">
          <h2 className="text-xl font-bold text-[#f0ecdd]">{t('guide.playbooks')}</h2>
          <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {GUIDE_POINTS.map((k) => (
              <li key={k} className="rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-4 py-3 text-sm text-[#c9c4b4]">{t(k)}</li>
            ))}
          </ul>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export const WebinarsPage = () => (
  <PublicShell
    titleKey="pub.webTitle"
    descKey="pub.webDesc"
    pointKeys={['pub.webP1', 'pub.webP2', 'pub.webP3', 'pub.webP4']}
  />
);

export const AcademyInfoPage = () => (
  <PublicShell
    titleKey="pub.acaTitle"
    descKey="pub.acaDesc"
    pointKeys={['pub.acaP1', 'pub.acaP2', 'pub.acaP3', 'pub.acaP4']}
  />
);

export const BlogPage = () => (
  <PublicShell
    titleKey="pub.blogTitle"
    descKey="pub.blogDesc"
    pointKeys={['pub.blogP1', 'pub.blogP2', 'pub.blogP3', 'pub.blogP4']}
    adPlacementId="ph_blog_feed"
  />
);

export const CareersPage = () => {
  const { user, isAuthed } = useAuth();
  const { t } = useI18n();
  const homeTo = homeRouteForUser(isAuthed ? user : null);
  const [jobs, setJobs] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', coverLetter: '', samples: '', website: '', answers: {} });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [applyErr, setApplyErr] = useState('');
  const resetForm = () => { setForm({ name: '', email: '', phone: '', coverLetter: '', samples: '', website: '', answers: {} }); setApplyErr(''); };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/hcgi/api/jobs');
        if (res.ok) setJobs(await res.json());
      } catch { /* board stays empty */ }
    })();
  }, []);

  const apply = async (e) => {
    e?.preventDefault?.();
    if (!openId || !form.name.trim() || !form.email.trim()) return;
    setBusy(true);
    setApplyErr('');
    try {
      const res = await fetch('/hcgi/api/jobs/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: openId, ...form }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'request failed');
      setDone(true);
      resetForm();
    } catch (err) {
      setDone(false);
      setApplyErr(err?.message || 'request failed');
    } finally {
      setBusy(false);
    }
  };
  const openJob = jobs.find((j) => j.id === openId) || null;
  const screeningQs = Array.isArray(openJob?.hiring?.screening) ? openJob.hiring.screening : [];
  const samplesRequired = openJob?.hiring?.samples_required === true;

  return (
    <div className="at-shell min-h-screen bg-transparent text-[var(--at-ink)]">
      <div className="at-page at-scope at-enter px-4 pb-16 pt-[calc(var(--header-h)+34px)] sm:px-6 sm:pt-[calc(var(--header-h)+46px)]">
        <Link to={homeTo} className="mb-8 inline-flex items-center gap-2.5">
          <img src={TRADINGBIBLE_LOGO} alt="TradingBible logo" className="h-9 w-9 rounded-lg object-contain" />
          <span className="text-sm font-semibold text-[var(--at-ink)]">Trading<span className="text-[var(--at-gold)]">Bible</span></span>
        </Link>
        <AtHero
          eyebrow={t('pub.carKicker', null, 'TradingBible Academy')}
          title={<>{t('pub.carTitle')}</>}
          description={t('pub.carDesc')}
          status={[
            { label: 'Open roles', value: jobs.length, tone: 'gold' },
            { label: 'Hiring model', value: 'Remote-first', tone: undefined },
            { label: 'Review', value: 'Human reviewed', tone: 'green' },
          ]}
          statusTitle="Hiring board"
          actions={<AtBadge tone="gold">Applications reviewed by a person, not a keyword filter</AtBadge>}
          bottom={(
            <div className="flex flex-wrap items-center gap-2">
              <span className="at-live-dot" />
              <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--at-mut)]">Open applications</span>
              <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--at-mut-2)]">TradingBible Academy</span>
            </div>
          )}
        />
        <div className="mt-6">
        {jobs.length === 0 ? (
          <EmptyState title={t('job.noOpenings')} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">
            {jobs.map((j) => (
              <Card hover key={j.id} className="at-card flex flex-col">
                <div className="text-xs font-medium uppercase tracking-[0.2em] text-[#d4af37]">{j.department} · {j.employmentType} · {j.location}</div>
                <h3 className="mt-2 text-xl font-semibold text-[var(--at-ink)]">{j.title}</h3>
                <p className="mt-2 flex-1 whitespace-pre-line text-sm leading-relaxed text-[var(--at-mut)]">{j.description}</p>
                {j.requirements && <p className="mt-2 text-xs leading-relaxed text-[var(--at-mut-2)]">{t('job.requirements')}: {j.requirements}</p>}
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-[#d4af37]/10 px-2 py-0.5 text-[10px] font-bold text-[#d4af37]">
                    {Number(j.hiring?.salary_tbc) > 0
                      ? `USD base + proposed TBC allocation (not issued) · ${j.hiring.salary_tbc} platform credit/mo`
                      : 'USD base + proposed TBC allocation (not issued)'}
                  </span>
                  {j.hiring?.closes_at && !Number.isNaN(Date.parse(j.hiring.closes_at)) && (
                    <span className="rounded-full bg-sky-400/10 px-2 py-0.5 text-[10px] font-bold text-sky-300">{t('job.closesAt', null, 'Apply by')} {String(j.hiring.closes_at).slice(0, 10)}</span>
                  )}
                </div>
                <GhostButton onClick={() => { setOpenId(openId === j.id ? null : j.id); setDone(false); setApplyErr(''); }} className="mt-5 w-full">{t('job.apply')}</GhostButton>
                {openId === j.id && (
                  done ? (
                    <p className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-center text-sm text-emerald-400">{t('job.applied')}</p>
                  ) : (
                    <form onSubmit={apply} className="mt-3 space-y-2">
                      <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder={t('job.namePh')} required className="w-full rounded-xl border border-[var(--at-line)] bg-[var(--at-panel)] px-4 py-3 text-sm text-[var(--at-ink)] outline-none focus:border-[var(--at-line-strong)]" />
                      <input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder={t('job.emailPh')} type="email" required className="w-full rounded-xl border border-[var(--at-line)] bg-[var(--at-panel)] px-4 py-3 text-sm text-[var(--at-ink)] outline-none focus:border-[var(--at-line-strong)]" />
                      <input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} placeholder={t('job.phonePh')} className="w-full rounded-xl border border-[var(--at-line)] bg-[var(--at-panel)] px-4 py-3 text-sm text-[var(--at-ink)] outline-none focus:border-[var(--at-line-strong)]" />
                      <textarea value={form.coverLetter} onChange={(e) => setForm((p) => ({ ...p, coverLetter: e.target.value }))} placeholder={t('job.coverPh')} className="min-h-[100px] w-full rounded-xl border border-[var(--at-line)] bg-[var(--at-panel)] px-4 py-3 text-sm text-[var(--at-ink)] outline-none focus:border-[var(--at-line-strong)]" />
                      {screeningQs.map((q, i) => (
                        <div key={i}>
                          <div className="mb-1 text-xs font-semibold text-[#d4af37]">{q?.q || `Question ${i + 1}`}{q?.required !== false ? ' *' : ''}</div>
                          <textarea value={form.answers[i] || ''} onChange={(e) => setForm((p) => ({ ...p, answers: { ...p.answers, [i]: e.target.value } }))} required={q?.required !== false} placeholder={t('job.answerPh', null, 'Your answer…')} className="min-h-[64px] w-full rounded-xl border border-[var(--at-line)] bg-[var(--at-panel)] px-4 py-3 text-sm text-[var(--at-ink)] outline-none focus:border-[var(--at-line-strong)]" />
                        </div>
                      ))}
                      <div>
                        <div className="mb-1 text-xs font-semibold text-[#d4af37]">{t('job.samplesPh', null, 'Links to your work (portfolio, profile, samples)')}{samplesRequired ? ' *' : ''}</div>
                        <textarea value={form.samples} onChange={(e) => setForm((p) => ({ ...p, samples: e.target.value }))} required={samplesRequired} placeholder="https://…" className="min-h-[56px] w-full rounded-xl border border-[var(--at-line)] bg-[var(--at-panel)] px-4 py-3 text-sm text-[var(--at-ink)] outline-none focus:border-[var(--at-line-strong)]" />
                      </div>
                      {/* Honeypot: invisible to humans, irresistible to bots. */}
                      <div aria-hidden style={{ position: 'absolute', left: '-9999px', top: 'auto', width: 1, height: 1, overflow: 'hidden' }}>
                        <input value={form.website} onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))} placeholder="Website" tabIndex={-1} autoComplete="off" />
                      </div>
                      {applyErr && <p className="rounded-xl border border-red-400/30 bg-red-400/5 p-2.5 text-center text-xs text-red-300">{applyErr}</p>}
                      <GoldButton disabled={busy} className="w-full">{t('job.sendApp')}</GoldButton>
                    </form>
                  )
                )}
              </Card>
            ))}
          </div>
        )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export const ContactPage = () => (
  <PublicShell
    titleKey="pub.conTitle"
    descKey="pub.conDesc"
    pointKeys={['pub.conP1', 'pub.conP2', 'pub.conP3', 'pub.conP4']}
  />
);
