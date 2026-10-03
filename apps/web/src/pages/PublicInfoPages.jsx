import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '@/components/Footer';
import { TRADINGBIBLE_LOGO } from '@/lib/branding';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/lib/i18n';
import { homeRouteForUser } from '@/lib/homeRoute';

function PublicShell({ titleKey, descKey, pointKeys }) {
  const { user, isAuthed } = useAuth();
  const { t } = useI18n();
  const homeTo = homeRouteForUser(isAuthed ? user : null);

  return (
    <div className="min-h-screen bg-[#07070a] px-6 pt-24 pb-16 sm:pt-28">
      <div className="mx-auto max-w-[96rem]">
        <Link to={homeTo} className="mb-10 flex items-center gap-2.5">
          <img src={TRADINGBIBLE_LOGO} alt="TradingBible logo" className="h-9 w-9 rounded-lg object-contain" />
          <span className="font-semibold">Trading<span className="gold-text">Bible</span></span>
        </Link>
        <div className="glass rounded-2xl p-6 sm:p-8">
          <h1 className="text-3xl font-bold text-[#f0ecdd] sm:text-4xl">{t(titleKey)}</h1>
          <p className="mt-2 max-w-3xl text-[#8a8577]">{t(descKey)}</p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {pointKeys.map((k) => (
              <li key={k} className="rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-4 py-3 text-sm text-[#c9c4b4]">{t(k)}</li>
            ))}
          </ul>
        </div>
      </div>
      <Footer />
    </div>
  );
}

const GUIDE_STEPS = [
  { n: '01', tk: 'guide.s1t', bk: 'guide.s1b', ck: 'guide.s1c', to: '/signup' },
  { n: '02', tk: 'guide.s2t', bk: 'guide.s2b', ck: 'guide.s2c', to: '/app/brokers' },
  { n: '03', tk: 'guide.s3t', bk: 'guide.s3b', ck: 'guide.s3c', to: '/app/terminal' },
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
      <div className="mx-auto max-w-[96rem]">
        <Link to={homeTo} className="mb-10 flex items-center gap-2.5">
          <img src={TRADINGBIBLE_LOGO} alt="TradingBible logo" className="h-9 w-9 rounded-lg object-contain" />
          <span className="font-semibold">Trading<span className="gold-text">Bible</span></span>
        </Link>
        <div className="mb-10 max-w-2xl">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-[#d4af37]">{t('guide.kicker')}</p>
          <h1 className="text-4xl font-bold text-[#f0ecdd] sm:text-5xl">{t('guide.titleA')} <span className="gold-text">{t('guide.titleB')}</span></h1>
          <p className="mt-3 text-[#8a8577]">{t('guide.sub')}</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {GUIDE_STEPS.map((s) => (
            <div key={s.n} className="glass glass-hover relative flex flex-col rounded-2xl p-6">
              <span className="font-mono text-3xl font-bold gold-text">{s.n}</span>
              <h3 className="mt-3 text-lg font-semibold text-[#f0ecdd]">{t(s.tk)}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-[#8a8577]">{t(s.bk)}</p>
              <Link to={s.to} className="mt-5 inline-flex items-center justify-center rounded-lg border border-[#d4af37]/25 py-2.5 text-center text-sm font-semibold transition text-[#e9e7df] hover:border-[#d4af37]/60">{t(s.ck)}</Link>
            </div>
          ))}
        </div>
        <div className="glass mt-8 rounded-2xl p-6 sm:p-8">
          <h2 className="text-xl font-bold text-[#f0ecdd]">{t('guide.playbooks')}</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {GUIDE_POINTS.map((k) => (
              <li key={k} className="rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-4 py-3 text-sm text-[#c9c4b4]">{t(k)}</li>
            ))}
          </ul>
        </div>
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
  />
);

export const CareersPage = () => {
  const { user, isAuthed } = useAuth();
  const { t } = useI18n();
  const homeTo = homeRouteForUser(isAuthed ? user : null);
  const [jobs, setJobs] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', coverLetter: '' });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

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
    try {
      const res = await fetch('/hcgi/api/jobs/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: openId, ...form }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'request failed');
      setDone(true);
      setForm({ name: '', email: '', phone: '', coverLetter: '' });
    } catch {
      setDone(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07070a] px-6 pt-24 pb-16 sm:pt-28">
      <div className="mx-auto max-w-[96rem]">
        <Link to={homeTo} className="mb-10 flex items-center gap-2.5">
          <img src={TRADINGBIBLE_LOGO} alt="TradingBible logo" className="h-9 w-9 rounded-lg object-contain" />
          <span className="font-semibold">Trading<span className="gold-text">Bible</span></span>
        </Link>
        <div className="mb-10 max-w-2xl">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-[#d4af37]">{t('pub.carKicker', null, 'TradingBible Academy')}</p>
          <h1 className="text-4xl font-bold text-[#f0ecdd] sm:text-5xl">{t('pub.carTitle')}</h1>
          <p className="mt-3 text-[#8a8577]">{t('pub.carDesc')}</p>
        </div>
        {jobs.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center text-sm text-[#8a8577]">{t('job.noOpenings')}</div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {jobs.map((j) => (
              <div key={j.id} className="glass glass-hover flex flex-col rounded-2xl p-6">
                <div className="text-xs font-medium uppercase tracking-[0.2em] text-[#d4af37]">{j.department} · {j.employmentType} · {j.location}</div>
                <h3 className="mt-2 text-xl font-semibold text-[#f0ecdd]">{j.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-[#8a8577]">{j.description}</p>
                {j.requirements && <p className="mt-2 text-xs text-[#6a665a]">{t('job.requirements')}: {j.requirements}</p>}
                <button onClick={() => { setOpenId(openId === j.id ? null : j.id); setDone(false); }} className="mt-5 rounded-lg border border-[#d4af37]/25 py-2.5 text-center text-sm font-semibold text-[#e9e7df] transition hover:border-[#d4af37]/60">{t('job.apply')}</button>
                {openId === j.id && (
                  done ? (
                    <p className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-center text-sm text-emerald-400">{t('job.applied')}</p>
                  ) : (
                    <form onSubmit={apply} className="mt-3 space-y-2">
                      <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder={t('job.namePh')} required className="w-full rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-4 py-2.5 text-sm text-[#f0ecdd] outline-none focus:border-[#d4af37]/40" />
                      <input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder={t('job.emailPh')} type="email" required className="w-full rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-4 py-2.5 text-sm text-[#f0ecdd] outline-none focus:border-[#d4af37]/40" />
                      <input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} placeholder={t('job.phonePh')} className="w-full rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-4 py-2.5 text-sm text-[#f0ecdd] outline-none focus:border-[#d4af37]/40" />
                      <textarea value={form.coverLetter} onChange={(e) => setForm((p) => ({ ...p, coverLetter: e.target.value }))} placeholder={t('job.coverPh')} className="min-h-[100px] w-full rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-4 py-2.5 text-sm text-[#f0ecdd] outline-none focus:border-[#d4af37]/40" />
                      <button disabled={busy} className="w-full rounded-lg bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] py-2.5 text-sm font-semibold text-[#0a0a0f] disabled:opacity-60">{t('job.sendApp')}</button>
                    </form>
                  )
                )}
              </div>
            ))}
          </div>
        )}
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
