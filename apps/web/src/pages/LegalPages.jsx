import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import Footer from '@/components/Footer';
import { useAuth } from '@/hooks/useAuth';
import { homeRouteForUser } from '@/lib/homeRoute';

const UPDATED = 'August 2025';
const MALIBA_LOGO = 'https://horizons-cdn.hostinger.com/31a01204-0f8d-4aa3-a78b-78fb8b946e53/5c8275966b855914cc3eec21e6f6ed03.png';

function LegalShell({ title, subtitle, children }) {
  const { user, isAuthed } = useAuth();
  const homeTo = homeRouteForUser(isAuthed ? user : null);

  return (
    <div className="min-h-screen bg-[#07070a] pt-[var(--header-h)] text-[#e9e7df]">
      <header className="border-b border-[#d4af37]/10 bg-[#07070a]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[96rem] items-center justify-end px-6 py-4">
          <Link to={homeTo} className="flex items-center gap-1.5 text-sm text-[#8a8577] transition hover:text-[#e9e7df]"><ArrowLeft className="h-4 w-4" /> Back home</Link>
        </div>
      </header>

      <div className="mx-auto max-w-[72rem] px-6 py-16">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-[#d4af37]">Legal · Last updated {UPDATED}</p>
        <h1 className="text-4xl font-bold sm:text-5xl">{title}</h1>
        {subtitle && <p className="mt-4 max-w-2xl text-[#b3ae9e]">{subtitle}</p>}
        <div className="mt-10 space-y-8">{children}</div>

        <div className="mt-16 flex items-center gap-3 border-t border-[#d4af37]/10 pt-8">
          <img src={MALIBA_LOGO} alt="MALIBA EQUITY HOLDINGS LTD" className="h-11 w-11 rounded-lg object-contain" />
          <p className="text-xs leading-relaxed text-[#6a665a]">These terms are published by <span className="text-[#c9c4b4]">MALIBA EQUITY HOLDINGS LTD</span>, owner and operator of TradingBible.</p>
        </div>
        <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 border-t border-[#d4af37]/10 pt-8 text-sm text-[#8a8577]">
          <Link to="/terms" className="hover:text-[#e9e7df]">Terms of Service</Link>
          <Link to="/policy" className="hover:text-[#e9e7df]">Privacy Policy</Link>
          <Link to="/refund" className="hover:text-[#e9e7df]">Refund Policy</Link>
          <Link to="/faq" className="hover:text-[#e9e7df]">FAQ</Link>
          <Link to="/pricing" className="hover:text-[#e9e7df]">Pricing</Link>
        </div>
      </div>
      <Footer />
    </div>
  );
}

function Section({ heading, children }) {
  return (
    <section>
      <h2 className="mb-3 text-xl font-semibold text-[#f0ecdd]">{heading}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-[#b3ae9e]">{children}</div>
    </section>
  );
}

export function TermsPage() {
  return (
    <LegalShell title="Terms of Service" subtitle="These Terms of Service (the &quot;Terms&quot;) form a binding agreement between you and MALIBA EQUITY HOLDINGS LTD (&quot;MALIBA&quot;, &quot;we&quot;, &quot;us&quot;), owner and operator of TradingBible (the &quot;Service&quot;). By creating an account or using the Service you accept these Terms in full.">
      <Section heading="1. Eligibility and acceptance">
        <p>You confirm that you are at least 18 years old and legally capable of entering into a binding contract in your jurisdiction. If you use the Service on behalf of an entity, you represent that you are authorised to bind that entity. The Service is not offered where prohibited by law, and you are responsible for compliance with all laws applicable to you.</p>
      </Section>
      <Section heading="2. Nature of the Service — not financial advice">
        <p>TradingBible is a trading journal, analytics, education, and account-aggregation tool. Nothing produced by the platform — including AI-generated reviews, coaching messages, scores, signals, heatmaps, economic-calendar data, watchlists, or statistics — constitutes financial, investment, tax, accounting, or legal advice, a solicitation, or a recommendation to buy, sell, or hold any instrument. We are not a broker-dealer, investment adviser, or fiduciary. You make all trading decisions independently and at your own risk.</p>
      </Section>
      <Section heading="3. Risk disclosure">
        <p>Trading foreign exchange, CFDs, futures, equities, options, and crypto assets involves substantial risk and is not suitable for every investor. Leverage magnifies both gains and losses and you may lose more than your initial deposit. Markets are volatile and prices may move rapidly against you. Past performance, back-tests, hypothetical results, and any figures displayed in the Service are not indicative of future results. We do not guarantee any profit or protection against loss. You should not trade with money you cannot afford to lose and should seek independent professional advice where appropriate.</p>
      </Section>
      <Section heading="4. Account balances and broker connections">
        <p>New accounts start with a zero balance. Balances displayed in the Service are populated only after you connect a live brokerage or prop-firm account; demo accounts are not supported. Connections are made using read-oriented API keys or OAuth authorisations that you provide; you must not share credentials granting withdrawal rights, and you may revoke access at any time. Balances, trades, and figures synced from third parties are provided for informational purposes only and may differ from your broker&apos;s official records, which prevail.</p>
      </Section>
      <Section heading="5. Accounts and security">
        <p>You are responsible for maintaining the confidentiality of your credentials and for all activity under your account. Enable two-factor authentication where available and notify us immediately of any unauthorised use.</p>
      </Section>
      <Section heading="6. Subscriptions, billing, and taxes">
        <p>Paid plans are billed in advance on a recurring basis through our payment processor, Paddle, acting as merchant of record. Prices are shown at checkout, are exclusive of applicable taxes unless stated, and may change with prior notice. Your subscription renews automatically until cancelled. Cancellation stops future renewals but does not retroactively refund the current term except as set out in our Refund Policy. You are responsible for any taxes arising from your use of the Service.</p>
      </Section>
      <Section heading="7. Acceptable use">
        <p>You agree not to: (a) reverse engineer, decompile, scrape, or resell the Service; (b) upload unlawful, infringing, or misleading content; (c) use the Service to facilitate market manipulation, insider dealing, money laundering, fraud, or any illegal activity; (d) attempt to disrupt, overload, or gain unauthorised access to our systems or other users&apos; data; or (e) circumvent usage limits or security controls. Violations may result in immediate suspension or termination and referral to authorities.</p>
      </Section>
      <Section heading="8. Intellectual property">
        <p>All software, design, trademarks, and content provided by TradingBible and MALIBA remain our exclusive property. You retain ownership of the trade data and notes you submit and grant us a limited, worldwide, royalty-free licence to host and process that data solely to operate and improve the Service for you. &quot;TradingBible&quot; and associated marks may not be used without written permission.</p>
      </Section>
      <Section heading="9. Disclaimers of warranty">
        <p>The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, whether express, implied, or statutory, including merchantability, fitness for a particular purpose, accuracy, and non-infringement. We do not warrant that the Service will be uninterrupted, error-free, secure, or that data (including third-party market and broker data) is accurate, complete, or timely.</p>
      </Section>
      <Section heading="10. Limitation of liability">
        <p>To the maximum extent permitted by law, MALIBA, its affiliates, officers, and suppliers shall not be liable for any trading losses, lost profits, lost data, loss of goodwill, or any indirect, incidental, special, consequential, or punitive damages arising from or related to the Service, even if advised of the possibility. Our aggregate liability for any claim shall not exceed the greater of (a) the total fees you paid to us in the twelve months preceding the event giving rise to the claim, or (b) USD 100. Some jurisdictions do not allow certain exclusions, so parts of this section may not apply to you.</p>
      </Section>
      <Section heading="11. Indemnification">
        <p>You agree to defend, indemnify, and hold harmless MALIBA, its affiliates, and their respective directors, officers, employees, and agents from and against any claims, liabilities, damages, losses, and expenses (including reasonable legal fees) arising out of or connected with your use of the Service, your trading activity, your content, or your breach of these Terms or applicable law.</p>
      </Section>
      <Section heading="12. Termination">
        <p>We may suspend or terminate your account at any time for violation of these Terms, suspected fraud, or legal requirement. You may close your account at any time from your profile settings. Sections that by their nature should survive termination (including IP, disclaimers, liability, indemnity, and governing law) will survive.</p>
      </Section>
      <Section heading="13. Governing law and dispute resolution">
        <p>These Terms are governed by the laws of England and Wales, without regard to conflict-of-law rules. The courts of England and Wales shall have exclusive jurisdiction, save that we may seek injunctive relief in any competent court. Before commencing formal proceedings, the parties agree to attempt good-faith resolution by contacting legal@tradingbible.app. Nothing in this section affects mandatory consumer-protection rights available to you in your country of residence.</p>
      </Section>
      <Section heading="14. Changes and contact">
        <p>We may update these Terms from time to time; material changes will be notified in-app or by email, and continued use constitutes acceptance. Questions about these Terms can be sent to legal@tradingbible.app or to MALIBA EQUITY HOLDINGS LTD, the operator of TradingBible.</p>
      </Section>
    </LegalShell>
  );
}

export function PolicyPage() {
  return (
    <LegalShell title="Privacy Policy" subtitle="This policy explains what data TradingBible (operated by MALIBA EQUITY HOLDINGS LTD, the data controller) collects, why we collect it, and the choices you have. It is designed to comply with the EU/UK GDPR, the California Consumer Privacy Act (CCPA/CPRA), and other applicable data-protection laws.">
      <Section heading="1. Data we collect">
        <p>We collect: (a) account data (email, username, phone, authentication metadata for one-time code access); (b) profile preferences (primary market, experience, goals); (c) trading data synced from brokers and prop firms you connect (symbols, entries, exits, sizes, P&amp;L, balances, timestamps); (d) billing metadata processed by Paddle; and (e) technical logs, device, and usage data needed to secure and operate the Service.</p>
      </Section>
      <Section heading="2. Legal bases (GDPR)">
        <p>We process personal data on the bases of: performance of our contract with you (providing the Service); our legitimate interests (securing, improving, and analysing the Service); compliance with legal obligations; and your consent where required (e.g. certain communications). You may withdraw consent at any time.</p>
      </Section>
      <Section heading="3. How we use your data">
        <p>To operate the journal, compute analytics, power AI reviews and coaching, process billing through Paddle, prevent fraud and abuse, comply with law, and send service notifications such as reports and security alerts. AI processing generates insights for you and is not used to train third-party public models.</p>
      </Section>
      <Section heading="4. Broker and prop-firm connections">
        <p>Credentials and API keys are encrypted in transit and at rest, scoped to the minimum permissions required to read trade history and balances, and are never used to place orders or move funds. You can disconnect an account and delete its data at any time.</p>
      </Section>
      <Section heading="5. Sharing and international transfers">
        <p>We do not sell your personal data. We share limited data with processors strictly to run the Service — for example our payment processor (Paddle), infrastructure and hosting providers, and the AI provider used to generate your reports — each bound by confidentiality and data-processing obligations. Where data is transferred internationally, we rely on appropriate safeguards such as Standard Contractual Clauses.</p>
      </Section>
      <Section heading="6. Data retention">
        <p>We keep personal data only as long as needed for the purposes described or as required by law. Trading and account data are retained while your account is active. When you delete your account, associated trade and broker records are removed, subject to records we must retain for legal or fraud-prevention purposes.</p>
      </Section>
      <Section heading="7. Your rights">
        <p>Depending on your jurisdiction you may have rights to access, correct, delete, port, restrict, or object to processing of your data, and to opt out of the &quot;sale&quot; or &quot;sharing&quot; of personal information (we do not sell). California residents have rights under the CCPA/CPRA, and EU/UK residents under the GDPR, including the right to lodge a complaint with a supervisory authority. Exercise your rights via your account settings or by emailing privacy@tradingbible.app; we will not discriminate against you for doing so.</p>
      </Section>
      <Section heading="8. Security">
        <p>We apply row-level access controls, encryption in transit and at rest, isolated per-user data, and protected APIs. No system is perfectly secure, but we work continuously to safeguard your information and will notify you and regulators of qualifying breaches as required by law.</p>
      </Section>
      <Section heading="9. Cookies">
        <p>We use essential cookies and similar technologies to keep you signed in and to secure and operate the Service, and limited analytics to improve it. You can control non-essential cookies through your browser settings.</p>
      </Section>
      <Section heading="10. Children">
        <p>The Service is not directed to individuals under 18 and we do not knowingly collect their data. If you believe a minor has provided us data, contact us for deletion.</p>
      </Section>
      <Section heading="11. Contact">
        <p>Privacy questions and data requests can be sent to privacy@tradingbible.app or to the data controller, MALIBA EQUITY HOLDINGS LTD.</p>
      </Section>
    </LegalShell>
  );
}

export function RefundPage() {
  return (
    <LegalShell title="Refund Policy" subtitle="We want you to trade with confidence in the platform, not just the markets. Here is exactly how refunds work.">
      <Section heading="1. Free trial first">
        <p>Every new account starts with a 7-day premium trial that requires no card. We encourage you to use the trial fully so you can evaluate the Service before paying.</p>
      </Section>
      <Section heading="2. 14-day money-back guarantee">
        <p>If you upgrade to a paid plan and are not satisfied, you may request a full refund within 14 days of your first payment on that plan. Contact billing@tradingbible.app from your account email and we will process the refund to your original payment method.</p>
      </Section>
      <Section heading="3. Renewals">
        <p>Subscription renewals are generally non-refundable. To avoid being charged for the next term, cancel at least 24 hours before your renewal date from your profile settings. Cancelling immediately stops future billing while keeping access until the end of the paid period.</p>
      </Section>
      <Section heading="4. Non-refundable items">
        <p>The following are non-refundable except where required by law: (a) subscription periods used beyond the 14-day guarantee window; (b) partial or unused portions of a term after the guarantee window; (c) add-ons or one-time fees expressly marked non-refundable at checkout; and (d) accounts terminated for breach of our Terms, fraud, or abuse.</p>
      </Section>
      <Section heading="5. Exceptions and goodwill">
        <p>We may issue prorated or goodwill refunds at our discretion in cases of extended service outages or duplicate charges. Refunds are handled through Paddle, our merchant of record, and may take 5–10 business days to appear on your statement.</p>
      </Section>
      <Section heading="6. Chargebacks and dispute process">
        <p>Please contact us before initiating a chargeback so we can resolve the issue directly and quickly. Email billing@tradingbible.app with your account email and reason; most requests are answered within one business day. If you remain dissatisfied, disputes are handled under the governing law and dispute-resolution provisions of our Terms of Service.</p>
      </Section>
      <Section heading="7. Statutory rights">
        <p>Nothing in this Refund Policy limits any non-waivable statutory refund or cancellation rights you may have as a consumer in your country of residence.</p>
      </Section>
    </LegalShell>
  );
}

const FAQS = [
  { q: 'Is TradingBible financial advice?', a: 'No. TradingBible is a journaling and analytics tool. Our AI reviews and scores are educational and reflect your own historical data — they are never buy/sell recommendations.' },
  { q: 'How does broker sync work?', a: 'You connect a broker using read-oriented API keys or OAuth. We import your historical and ongoing trades automatically into your journal, dashboard, and AI reports. Credentials are encrypted and never used to place trades or withdraw funds.' },
  { q: 'Which brokers are supported?', a: 'MetaTrader 4, MetaTrader 5, cTrader, DXtrade, Interactive Brokers, Binance, Bybit, and Coinbase. More integrations are added regularly.' },
  { q: 'Do I need a credit card for the trial?', a: 'No. The 7-day premium trial requires no card. You only add payment details if you choose to continue on a paid plan.' },
  { q: 'Can I cancel anytime?', a: 'Yes. Cancel from your profile settings in a couple of clicks. You keep access until the end of your current billing period, and no further charges are made.' },
  { q: 'How is my data protected?', a: 'We use row-level security, encrypted storage, isolated per-user data, and protected APIs. Your trade data is only used to generate insights for you.' },
  { q: 'What does the AI Coach actually do?', a: 'It reviews your trades for quality, risk, and discipline, detects recurring mistakes, and answers questions grounded in your real history, such as “What is my biggest mistake?” or “Which strategy works best for me?”.' },
  { q: 'How do I get a refund?', a: 'We offer a 14-day money-back guarantee on your first payment for a plan. Email billing@tradingbible.app — see our Refund Policy for full details.' },
];

export function FaqPage() {
  const [open, setOpen] = React.useState(0);
  return (
    <LegalShell title="Frequently asked questions" subtitle="Everything you need to know about TradingBible, broker sync, billing, and the AI coach. Still stuck? Email support@tradingbible.app.">
      <div className="divide-y divide-[#d4af37]/10 rounded-2xl border border-[#d4af37]/10">
        {FAQS.map((f, i) => {
          const isOpen = open === i;
          return (
            <div key={f.q}>
              <button onClick={() => setOpen(isOpen ? -1 : i)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left">
                <span className="font-medium text-[#f0ecdd]">{f.q}</span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-[#d4af37] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && <p className="px-5 pb-5 text-sm leading-relaxed text-[#b3ae9e]">{f.a}</p>}
            </div>
          );
        })}
      </div>
    </LegalShell>
  );
}
