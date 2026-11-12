// Single source of truth for operator-suite destinations and search metadata.
// Consumed by AdminLayout, AdminSearch and mobile navigation so a new section
// cannot be added to the rail while remaining invisible to search.

import {
  LayoutDashboard, Users, BarChart3, FileText, CreditCard, LibraryBig,
  MonitorPlay, Plug, Key, Package, Briefcase, Settings, Gift, Wallet,
  UserRound, Building2, Coins, ShieldCheck, Landmark, FileCheck2,
  FileSignature, Mail, IdCard, Globe, Layers, GraduationCap, Trophy,
  Signal, ShieldAlert, Handshake, Send, ClipboardCheck,
} from 'lucide-react';

export const ADMIN_NAV_GROUPS = [
  {
    label: 'Command',
    items: [
      { to: '/admin', label: 'Dashboard', short: 'Overview', icon: LayoutDashboard, end: true, keywords: 'command centre home health growth' },
      { to: '/admin/analytics', label: 'Analytics', short: 'Analytics', icon: BarChart3, keywords: 'growth conversion churn revenue mrr cohorts' },
      { to: '/admin/reports', label: 'Reports & logs', short: 'Reports', icon: FileText, keywords: 'export csv audit api logs activity' },
    ],
  },
  {
    label: 'Product',
    items: [
      { to: '/admin/product-surfaces', label: 'Product surfaces', short: 'Surfaces', icon: Layers, keywords: 'features routes entitlements plan gates terminal journal signals alerts academy wallet community' },
      { to: '/admin/academy', label: 'Academy operations', short: 'Academy', icon: GraduationCap, keywords: 'paths courses lessons tuition schools webinars curriculum' },
      { to: '/admin/challenges', label: 'Challenges & funded', short: 'Funded', icon: Trophy, keywords: 'evaluations payouts attempts funded products' },
      { to: '/admin/signals', label: 'Signals & alerts', short: 'Signals', icon: Signal, keywords: 'published draft alerts delivery email sms' },
      { to: '/admin/community', label: 'Community & moderation', short: 'Community', icon: Users, keywords: 'forum moderation reports posts' },
    ],
  },
  {
    label: 'People',
    items: [
      { to: '/admin/users', label: 'User management', short: 'Users', icon: Users, keywords: 'members accounts customers plans roles verification' },
      { to: '/admin/employees', label: 'Employees', short: 'Employees', icon: UserRound, keywords: 'staff company employees payroll directory' },
      { to: '/admin/workforce', label: 'Workforce compliance', short: 'Workforce', icon: ClipboardCheck, keywords: 'hr handbook contracts policies onboarding payroll benefits us nigeria compliance' },
      { to: '/admin/staff-id-cards', label: 'ID cards', short: 'ID cards', icon: IdCard, keywords: 'staff identity badge verification' },
      { to: '/admin/jobs', label: 'Jobs & hiring', short: 'Hiring', icon: Briefcase, keywords: 'careers applications roles recruitment onboarding' },
    ],
  },
  {
    label: 'Revenue & ecosystem',
    items: [
      { to: '/admin/billing', label: 'Billing & revenue', short: 'Billing', icon: CreditCard, keywords: 'stripe subscriptions mrr arr invoices payouts academy' },
      { to: '/admin/affiliates', label: 'Affiliates', short: 'Affiliates', icon: Handshake, keywords: 'referrals commission codes clicks signups tbc settlement' },
      { to: '/admin/tbc', label: 'TBC control centre', short: 'TBC', icon: Coins, keywords: 'credits token gates treasury sale' },
      { to: '/admin/legal-vault', label: 'TBC legal vault', short: 'Legal vault', icon: ShieldCheck, keywords: 'controlled documents legal instruments docusign' },
      { to: '/admin/airdrops', label: 'Airdrops', short: 'Airdrops', icon: Gift, keywords: 'credits campaigns recipients' },
      { to: '/admin/wallet', label: 'Wallet & settlement', short: 'Wallet', icon: Wallet, keywords: 'balances credits settlement transactions' },
    ],
  },
  {
    label: 'Capital & IR',
    items: [
      { to: '/admin/equity', label: 'Equity administration', short: 'Equity', icon: Landmark, keywords: 'cap table shares options warrants authorized issued' },
      { to: '/admin/investor-relations', label: 'Investor relations', short: 'IR', icon: FileText, keywords: 'investors updates communications fundraising' },
      { to: '/admin/investor-letters', label: 'Investor letters', short: 'Letters', icon: Send, keywords: 'email reg cf 506b private placement investor campaign audience consent unsubscribe' },
      { to: '/admin/tb-stock-documents', label: 'TB stock documents', short: 'Stock docs', icon: FileCheck2, keywords: 'equity documents resolutions certificates' },
      { to: '/admin/fundraising-documents', label: 'Fundraising documents', short: 'Fundraising', icon: FileSignature, keywords: 'safe form d reg cf private placement packet docusign' },
    ],
  },
  {
    label: 'Publishing',
    items: [
      { to: '/admin/content', label: 'Content', short: 'Content', icon: LibraryBig, keywords: 'academy programs challenges curriculum' },
      { to: '/admin/communications', label: 'Brand communications', short: 'Comms', icon: Mail, keywords: 'email sms notifications templates brand test send' },
      { to: '/admin/tv', label: 'TradingBible TV', short: 'TV', icon: MonitorPlay, keywords: 'advertising campaigns slots live channels' },
    ],
  },
  {
    label: 'Company & system',
    items: [
      { to: '/admin/company', label: 'Company Bible', short: 'Company', icon: Building2, keywords: 'identity legal leadership roadmap company facts' },
      { to: '/admin/public-site', label: 'Public site & launch', short: 'Public site', icon: Globe, keywords: 'public routes launch readiness seo legal pages' },
      { to: '/admin/compliance', label: 'Compliance & gates', short: 'Compliance', icon: ShieldAlert, keywords: 'gates blocked legal securities payments tbc counsel' },
      { to: '/admin/integrations', label: 'Integrations', short: 'Integrations', icon: Plug, keywords: 'providers smtp stripe supabase docusign' },
      { to: '/admin/api-keys', label: 'API keys', short: 'API keys', icon: Key, keywords: 'developer credentials tokens' },
      { to: '/admin/plugins', label: 'Plugins', short: 'Plugins', icon: Package, keywords: 'extensions modules packages' },
      { to: '/admin/settings', label: 'Settings', short: 'Settings', icon: Settings, keywords: 'platform configuration plans access gates' },
    ],
  },
];

export const ADMIN_ROUTES = ADMIN_NAV_GROUPS.flatMap((group) =>
  group.items.map((item) => ({ ...item, group: group.label })),
);

export const PUBLIC_SHORTCUTS = [
  { to: '/', label: 'Public website', group: 'Public', icon: Globe, keywords: 'home landing marketing public' },
  { to: '/pricing', label: 'Public pricing', group: 'Public', icon: CreditCard, keywords: 'free premium 19.99 199 plans' },
  { to: '/academy', label: 'Academy catalogue', group: 'Public', icon: LibraryBig, keywords: 'courses paths lessons tuition' },
  { to: '/fundraising', label: 'Fundraising status', group: 'Public', icon: FileSignature, keywords: 'offering reg cf form d no offering open' },
];

export const SEARCH_ROUTES = [...ADMIN_ROUTES, ...PUBLIC_SHORTCUTS];

export function findAdminRoute(pathname = '') {
  return ADMIN_ROUTES.find((item) => (
    item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`)
  )) || null;
}
