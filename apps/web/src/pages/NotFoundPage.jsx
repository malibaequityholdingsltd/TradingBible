import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Compass, FileQuestion, Search, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { homeRouteForUser } from '@/lib/homeRoute';
import PublicSiteShell from '@/components/PublicSiteShell';
import { GoldButton, GhostButton, Kicker } from '@/components/ui-kit';
import '@/styles/not-found.css';

function NotFoundContent({ pathname, homeTo, isAuthed }) {
  const inApp = pathname.startsWith('/app') || pathname === '/leaderboard';
  const inAdmin = pathname.startsWith('/admin');
  const inInvestor = pathname.startsWith('/investors') || pathname === '/stock' || pathname === '/stock/TB';
  const homeLabel = inAdmin ? 'Admin console' : inApp ? 'Member dashboard' : inInvestor ? 'Investor relations' : 'Public home';

  return (
    <section className={`not-found-page${inApp || inAdmin || inInvestor ? ' not-found-page--embedded' : ''}`}>
      <div className="not-found-card">
        <div className="not-found-orbit" aria-hidden="true">
          <span className="not-found-orbit__ring" />
          <span className="not-found-orbit__ring not-found-orbit__ring--two" />
          <span className="not-found-orbit__mark"><FileQuestion /></span>
        </div>
        <Kicker icon={Compass}>404 · Off the record</Kicker>
        <h1>This page left the record.</h1>
        <p>
          The route <code>{pathname}</code> does not exist in this build. Nothing was deleted from your account, and no data was changed.
        </p>
        <div className="not-found-actions">
          <GoldButton to={isAuthed ? homeTo : '/'}>{isAuthed ? homeLabel : 'Return to TradingBible'} <ArrowRight className="h-4 w-4" /></GoldButton>
          <GhostButton to="/contact"><Search className="h-4 w-4" /> Contact support</GhostButton>
        </div>
        <div className="not-found-links">
          <Link to="/"><ArrowLeft className="h-3.5 w-3.5" /> Public home</Link>
          <Link to="/programs">Programs</Link>
          <Link to="/team">Team</Link>
          <Link to="/tbc/documents">TBC documents</Link>
          <Link to={isAuthed ? homeTo : '/login'}>{isAuthed ? 'Dashboard' : 'Sign in'}</Link>
        </div>
        <div className="not-found-note">
          <ShieldCheck className="h-4 w-4" />
          <span>If you followed a link from inside the app, send us the route above and we will repair it.</span>
        </div>
      </div>
    </section>
  );
}

export default function NotFoundPage() {
  const { pathname } = useLocation();
  const { isAuthed, user } = useAuth();
  const homeTo = homeRouteForUser(isAuthed ? user : null);
  const wrapped =
    pathname.startsWith('/app') ||
    pathname.startsWith('/admin') ||
    pathname === '/leaderboard' ||
    pathname.startsWith('/investors') ||
    pathname === '/stock' ||
    pathname === '/stock/TB';

  const content = <NotFoundContent pathname={pathname} homeTo={homeTo} isAuthed={isAuthed} />;

  if (wrapped) return content;
  return <PublicSiteShell>{content}</PublicSiteShell>;
}
