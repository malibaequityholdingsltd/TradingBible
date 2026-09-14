import React from 'react';
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

export const CareersPage = () => (
  <PublicShell
    titleKey="pub.carTitle"
    descKey="pub.carDesc"
    pointKeys={['pub.carP1', 'pub.carP2', 'pub.carP3', 'pub.carP4']}
  />
);

export const ContactPage = () => (
  <PublicShell
    titleKey="pub.conTitle"
    descKey="pub.conDesc"
    pointKeys={['pub.conP1', 'pub.conP2', 'pub.conP3', 'pub.conP4']}
  />
);
