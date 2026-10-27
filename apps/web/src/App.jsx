import React, { Suspense, lazy } from 'react';
import { Route, Routes, BrowserRouter as Router, Navigate, useLocation, useParams } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { ThemeProvider } from '@/hooks/useTheme';
import { I18nProvider } from '@/lib/i18n';
import { homeRouteForUser } from '@/lib/homeRoute';
import { meetsPlan, isStaffUser } from '@/lib/entitlements';
import { isAdminPreview } from '@/lib/adminPreview';
import { usePlatformSettings } from '@/lib/platformSettings';
import { TRADINGBIBLE_LOGO } from '@/components/BrandLogo';
import { NotificationsProvider } from '@/hooks/useNotifications';
import ScrollToTop from './components/ScrollToTop';
import GlobalTicker from './components/GlobalTicker';
import AlertMonitor from './components/AlertMonitor';
import AmbientDepth from './components/AmbientDepth';
import PwaStatus from './components/PwaStatus';
import ErrorBoundary from './components/ErrorBoundary';
import { AppChromeShell } from './components/AppLayout';
import { AdminChromeShell } from './components/AdminLayout';
import { InvestorChromeShell } from './components/InvestorShell';
import { AdProvider } from './lib/ads/components.jsx';
import pb from './lib/pocketbaseClient';
// Heavy persistent widgets load after first paint — they mount once and
// survive navigation, but must never bloat the initial bundle.
const LiveChatWidget = lazy(() => import('./components/LiveChatWidget'));
const AdminCompanyWidget = lazy(() => import('./components/AdminCompanyWidget'));
const TvWidget = lazy(() => import('./components/TvWidget'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
import { LoginPage, SignupPage, ResetPage, OnboardingPage } from './pages/AuthFlow';

// Lazy-load heavy authenticated + secondary pages so the initial bundle stays
// small and each surface is fetched on demand.
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const JournalPage = lazy(() => import('./pages/JournalPage'));
const CoachPage = lazy(() => import('./pages/CoachPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const HeatmapsPage = lazy(() => import('./pages/HeatmapsPage'));
const IndicatorsPage = lazy(() => import('./pages/IndicatorsPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const RiskToolsPage = lazy(() => import('./pages/RiskToolsPage'));
const CommunityPage = lazy(() => import('./pages/CommunityPage'));
const AcademyPage = lazy(() => import('./pages/AcademyPage'));
const SecurityPage = lazy(() => import('./pages/SecurityPage'));
const SecurityInfoPage = lazy(() => import('./pages/SecurityInfoPage'));
const ApiDocsPage = lazy(() => import('./pages/ApiDocsPage'));

const BrandingPage = lazy(() => import('./pages/BrandingPage'));
const BillingPage = lazy(() => import('./pages/BillingPage'));
const WalletPage = lazy(() => import('./pages/WalletPage'));
const OrderFlowPage = lazy(() => import('./pages/OrderFlowPage'));
const WatchlistsPage = lazy(() => import('./pages/WatchlistsPage'));
const TerminalPremiumPage = lazy(() => import('./pages/TerminalPremiumPage'));
const AlertsPage = lazy(() => import('./pages/AlertsPage'));
const SignalsPage = lazy(() => import('./pages/SignalsPage'));
const EconomicCalendarPage = lazy(() => import('./pages/EconomicCalendarPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const PublicFeaturesPage = lazy(() => import('./pages/PublicFeaturePages').then((m) => ({ default: m.FeatureHubPage })));
const PublicFeatureDetailPage = lazy(() => import('./pages/PublicFeaturePages').then((m) => ({ default: m.PublicFeaturePage })));
const CommunityPublicPage = lazy(() => import('./pages/PublicFeaturePages').then((m) => ({ default: m.CommunityPublicPage })));
const TvPage = lazy(() => import('./pages/TvPage'));
const BrokersPage = lazy(() => import('./pages/ExtraPages').then((m) => ({ default: m.BrokersPage })));
const SuspendedPage = lazy(() => import('./pages/SuspendedPage'));
const AffiliatePage = lazy(() => import('./pages/AffiliatePage'));
const AdminDashboard = lazy(() => import('./pages/AdminPortal').then((m) => ({ default: m.AdminDashboard })));
const AdminUsers = lazy(() => import('./pages/AdminPortal').then((m) => ({ default: m.AdminUsers })));
const AdminAnalytics = lazy(() => import('./pages/AdminPortal').then((m) => ({ default: m.AdminAnalytics })));
const AdminBilling = lazy(() => import('./pages/AdminPortal').then((m) => ({ default: m.AdminBilling })));
const AdminContent = lazy(() => import('./pages/AdminPortal').then((m) => ({ default: m.AdminContent })));
const AdminReports = lazy(() => import('./pages/AdminPortal').then((m) => ({ default: m.AdminReports })));
const AdminSettings = lazy(() => import('./pages/AdminPortal').then((m) => ({ default: m.AdminSettings })));
const AdminIntegrations = lazy(() => import('./pages/AdminPortal').then((m) => ({ default: m.AdminIntegrations })));
const AdminApiKeys = lazy(() => import('./pages/AdminPortal').then((m) => ({ default: m.AdminApiKeys })));
const AdminPlugins = lazy(() => import('./pages/AdminPortal').then((m) => ({ default: m.AdminPlugins })));
const AdminJobs = lazy(() => import('./pages/AdminPortal').then((m) => ({ default: m.AdminJobs })));
const AdminMentors = lazy(() => import('./pages/AdminPortal').then((m) => ({ default: m.AdminMentors })));
const AdminEmployees = lazy(() => import('./pages/AdminPortal').then((m) => ({ default: m.AdminEmployees })));
const AdminWallet = lazy(() => import('./pages/AdminPortal').then((m) => ({ default: m.AdminWallet })));
const AdminCompany = lazy(() => import('./pages/AdminPortal').then((m) => ({ default: m.AdminCompany })));
const AdminTvAds = lazy(() => import('./pages/AdminPortal').then((m) => ({ default: m.AdminTvAds })));
const AdminAirdrops = lazy(() => import('./pages/AdminAirdrops'));
const StaffPortal = lazy(() => import('./pages/StaffPortal'));
const PricingPage = lazy(() => import('./pages/ExtraPages').then((m) => ({ default: m.PricingPage })));
const UserApiKeysPage = lazy(() => import('./pages/UserApiKeysPage'));
const GuidesPage = lazy(() => import('./pages/PublicInfoPages').then((m) => ({ default: m.GuidesPage })));
const WebinarsPage = lazy(() => import('./pages/PublicInfoPages').then((m) => ({ default: m.WebinarsPage })));
const AcademyInfoPage = lazy(() => import('./pages/PublicInfoPages').then((m) => ({ default: m.AcademyInfoPage })));
const BlogPage = lazy(() => import('./pages/PublicInfoPages').then((m) => ({ default: m.BlogPage })));
const CareersPage = lazy(() => import('./pages/PublicInfoPages').then((m) => ({ default: m.CareersPage })));
const ContactPage = lazy(() => import('./pages/PublicInfoPages').then((m) => ({ default: m.ContactPage })));
const StudentDashboardPage = lazy(() => import('./pages/StudentDashboardPage').then((m) => ({ default: () => <m.StudentGuard><m.default /></m.StudentGuard> })));
const TermsPage = lazy(() => import('./pages/LegalPages').then((m) => ({ default: m.TermsPage })));
const PolicyPage = lazy(() => import('./pages/LegalPages').then((m) => ({ default: m.PolicyPage })));
const RefundPage = lazy(() => import('./pages/LegalPages').then((m) => ({ default: m.RefundPage })));
const FaqPage = lazy(() => import('./pages/LegalPages').then((m) => ({ default: m.FaqPage })));
const AdsDemoPage = lazy(() => import('./pages/AdsDemoPage'));
const ProGuidePage = lazy(() => import('./pages/ProGuidePage'));
const TbcPublicPage = lazy(() => import('./pages/TbcPublicPage'));
const TbcAppPage = lazy(() => import('./pages/TbcAppPage'));
const TbcChainPage = lazy(() => import('./pages/TbcChainPage'));
const StockTbPage = lazy(() => import('./pages/StockTbPage'));
const InvestorRelationsPage = lazy(() => import('./pages/InvestorRelationsPage'));
const ShareholderPortalPage = lazy(() => import('./pages/ShareholderPortalPage'));
const AdminInvestorRelationsPage = lazy(() => import('./pages/AdminInvestorRelationsPage'));
const AdminEquityPage = lazy(() => import('./pages/AdminEquityPage'));
const AdminTbcPage = lazy(() => import('./pages/AdminTbcPage'));
const AdminTbcDocumentsPage = lazy(() => import('./pages/AdminTbcDocumentsPage'));
const ChallengesPage = lazy(() => import('./pages/ChallengesPage'));
const BacktestPage = lazy(() => import('./pages/BacktestPage'));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'));
const StakingPage = lazy(() => import('./pages/StakingPage'));
const MentorsPage = lazy(() => import('./pages/MentorsPage'));
const PaperPage = lazy(() => import('./pages/PaperPage'));
const StaffBioPage = lazy(() => import('./pages/StaffBioPage'));
const StaffIdCardsPage = lazy(() => import('./pages/StaffIdCardsPage'));

// Legacy routes merged into Terminal Pro (?symbol= is preserved).
function SymbolRedirect({ to }) {
    const { search } = useLocation();
    const symbol = (new URLSearchParams(search).get('symbol') || '').toUpperCase();
    return <Navigate to={symbol ? `${to}?symbol=${encodeURIComponent(symbol)}` : to} replace />;
}

function PageFallback() {
    return (
        <div className="grid min-h-screen place-items-center bg-transparent text-sm text-[#8a8577]">
            <div className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#d4af37]/40 border-t-[#d4af37]" />
                Loading…
            </div>
        </div>
    );
}

function isSubscriber(user) {
    if (!user) return false;
    if (user.role === 'admin') return true;
    // Hired staff work here — they pass the subscriber floor without buying
    // a plan. Tier gates (elite/professional) still apply via meetsPlan.
    if (isStaffUser(user)) return true;
    return ['pro', 'elite', 'professional'].includes((user.plan || '').toLowerCase());
}

function SubscriberProtected({ children }) {
    const { isAuthed, isAuthReady, user } = useAuth();
    if (!isAuthReady) return <PageFallback />;
    if (!isAuthed) return <Navigate to="/login" replace />;
    if (user?.role === 'admin' && !isAdminPreview()) return <Navigate to="/admin" replace />;
    if (!isSubscriber(user)) return <Navigate to="/pricing" replace />;
    return children;
}

// Tier gate: requires a paid plan AT or ABOVE the given tier
// ('pro' | 'elite' | 'professional'). Below-tier users land on pricing to
// upgrade. Admins always pass. The `gate` prop names a key in the admin-
// editable planGates settings map, so plan requirements can change with no
// code deploy — the `plan` prop is the fallback default.
function PlanProtected({ plan, gate, children }) {
    const { isAuthed, isAuthReady, user } = useAuth();
    const { planGates } = usePlatformSettings();
    const effective = (gate && planGates?.[gate]) || plan;
    if (!isAuthReady) return <PageFallback />;
    if (!isAuthed) return <Navigate to="/login" replace />;
    if (user?.role === 'admin' && !isAdminPreview()) return <Navigate to="/admin" replace />;
    if (!isSubscriber(user)) return <Navigate to="/pricing" replace />;
    if (!meetsPlan(user, effective)) return <Navigate to="/pricing" replace />;
    return children;
}

function Protected({ children }) {
    const { isAuthed, isAuthReady, user } = useAuth();
    if (!isAuthReady) return <PageFallback />;
    if (!isAuthed) return <Navigate to="/login" replace />;
    // Admins live in their own portal, unless they entered "View app" preview.
    if (user?.role === 'admin' && !isAdminPreview()) return <Navigate to="/admin" replace />;
    return children;
}

function AdminProtected({ children }) {
    const { isAuthed, isAuthReady, user } = useAuth();
    if (!isAuthReady) return <PageFallback />;
    if (!isAuthed) return <Navigate to="/login" replace />;
    // Subscribers cannot access the admin portal.
    if (user?.role !== 'admin') return <Navigate to="/app" replace />;
    return children;
}

function StaffProtected({ children }) {
  const { isAuthed, isAuthReady, user } = useAuth();
  if (!isAuthReady) return <PageFallback />;
  if (!isAuthed) return <Navigate to="/login" replace />;
  // Only staff (teacher/trader accountType) can access staff portal
  if (user?.accountType !== 'teacher' && user?.accountType !== 'trader') return <Navigate to="/app" replace />;
  return children;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// `/staff/:id` is the public QR profile, but the staff portal also lives under
// `/staff/*` (terminal, journal, analytics…). Only UUID-shaped ids open the
// public profile so the portal's tool routes keep working.
function StaffProfileGate() {
  const { id } = useParams();
  if (UUID_RE.test(id || '')) return <StaffBioPage />;
  return <StaffProtected><StaffPortal /></StaffProtected>;
}

// No free trial: paid plan + card required before entering the trading app.
// Billing + profile stay open so new users can pay and manage their account.
function PaidProtected({ children }) {
    const { isAuthed, isAuthReady, user } = useAuth();
    if (!isAuthReady) return <PageFallback />;
    if (!isAuthed) return <Navigate to="/login" replace />;
    if (user?.role === 'admin' && !isAdminPreview()) return <Navigate to="/admin" replace />;
    if (!isSubscriber(user)) return <Navigate to="/app/billing" replace />;
    return children;
}

// Platform admins can switch features off from the Admin Portal. FeatureGate
// blocks the page and shows a friendly notice when one is disabled.

// Pay-once, access forever: allows access if user is a subscriber OR has ever paid (hasEverPaid flag).
// This is for features that should be permanently unlocked after first successful payment.
function EverPaidProtected({ children }) {
    const { isAuthed, isAuthReady, user } = useAuth();
    if (!isAuthReady) return <PageFallback />;
    if (!isAuthed) return <Navigate to="/login" replace />;
    if (user?.role === 'admin' && !isAdminPreview()) return <Navigate to="/admin" replace />;
    // Allow if subscriber OR has ever made a successful payment (hasEverPaid flag)
    if (!isSubscriber(user) && !user?.hasEverPaid) return <Navigate to="/app/billing" replace />;
    return children;
}
function FeatureGate({ feature, children }) {
    const { features, loaded } = usePlatformSettings();
    const { user } = useAuth();
    const isDev = import.meta.env.DEV;
    const enabled = !loaded || features[feature] !== false || user?.role === 'admin' || isDev;
    if (enabled) return children;
    return (
        <div className="grid min-h-[60vh] place-items-center px-6">
            <div className="glass w-full max-w-md rounded-2xl p-8 text-center">
                <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full border border-[#d4af37]/25 text-[#d4af37]">
                    <Lock className="h-5 w-5" />
                </div>
                <h2 className="mb-2 text-lg font-semibold text-[#f0ecdd]">This feature is currently unavailable</h2>
                <p className="text-sm leading-relaxed text-[#8a8577]">
                    The platform admin has temporarily disabled it. Please check back soon or contact support if you believe this is an error.
                </p>
            </div>
        </div>
    );
}

// Global maintenance mode: non-admins see a clean holding screen instead of
// the whole app when the platform admin toggles maintenance on.
function MaintenanceGate({ children }) {
    const { settings, loaded } = usePlatformSettings();
    const { user } = useAuth();
    if (loaded && settings.maintenance && user?.role !== 'admin') {
        return (
            <div className="grid min-h-screen place-items-center px-6">
                <div className="glass w-full max-w-md rounded-2xl p-8 text-center">
                    <img src={TRADINGBIBLE_LOGO} alt={`${settings.platformName} logo`} className="mx-auto mb-5 h-14 w-14 rounded-xl object-contain gold-glow" />
                    <h1 className="mb-2 text-xl font-bold text-[#f0ecdd]">We&apos;ll be right back</h1>
                    <p className="text-sm leading-relaxed text-[#8a8577]">
                        {settings.platformName} is undergoing scheduled maintenance. Please check back shortly.
                    </p>
                    {settings.supportEmail && (
                        <a href={`mailto:${settings.supportEmail}`} className="mt-5 inline-block text-sm font-semibold text-[#d4af37] hover:underline">
                            {settings.supportEmail}
                        </a>
                    )}
                </div>
            </div>
        );
    }
    return children;
}

function AppChrome() {
    const { pathname } = useLocation();
    const isPublicStaffProfile = /^\/staff\/[0-9a-f-]{36}\/?$/i.test(pathname);
    const hideTicker = ['/login', '/signup', '/reset', '/onboarding'].includes(pathname) || isPublicStaffProfile;
    // SI coach + TV widgets live here (above the per-route error boundary)
    // so they mount ONCE and survive page navigation without reloading
    // videos, chats, drag positions or panel state. App routes only —
    // public pages and auth flows stay clean. Both bubbles show on every
    // plan; the SI panel itself upsells below Elite, and per-channel TV
    // locks live inside the guide. Each widget gets its own error boundary
    // so a widget crash can never blank the whole app again.
    const { features } = usePlatformSettings();
    const inApp = pathname.startsWith('/app') || pathname.startsWith('/student') || pathname === '/tv';

    return (
        <>
            <AmbientDepth />
            {!hideTicker && <GlobalTicker />}
            <AlertMonitor />
            <ScrollToTop />
            {inApp && features.aiCoach !== false && <ErrorBoundary fallback={null}><Suspense fallback={null}><LiveChatWidget /></Suspense></ErrorBoundary>}
            {pathname.startsWith('/admin') && <ErrorBoundary fallback={null}><Suspense fallback={null}><AdminCompanyWidget /></Suspense></ErrorBoundary>}
            {pathname !== '/tv' && inApp && <ErrorBoundary fallback={null}><Suspense fallback={null}><TvWidget /></Suspense></ErrorBoundary>}
        </>
    );
}

// Signed-in users hitting the bare domain land straight in their area
// (.app/ instead of .app/app/).
function RootRedirect() {
    const { isAuthed, isAuthReady, user } = useAuth();
    const { pathname } = useLocation();
    // Only redirect if authenticated AND auth is ready AND at root
    // For unauthenticated users, let them see the landing page immediately
    if (!isAuthReady) return null;
    if (!isAuthed || pathname !== '/') return null;
    return <Navigate to={homeRouteForUser(user)} replace />;
}

// Keep the right chrome mounted while moving between sections in the same
// product. The page body swaps inside a keyed error boundary; the rail,
// header, footer and phone dock do not remount on every click.
function PersistentChrome({ children }) {
    const { pathname } = useLocation();
    const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/');
    const isApp = pathname === '/app'
        || pathname.startsWith('/app/')
        || pathname === '/leaderboard'
        || pathname === '/student';
    const isCapital = pathname === '/stock'
        || pathname === '/stock/TB'
        || pathname === '/investors'
        || pathname.startsWith('/investors/');
    if (isAdmin) return <AdminChromeShell>{children}</AdminChromeShell>;
    if (isApp) return <AppChromeShell>{children}</AppChromeShell>;
    if (isCapital) return <InvestorChromeShell>{children}</InvestorChromeShell>;
    return children;
}

// Remounts the page-level error boundary on navigation so one broken page
// never poisons the rest of the app.
function RoutesWithBoundary() {
    const { pathname } = useLocation();
    const { isAuthed, isAuthReady, user } = useAuth();
    // Suspended accounts stay logged in but see only the suspended page
    // (support contact + live chat bubble, which mounts in AppChrome).
    // Admins are never gated here.
    if (isAuthReady && isAuthed && user?.role !== 'admin' && user?.user_settings?.suspended) {
        return (
            <ErrorBoundary key="suspended" showDetails={import.meta.env.DEV}>
                <Suspense fallback={<PageFallback />}>
                    <SuspendedPage />
                </Suspense>
            </ErrorBoundary>
        );
    }
    return (
        <PersistentChrome>
        <ErrorBoundary key={pathname} showDetails={import.meta.env.DEV}>
            <Suspense fallback={<PageFallback />}>
                <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/pricing" element={<PricingPage />} />
                    <Route path="/features" element={<PublicFeaturesPage />} />
                    <Route path="/features/:slug" element={<PublicFeatureDetailPage />} />
                    <Route path="/community" element={<CommunityPublicPage />} />
                    <Route path="/about" element={<AboutPage />} />
                    <Route path="/guides" element={<GuidesPage />} />
                    <Route path="/webinars" element={<WebinarsPage />} />
                    <Route path="/academy" element={<AcademyInfoPage />} />
                    <Route path="/blog" element={<BlogPage />} />
                    <Route path="/careers" element={<CareersPage />} />
                    <Route path="/contact" element={<ContactPage />} />
                    <Route path="/terms" element={<TermsPage />} />
                    <Route path="/policy" element={<PolicyPage />} />
                    <Route path="/refund" element={<RefundPage />} />
                    <Route path="/faq" element={<FaqPage />} />
                    <Route path="/security" element={<SecurityInfoPage />} />
                    <Route path="/tbc" element={<TbcPublicPage section="overview" />} />
                    <Route path="/tbc/whitepaper" element={<TbcPublicPage section="whitepaper" />} />
                    <Route path="/tbc/roadmap" element={<TbcPublicPage section="roadmap" />} />
                    <Route path="/tbc/tokenomics" element={<TbcPublicPage section="tokenomics" />} />
                    <Route path="/tbc/utility" element={<TbcPublicPage section="utility" />} />
                    <Route path="/tbc/risks" element={<TbcPublicPage section="risks" />} />
                    <Route path="/tbc/documents" element={<TbcPublicPage section="documents" />} />
                    <Route path="/tbc/purchases" element={<TbcPublicPage section="purchases" />} />
                    <Route path="/tbc/eligibility" element={<TbcPublicPage section="eligibility" />} />
                    <Route path="/tbc/compliance" element={<TbcPublicPage section="compliance" />} />
                    <Route path="/tbc/separation" element={<TbcPublicPage section="separation" />} />
                    <Route path="/tbc/faqs" element={<TbcPublicPage section="faqs" />} />
                    <Route path="/chain" element={<TbcChainPage view="overview" />} />
                    <Route path="/chain/explorer" element={<TbcChainPage view="explorer" />} />
                    <Route path="/chain/validators" element={<TbcChainPage view="validators" />} />
                    <Route path="/chain/governance" element={<TbcChainPage view="governance" />} />
                    <Route path="/developers/tbc" element={<TbcChainPage view="developers" />} />
                    <Route path="/stock" element={<Navigate to="/stock/TB" replace />} />
                    <Route path="/stock/TB" element={<StockTbPage />} />
                    <Route path="/investors" element={<InvestorRelationsPage section="overview" />} />
                    <Route path="/investors/financials" element={<InvestorRelationsPage section="financials" />} />
                    <Route path="/investors/governance" element={<InvestorRelationsPage section="governance" />} />
                    <Route path="/investors/ipo" element={<InvestorRelationsPage section="ipo" />} />
                    <Route path="/investors/news" element={<InvestorRelationsPage section="news" />} />
                    <Route path="/investors/documents" element={<InvestorRelationsPage section="documents" />} />
                    <Route path="/investors/contact" element={<InvestorRelationsPage section="contact" />} />
                    <Route path="/investors/shareholders" element={<ShareholderPortalPage />} />
                    {/* Public staff profile — opened by scanning an ID-card QR */}
                    <Route path="/staff/:id" element={<StaffProfileGate />} />
                    {/* Merged surfaces — old deep links land in their new home */}
                    <Route path="/app/tbc" element={<Protected><TbcAppPage /></Protected>} />
                    <Route path="/app/support" element={<Navigate to="/app/tbc/support" replace />} />
                    <Route path="/app/tbc/:tab" element={<Protected><TbcAppPage /></Protected>} />
                    <Route path="/app/defi" element={<Navigate to="/app/wallet?tab=crypto" replace />} />
                    <Route path="/app/market" element={<Navigate to="/app/signals?tab=market" replace />} />
                    <Route path="/app/funded" element={<Navigate to="/app/challenges" replace />} />
                    <Route path="/app/prop-firms" element={<Navigate to="/app/challenges" replace />} />
                    <Route path="/tv" element={<EverPaidProtected><TvPage /></EverPaidProtected>} />
                    {import.meta.env.DEV && <Route path="/__tvtest" element={<div style={{ minHeight: "200dvh", background: "#0a0a0f" }}><TvWidget /></div>} />}
                    {import.meta.env.DEV && <Route path="/__ads-demo" element={<Protected><AdsDemoPage /></Protected>} />}
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/signup" element={<SignupPage />} />
                    <Route path="/reset" element={<ResetPage />} />
                    <Route path="/onboarding" element={<Protected><OnboardingPage /></Protected>} />
                    <Route path="/app" element={<PaidProtected><DashboardPage /></PaidProtected>} />
                    <Route path="/app/analytics" element={<PaidProtected><AnalyticsPage /></PaidProtected>} />
                    <Route path="/app/watchlists" element={<PaidProtected><WatchlistsPage /></PaidProtected>} />
                    <Route path="/app/orderflow" element={<PaidProtected><OrderFlowPage /></PaidProtected>} />
                    <Route path="/app/terminal" element={<SymbolRedirect to="/app/terminal-pro" />} />
                    <Route path="/app/terminal-pro" element={<PaidProtected><TerminalPremiumPage /></PaidProtected>} />
                    <Route path="/app/alerts" element={<PaidProtected><FeatureGate feature="signals"><AlertsPage /></FeatureGate></PaidProtected>} />
                    <Route path="/app/signals" element={<PaidProtected><FeatureGate feature="signals"><SignalsPage /></FeatureGate></PaidProtected>} />
                    <Route path="/app/economic-calendar" element={<EverPaidProtected><FeatureGate feature="economicCalendar"><EconomicCalendarPage /></FeatureGate></EverPaidProtected>} />
                    <Route path="/app/charts" element={<SymbolRedirect to="/app/terminal-pro" />} />
                    <Route path="/app/heatmaps" element={<PaidProtected><FeatureGate feature="chartBuilder"><HeatmapsPage /></FeatureGate></PaidProtected>} />
                    <Route path="/app/indicators" element={<PaidProtected><FeatureGate feature="chartBuilder"><IndicatorsPage /></FeatureGate></PaidProtected>} />
                    <Route path="/app/journal" element={<PaidProtected><JournalPage /></PaidProtected>} />
                    <Route path="/app/challenges" element={<Protected><ChallengesPage /></Protected>} />
                    <Route path="/app/paper" element={<Protected><PaperPage /></Protected>} />
                    <Route path="/app/backtest" element={<PaidProtected><BacktestPage /></PaidProtected>} />
                    <Route path="/app/staking" element={<Protected><StakingPage /></Protected>} />
                    <Route path="/app/mentors" element={<Protected><MentorsPage /></Protected>} />
                    <Route path="/leaderboard" element={<LeaderboardPage />} />
                    <Route path="/app/reports" element={<PlanProtected plan="elite" gate="reports"><ReportsPage /></PlanProtected>} />
                    <Route path="/app/coach" element={<PlanProtected plan="elite" gate="coach"><FeatureGate feature="aiCoach"><CoachPage /></FeatureGate></PlanProtected>} />
                    <Route path="/app/tools" element={<SubscriberProtected><FeatureGate feature="riskTools"><RiskToolsPage /></FeatureGate></SubscriberProtected>} />
                    <Route path="/app/community" element={<Protected><FeatureGate feature="community"><CommunityPage /></FeatureGate></Protected>} />
                    <Route path="/app/guide" element={<Protected><ProGuidePage /></Protected>} />
                    <Route path="/app/academy" element={<Protected><FeatureGate feature="academy"><AcademyPage /></FeatureGate></Protected>} />
                    <Route path="/app/security" element={<PaidProtected><SecurityPage /></PaidProtected>} />
                    <Route path="/app/api-docs" element={<PlanProtected plan="professional" gate="apiDocs"><ApiDocsPage /></PlanProtected>} />
                    <Route path="/app/integrations" element={<Navigate to="/admin/integrations" replace />} />
                    <Route path="/app/branding" element={<PlanProtected plan="professional" gate="branding"><BrandingPage /></PlanProtected>} />
                    <Route path="/app/brokers" element={<PaidProtected><BrokersPage /></PaidProtected>} />
                    <Route path="/app/affiliate" element={<PaidProtected><AffiliatePage /></PaidProtected>} />
                    <Route path="/app/billing" element={<Protected><BillingPage /></Protected>} />
                    <Route path="/app/wallet" element={<EverPaidProtected><WalletPage /></EverPaidProtected>} />
                    <Route path="/app/profile" element={<Protected><ProfilePage /></Protected>} />
                    <Route path="/app/api-keys" element={<PlanProtected plan="professional" gate="apiKeys"><UserApiKeysPage /></PlanProtected>} />
                    <Route path="/teacher" element={<Navigate to="/app" replace />} />
                    <Route path="/student" element={<Protected><StudentDashboardPage /></Protected>} />
                    <Route path="/admin" element={<AdminProtected><AdminDashboard /></AdminProtected>} />
                    <Route path="/admin/users" element={<AdminProtected><AdminUsers /></AdminProtected>} />
                    <Route path="/admin/employees" element={<AdminProtected><AdminEmployees /></AdminProtected>} />
                    <Route path="/admin/staff-id-cards" element={<AdminProtected><StaffIdCardsPage /></AdminProtected>} />
                    <Route path="/admin/analytics" element={<AdminProtected><AdminAnalytics /></AdminProtected>} />
                    <Route path="/admin/billing" element={<AdminProtected><AdminBilling /></AdminProtected>} />
                    <Route path="/admin/content" element={<AdminProtected><AdminContent /></AdminProtected>} />
                    <Route path="/admin/reports" element={<AdminProtected><AdminReports /></AdminProtected>} />
                    <Route path="/admin/settings" element={<AdminProtected><AdminSettings /></AdminProtected>} />
                    <Route path="/admin/integrations" element={<AdminProtected><AdminIntegrations /></AdminProtected>} />
                    <Route path="/admin/tv" element={<AdminProtected><AdminTvAds /></AdminProtected>} />
                    <Route path="/admin/airdrops" element={<AdminProtected><AdminAirdrops /></AdminProtected>} />
                    <Route path="/admin/api-keys" element={<AdminProtected><AdminApiKeys /></AdminProtected>} />
                    <Route path="/admin/plugins" element={<AdminProtected><AdminPlugins /></AdminProtected>} />
                    <Route path="/admin/jobs" element={<AdminProtected><AdminJobs /></AdminProtected>} />
                    <Route path="/admin/mentors" element={<AdminProtected><AdminMentors /></AdminProtected>} />
                    <Route path="/admin/wallet" element={<AdminProtected><AdminWallet /></AdminProtected>} />
                    <Route path="/admin/company" element={<AdminProtected><AdminCompany /></AdminProtected>} />
                    <Route path="/admin/tbc" element={<AdminProtected><AdminTbcPage /></AdminProtected>} />
                    <Route path="/admin/investor-relations" element={<AdminProtected><AdminInvestorRelationsPage /></AdminProtected>} />
                    <Route path="/admin/equity" element={<AdminProtected><AdminEquityPage /></AdminProtected>} />
                    <Route path="/admin/legal-vault" element={<AdminProtected><AdminTbcDocumentsPage /></AdminProtected>} />
                    <Route path="/staff/*" element={<StaffProtected><StaffPortal /></StaffProtected>} />
                </Routes>
            </Suspense>
        </ErrorBoundary>
        </PersistentChrome>
    );
}


// The landing page keeps its original light/dark imagery. Every signed-in
// dashboard and operator surface now uses a clean mineral canvas instead of
// the photographic backdrop, so cards and charts never look like a website
// pasted over a picture.
function AppBackdrop() {
    const { pathname } = useLocation();
    if (pathname !== '/' && pathname !== '/home') return null;
    return <div id="app-bg" aria-hidden="true" />;
}

function App() {
    return (
        <I18nProvider>
        <ThemeProvider>
        <AuthProvider>
          <NotificationsProvider>
          <AdProvider options={{ apiUrl: '/hcgi/api/ads', abTestingOptions: { getToken: () => pb.authStore.token } }}>
            <Router>
                <AppBackdrop />
                <MaintenanceGate>
                    <RootRedirect />
                    <AppChrome />
                    <RoutesWithBoundary />
                </MaintenanceGate>
                <PwaStatus />
                <Toaster />
            </Router>
          </AdProvider>
          </NotificationsProvider>
        </AuthProvider>
        </ThemeProvider>
        </I18nProvider>
    );
}

export default App;
