import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Bug, CreditCard, Database, Fingerprint, KeyRound, LockKeyhole,
  Mail, ServerCog, ShieldCheck, Wallet,
} from 'lucide-react';
import Footer from '@/components/Footer';
import { AtAlert, AtBadge, AtButton, AtHero, AtPanel } from '@/components/AtelierUI';
import { TRADINGBIBLE_LOGO } from '@/components/BrandLogo';
import { useAuth } from '@/hooks/useAuth';
import { homeRouteForUser } from '@/lib/homeRoute';

const CONTROLS = [
  {
    icon: LockKeyhole,
    title: 'Authentication',
    copy: 'Passwordless email codes, optional authenticator-app TOTP, passkeys/WebAuthn, and login notifications. Admin routes require a verified staff session in addition to the admin role.',
    label: 'Account access',
  },
  {
    icon: Database,
    title: 'Data isolation',
    copy: 'Row-level security keeps each subscriber’s journal, trades and analytics isolated. Service-role access is held server-side and is never exposed to the browser.',
    label: 'Tenant separation',
  },
  {
    icon: ServerCog,
    title: 'Broker connections',
    copy: 'Broker credentials are encrypted and read-only by default. TradingBible does not place trades, move funds or withdraw from a connected brokerage account.',
    label: 'Read-only sync',
  },
  {
    icon: CreditCard,
    title: 'Payments',
    copy: 'Card payments are processed by Stripe. TradingBible does not store full card numbers. Wallet and platform-credit ledgers are separate from brokerage balances.',
    label: 'PCI boundary',
  },
  {
    icon: Fingerprint,
    title: 'Sessions',
    copy: 'Short-lived access tokens, revocable sessions, verified-email enforcement and account closure controls. Security-sensitive actions are audited server-side.',
    label: 'Session control',
  },
  {
    icon: Wallet,
    title: 'TBC separation',
    copy: 'TBC platform credits are off-chain accounting units. The proposed TBC token is not issued, not sold, and has no live transfer, staking, governance, migration or chain surface.',
    label: 'No token custody',
  },
];

export default function SecurityInfoPage() {
  const { user, isAuthed } = useAuth();
  const homeTo = homeRouteForUser(isAuthed ? user : null);

  return (
    <div className="at-scope min-h-screen bg-[var(--at-bg0)] pt-[var(--header-h)] text-[var(--at-ink)]">
      <div className="at-page at-enter px-5 py-8 sm:px-8 sm:py-12">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link to={homeTo} className="flex items-center gap-2.5">
            <img src={TRADINGBIBLE_LOGO} alt="TradingBible" className="h-9 w-9 rounded-[10px] border border-[var(--at-line)] bg-[var(--at-panel)] object-contain p-0.5" />
            <span className="text-sm font-semibold tracking-tight text-[var(--at-ink)]">TradingBible</span>
          </Link>
          <AtButton to="/faq" variant="quiet" size="sm" icon={ArrowLeft}>Help center</AtButton>
        </div>

        <AtHero
          eyebrow="Trust & security"
          icon={ShieldCheck}
          title={<>Security is a <em>system.</em></>}
          description="How account access, broker data, payments and the proposed TBC token are separated. This page describes controls in place today; it is not a certification or an audit opinion."
          status={[
            { label: 'Account auth', value: 'TOTP · passkeys', tone: 'green' },
            { label: 'Data boundary', value: 'RLS · per user', tone: 'green' },
            { label: 'Broker access', value: 'Read-only', tone: 'gold' },
            { label: 'TBC token', value: 'Not issued', tone: 'amber' },
          ]}
          statusTitle="Current posture"
          statusNote="No SOC 2, ISO 27001 or equivalent certification is claimed. A formal audit requires an independent assessor and a signed engagement."
          actions={(
            <>
              <AtButton href="mailto:security@tradingbible.app?subject=Security%20report" variant="gold" icon={Mail}>Report a vulnerability</AtButton>
              <AtButton to="/terms" variant="outline" icon={KeyRound}>Terms of service</AtButton>
            </>
          )}
        />

        <div className="mt-4">
          <AtAlert icon={Bug} tone="amber">
            <b className="text-[var(--at-ink)]">Responsible disclosure.</b> Email security@tradingbible.app with reproduction steps and impact. Do not access another person’s data, disrupt the service, or publish details before we have had a reasonable opportunity to remediate. We aim to acknowledge reports within three business days.
          </AtAlert>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {CONTROLS.map(({ icon: Icon, title, copy, label }) => (
            <article key={title} className="at-card at-card--hover p-5">
              <div className="flex items-start justify-between gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--at-line)] bg-[var(--at-gold-soft)] text-[var(--at-gold)]">
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                </span>
                <AtBadge tone="gold">{label}</AtBadge>
              </div>
              <h2 className="mt-4 text-[15px] font-semibold tracking-[-0.02em] text-[var(--at-ink)]">{title}</h2>
              <p className="mt-2 text-[12px] leading-relaxed text-[var(--at-mut)]">{copy}</p>
            </article>
          ))}
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <AtPanel
            eyebrow="Boundaries"
            title="What TradingBible will never do"
            sub="These are product and control boundaries, not marketing claims."
          >
            <ul className="grid gap-2 text-[12px] leading-relaxed text-[var(--at-ink-2)] sm:grid-cols-2">
              <li className="rounded-xl border border-[var(--at-line-soft)] bg-[var(--at-soft)] p-3">Place a trade or withdraw funds from a connected brokerage account.</li>
              <li className="rounded-xl border border-[var(--at-line-soft)] bg-[var(--at-soft)] p-3">Use one subscriber’s journal or trade data to generate another subscriber’s SI insights.</li>
              <li className="rounded-xl border border-[var(--at-line-soft)] bg-[var(--at-soft)] p-3">Treat a signed legal instrument as a license, regulatory approval or clearance.</li>
              <li className="rounded-xl border border-[var(--at-line-soft)] bg-[var(--at-soft)] p-3">Present an unlaunched TBC token operation as live, purchasable or transferable.</li>
            </ul>
          </AtPanel>

          <AtPanel eyebrow="Contact" title="Security desk" sub="Use the dedicated address for vulnerability reports and data-protection requests.">
            <a href="mailto:security@tradingbible.app" className="flex items-center gap-3 rounded-xl border border-[var(--at-line)] bg-[var(--at-gold-soft)] p-3 text-sm font-semibold text-[var(--at-gold)] transition hover:border-[var(--at-line-strong)]">
              <Mail className="h-4 w-4" />
              security@tradingbible.app
            </a>
            <p className="mt-3 text-[11px] leading-relaxed text-[var(--at-mut)]">
              TradingBible LLC · Delaware, United States. For account access or billing, use the Help Center or support@tradingbible.app.
            </p>
          </AtPanel>
        </div>

        <p className="mt-6 text-center text-[10px] leading-relaxed text-[var(--at-mut-2)]">
          Last reviewed October 2026. Security controls evolve; this page is updated when the underlying systems change.
        </p>
      </div>
      <Footer />
    </div>
  );
}
