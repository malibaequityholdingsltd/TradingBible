import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Marquee } from '@/components/PublicMotion';
import '@/styles/public-disclosure.css';

export const PUBLIC_TOPICS = [
  ['Product & Features', '/features'],
  ['Public Terminal', '/terminal'],
  ['Trading Journal', '/features/trading-journal'],
  ['SI Coach', '/features/si-coach'],
  ['Dashboard', '/features/dashboard'],
  ['Broker Integrations', '/features/broker-integrations'],
  ['Market Data', '/features/market-data'],
  ['Performance Analytics', '/features/performance-analytics'],
  ['Tools & Subscriptions', '/pricing'],
  ['Pricing', '/pricing'],
  ['TBC Token · Proposed', '/tbc'],
  ['API Access', '/features/api'],
  ['Premium Features', '/features/premium'],
  ['Trading Overview', '/features/trading-overview'],
  ['Community', '/community'],
  ['Education', '/academy'],
  ['Academy Courses', '/academy#courses'],
  ['Company', '/about'],
  ['Funded Programs', '/programs'],
  ['Affiliates', '/affiliates'],
  ['Launch · 25 Dec 2026', '/launch'],
  ['Investor Relations', '/investors'],
  ['Fundraising Status', '/fundraising'],
  ['Help Center', '/faq'],
  ['Contact', '/contact'],
];

export function PublicStatusStrip() {
  return (
    <div className="tb-public-status">
      <span className="tb-public-status__eyebrow">Fundraising status</span>
      <strong>No public offering open</strong>
      <span className="tb-public-status__note">
        Private company · pre-IPO · no funds requested · no approved SAFE, equity or token terms
      </span>
      <Link to="/fundraising" className="tb-public-status__link">
        Read the record <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </div>
  );
}

export function PublicTopicRail() {
  return (
    <div className="tb-topic-rail">
      <span className="tb-topic-rail__label">Explore</span>
      <Marquee
        items={PUBLIC_TOPICS.map(([label, to]) => (
          <Link key={to} to={to} className="tb-topic-rail__link">{label}</Link>
        ))}
        className="tb-topic-rail__marquee"
        speed={58}
        separator="·"
        minWidth={2400}
        label="Explore TradingBible topics"
      />
    </div>
  );
}

/** Compact, reusable status surface for public pages without the full footer. */
export default function PublicDisclosure({ rail = true, className = '' }) {
  return (
    <section className={`relative ${className}`} aria-label="Company and fundraising status">
      <PublicStatusStrip />
      {rail ? <div className="mt-2.5"><PublicTopicRail /></div> : null}
    </section>
  );
}
