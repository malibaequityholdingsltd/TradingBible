import React from 'react';
import { Link } from 'react-router-dom';
import { Twitter, Facebook, Linkedin, Instagram, Youtube, LineChart } from 'lucide-react';
import { MALIBA_LOGO, TRADINGBIBLE_LOGO } from '@/lib/branding';
import { useAuth } from '@/hooks/useAuth';
import { homeRouteForUser } from '@/lib/homeRoute';
import { usePlatformSettings } from '@/lib/platformSettings';

const LOGO = TRADINGBIBLE_LOGO;

// TikTok isn't in lucide-react; a small inline glyph keeps the icon set consistent.
function TikTokIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M16.6 5.82a4.28 4.28 0 0 1-2.63-3.63V2h-3.2v13.4a2.6 2.6 0 1 1-2.13-2.56V9.53a5.87 5.87 0 0 0 .13 11.7 5.94 5.94 0 0 0 5.9-5.95V9.4a7.4 7.4 0 0 0 4.13 1.26V7.4a4.24 4.24 0 0 1-2.2-1.58Z" />
    </svg>
  );
}

const COLUMNS = [
  {
    heading: 'Product & Features',
    links: [
      { label: 'Trading Journal', to: '/app/journal' },
      { label: 'AI Coach', to: '/app/coach' },
      { label: 'Dashboard', to: '/app' },
      { label: 'Broker Integrations', to: '/app/brokers' },
      { label: 'Market Data', to: '/' },
      { label: 'Performance Analytics', to: '/app' },
    ],
  },
  {
    heading: 'Tools & Subscriptions',
    links: [
      { label: 'Features Overview', to: '/' },
      { label: 'Pricing', to: '/pricing' },
      { label: 'Plans Comparison', to: '/pricing' },
      { label: 'API Access', to: '/pricing' },
      { label: 'Premium Features', to: '/pricing' },
    ],
  },
  {
    heading: 'Trading',
    links: [
      { label: 'Trading Overview', to: '/' },
      { label: 'Broker Connections', to: '/app/brokers' },
      { label: 'Strategy Analysis', to: '/app' },
      { label: 'Risk Management', to: '/app/coach' },
      { label: 'Trade History', to: '/app/journal' },
    ],
  },
  {
    heading: 'Community',
    links: [
      { label: 'Social Network', to: '/app/community' },
      { label: 'Refer a Friend', to: '/pricing' },
      { label: 'Trading Community', to: '/app/community' },
      { label: 'Discussion Forums', to: '/app/community' },
      { label: 'Moderators', to: '/about' },
    ],
  },
  {
    heading: 'Education',
    links: [
      { label: 'Trading Guides', to: '/guides' },
      { label: 'Video Tutorials', to: '/academy' },
      { label: 'Academy Courses', to: '/app/academy' },
      { label: 'Webinars', to: '/webinars' },
      { label: 'Learning Resources', to: '/academy' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About TradingBible', to: '/about' },
      { label: 'Our Mission', to: '/about' },
      { label: 'Blog', to: '/blog' },
      { label: 'Help Center', to: '/faq' },
      { label: 'Careers', to: '/careers' },
      { label: 'Contact', to: '/contact' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Terms of Service', to: '/terms' },
      { label: 'Privacy Policy', to: '/policy' },
      { label: 'Refund Policy', to: '/refund' },
      { label: 'Cookie Policy', to: '/policy' },
      { label: 'Security', to: '/policy' },
    ],
  },
];

const SOCIALS = [
  { label: 'Twitter', icon: Twitter, href: 'https://twitter.com/tradingbible' },
  { label: 'Facebook', icon: Facebook, href: 'https://facebook.com/tradingbible' },
  { label: 'LinkedIn', icon: Linkedin, href: 'https://linkedin.com/company/tradingbible' },
  { label: 'Instagram', icon: Instagram, href: 'https://instagram.com/tradingbible' },
  { label: 'YouTube', icon: Youtube, href: 'https://youtube.com/@tradingbible' },
  { label: 'TikTok', icon: TikTokIcon, href: 'https://tiktok.com/@tradingbible' },
];

export default function Footer() {
  const { user, isAuthed } = useAuth();
  const homeTo = homeRouteForUser(isAuthed ? user : null);
  const { settings } = usePlatformSettings();
  const brand = String(settings.platformName || 'TradingBible').trim();
  const words = brand.split(/\s+/);
  const first = words.slice(0, -1).join(' ');
  const last = words[words.length - 1] || '';
  const trialDays = Number(settings.trialDays) || 7;

  return (
    <footer className="border-t border-[#d4af37]/12 bg-[#0a0a0f]">
      <div className="mx-auto max-w-[96rem] px-6 pt-16 pb-10">
        {/* Brand + blurb + socials */}
        <div className="flex flex-col gap-8 border-b border-[#d4af37]/10 pb-10 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-sm">
            <Link to={homeTo} className="mb-4 flex items-center gap-2.5">
              <img src={LOGO} alt={`${brand} logo`} className="h-9 w-9 rounded-lg object-contain" />
              <span className="font-semibold tracking-tight text-[#f0ecdd]">{first ? `${first} ` : ''}<span className="gold-text">{last}</span></span>
            </Link>
            <p className="text-sm leading-relaxed text-[#8a8577]">
              The AI-powered trading journal built on a Bloomberg-grade terminal. TradingBible unifies broker sync, institutional-style analytics, and a personal AI coach so serious traders can track every edge and eliminate every avoidable mistake.
            </p>
            <div className="mt-4 flex items-start gap-3">
              <img src={MALIBA_LOGO} alt="TradingBible LLC" className="h-12 w-12 shrink-0 rounded-lg object-contain" />
              <p className="text-xs leading-relaxed text-[#6a665a]">
                TradingBible is owned and operated by <span className="text-[#c9c4b4]">TradingBible LLC</span>.
                <br />Registered in Delaware, USA. c/o Delaware Registered Agent, Inc.
                <br />Our mission: give every trader the institutional-grade tools, data, and discipline once reserved for professional funds.
              </p>
            </div>
            <div className="mt-5 flex items-center gap-3">
              {SOCIALS.map(({ label, icon: Icon, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={label}
                  className="grid h-9 w-9 place-items-center rounded-full border border-[#d4af37]/20 text-[#8a8577] transition hover:border-[#d4af37]/60 hover:text-[#d4af37]"
                >
                  <Icon className="h-4 w-4" strokeWidth={1.9} />
                </a>
              ))}
            </div>
          </div>

          <div className="glass shrink-0 rounded-2xl p-5 lg:w-80">
            <div className="mb-1 flex items-center gap-2 text-[#d4af37]"><LineChart className="h-4 w-4" /><span className="text-sm font-semibold">Start your edge, free</span></div>
            <p className="mb-4 text-xs text-[#8a8577]">{trialDays}-day premium trial. No card required. Cancel anytime.</p>
            <Link to="/signup" className="block rounded-lg bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] py-2.5 text-center text-sm font-semibold text-[#0a0a0f] transition hover:opacity-90">Create free account</Link>
          </div>
        </div>

        {/* Link columns */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 py-12 sm:grid-cols-3 lg:grid-cols-7 lg:gap-x-5">
          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h4 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-[#d4af37]">{col.heading}</h4>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link to={l.to} className="text-sm text-[#8a8577] transition hover:text-[#e9e7df]">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Legal disclaimer strip */}
        <div className="border-t border-[#d4af37]/10 py-8">
          <p className="max-w-4xl text-xs leading-relaxed text-[#6a665a]">
            TradingBible provides trade journaling, analytics, and AI-generated insights for educational and record-keeping purposes only. Nothing on this platform constitutes financial, investment, or trading advice. Trading financial instruments carries substantial risk of loss and is not suitable for every investor. Past performance and AI-generated observations are not indicative of future results. Always conduct your own due diligence and consult a licensed financial advisor before making trading decisions.
          </p>
        </div>

        {/* Copyright row */}
        <div className="flex flex-col items-center justify-between gap-4 border-t border-[#d4af37]/10 pt-8 text-sm text-[#8a8577] sm:flex-row">
          <div className="flex items-center gap-2"><img src={MALIBA_LOGO} alt="" className="h-5 w-5 rounded object-contain" /> TradingBible LLC</div>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            <Link to="/terms" className="hover:text-[#e9e7df]">Terms</Link>
            <Link to="/policy" className="hover:text-[#e9e7df]">Privacy</Link>
            <Link to="/refund" className="hover:text-[#e9e7df]">Refunds</Link>
            <Link to="/faq" className="hover:text-[#e9e7df]">FAQ</Link>
            <Link to="/pricing" className="hover:text-[#e9e7df]">Pricing</Link>
            {settings.supportEmail && (
              <a href={`mailto:${settings.supportEmail}`} className="hover:text-[#e9e7df]">{settings.supportEmail}</a>
            )}
          </div>
          <div>© {new Date().getFullYear()} TradingBible LLC · All rights reserved.</div>
        </div>
      </div>
    </footer>
  );
}
