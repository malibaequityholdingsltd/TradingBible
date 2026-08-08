import React from 'react';
import { Link } from 'react-router-dom';
import Footer from '@/components/Footer';
import { TRADINGBIBLE_LOGO } from '@/lib/branding';
import { useAuth } from '@/hooks/useAuth';
import { homeRouteForUser } from '@/lib/homeRoute';

function PublicShell({ title, description, points }) {
  const { user, isAuthed } = useAuth();
  const homeTo = homeRouteForUser(isAuthed ? user : null);

  return (
    <div className="min-h-screen bg-[#07070a] px-6 pt-24 pb-16 sm:pt-28">
      <div className="mx-auto max-w-[96rem]">
        <Link to={homeTo} className="mb-10 flex items-center gap-2.5">
          <img src={TRADINGBIBLE_LOGO} alt="TradingBible logo" className="h-9 w-9 rounded-lg object-contain" />
          <span className="font-semibold">Trading<span className="gold-text">Bible</span></span>
        </Link>
        <div className="glass rounded-2xl p-6 sm:p-8">
          <h1 className="text-3xl font-bold text-[#f0ecdd] sm:text-4xl">{title}</h1>
          <p className="mt-2 max-w-3xl text-[#8a8577]">{description}</p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {points.map((point) => (
              <li key={point} className="rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-4 py-3 text-sm text-[#c9c4b4]">{point}</li>
            ))}
          </ul>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export const GuidesPage = () => (
  <PublicShell
    title="Trading Guides"
    description="Structured playbooks for market structure, risk management, execution, and journaling."
    points={['Forex and crypto setups', 'Daily and weekly review templates', 'Risk per trade frameworks', 'Psychology and discipline drills']}
  />
);

export const WebinarsPage = () => (
  <PublicShell
    title="Webinars"
    description="Live and recorded sessions with traders and educators in the TradingBible network."
    points={['Live market breakdowns', 'Q&A sessions', 'Prop-firm challenge prep', 'Performance coaching']}
  />
);

export const AcademyInfoPage = () => (
  <PublicShell
    title="Academy"
    description="Curriculum for individual traders, teams, schools, and teachers connected to TradingBible."
    points={['Beginner to advanced modules', 'Teacher assignment tools', 'Progress tracking', 'Certification-ready programs']}
  />
);

export const BlogPage = () => (
  <PublicShell
    title="TradingBible Blog"
    description="Market insights, product updates, and practical trading improvement articles."
    points={['Weekly market recap', 'Platform update notes', 'Case studies', 'Research and strategy essays']}
  />
);

export const CareersPage = () => (
  <PublicShell
    title="Careers"
    description="Join TradingBible to build the operating system for modern traders and trading education."
    points={['Remote-first team', 'Engineering and product roles', 'Trading education operations', 'Partnerships and growth']}
  />
);

export const ContactPage = () => (
  <PublicShell
    title="Contact"
    description="Get support, partnership help, school onboarding, or enterprise assistance."
    points={['Support: support@tradingbible.app', 'School onboarding assistance', 'Enterprise API support', 'Billing and account help']}
  />
);
