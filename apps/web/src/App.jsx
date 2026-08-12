import React, { Suspense, lazy } from 'react';
import { Route, Routes, BrowserRouter as Router, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { ThemeProvider } from '@/hooks/useTheme';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import { I18nProvider } from '@/lib/i18n';
import { homeRouteForUser } from '@/lib/homeRoute';
import { NotificationsProvider } from '@/hooks/useNotifications';
import ScrollToTop from './components/ScrollToTop';
import GlobalTicker from './components/GlobalTicker';
import AlertMonitor from './components/AlertMonitor';
import PwaStatus from './components/PwaStatus';
import ErrorBoundary from './components/ErrorBoundary';
import LandingPage from './pages/LandingPage';
import { LoginPage, SignupPage, ResetPage, OnboardingPage } from './pages/AuthFlow';
import TvPage from './pages/TvPage';

// Lazy-load heavy authenticated + secondary pages so the initial bundle stays
// small and each surface is fetched on demand.
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const JournalPage = lazy(() => import('./pages/JournalPage'));
const CoachPage = lazy(() => import('./pages/CoachPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const ChartsPage = lazy(() => import('./pages/ChartsPage'));
const HeatmapsPage = lazy(() => import('./pages/HeatmapsPage'));
const IndicatorsPage = lazy(() => import('./pages/IndicatorsPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const RiskToolsPage = lazy(() => import('./pages/RiskToolsPage'));
const CommunityPage = lazy(() => import('./pages/CommunityPage'));
const AcademyPage = lazy(() => import('./pages/AcademyPage'));
const SecurityPage = lazy(() => import('./pages/SecurityPage'));
const ApiDocsPage = lazy(() => import('./pages/ApiDocsPage'));
const IntegrationsPage = lazy(() => import('./pages/IntegrationsPage'));
const BrandingPage = lazy(() => import('./pages/BrandingPage'));
const BillingPage = lazy(() => import('./pages/BillingPage'));
const WalletPage = lazy(() => import('./pages/WalletPage'));
const WatchlistsPage = lazy(() => import('./pages/WatchlistsPage'));
const TerminalPage = lazy(() => import('./pages/TerminalPage'));
const AlertsPage = lazy(() => import('./pages/AlertsPage'));
const SignalsPage = lazy(() => import('./pages/SignalsPage'));
const EconomicCalendarPage = lazy(() => import('./pages/EconomicCalendarPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const BrokersPage = lazy(() => import('./pages/ExtraPages').then((m) => ({ default: m.BrokersPage })));
const PropFirmsPage = lazy(() => import('./pages/PropFirmsPage'));
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
const AdminTvAds = lazy(() => import('./pages/AdminPortal').then((m) => ({ default: m.AdminTvAds })));
const PricingPage = lazy(() => import('./pages/ExtraPages').then((m) => ({ default: m.PricingPage })));
const UserApiKeysPage = lazy(() => import('./pages/UserApiKeysPage'));
const CompanyDashboardPage = lazy(() => import('./pages/CompanyDashboardPage'));
const GuidesPage = lazy(() => import('./pages/PublicInfoPages').then((m) => ({ default: m.GuidesPage })));
const WebinarsPage = lazy(() => import('./pages/PublicInfoPages').then((m) => ({ default: m.WebinarsPage })));
const AcademyInfoPage = lazy(() => import('./pages/PublicInfoPages').then((m) => ({ default: m.AcademyInfoPage })));
const BlogPage = lazy(() => import('./pages/PublicInfoPages').then((m) => ({ default: m.BlogPage })));
const CareersPage = lazy(() => import('./pages/PublicInfoPages').then((m) => ({ default: m.CareersPage })));
const ContactPage = lazy(() => import('./pages/PublicInfoPages').then((m) => ({ default: m.ContactPage })));
const CompanyStudentsPage = lazy(() => import('./pages/CompanySchoolPages').then((m) => ({ default: m.CompanyStudentsPage })));
const CompanyTeachersPage = lazy(() => import('./pages/CompanySchoolPages').then((m) => ({ default: m.CompanyTeachersPage })));
const CompanyAssessmentsPage = lazy(() => import('./pages/CompanySchoolPages').then((m) => ({ default: m.CompanyAssessmentsPage })));
const CompanySubmissionsPage = lazy(() => import('./pages/CompanySchoolPages').then((m) => ({ default: m.CompanySubmissionsPage })));
const CompanyAcademyProfilesPage = lazy(() => import('./pages/CompanySchoolPages').then((m) => ({ default: m.CompanyAcademyProfilesPage })));
const TermsPage = lazy(() => import('./pages/LegalPages').then((m) => ({ default: m.TermsPage })));
const PolicyPage = lazy(() => import('./pages/LegalPages').then((m) => ({ default: m.PolicyPage })));
const RefundPage = lazy(() => import('./pages/LegalPages').then((m) => ({ default: m.RefundPage })));
const FaqPage = lazy(() => import('./pages/LegalPages').then((m) => ({ default: m.FaqPage })));

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
    return ['pro', 'elite', 'professional'].includes((user.plan || '').toLowerCase());
}

function SubscriberProtected({ children }) {
    const { isAuthed, isAuthReady, user } = useAuth();
    if (!isAuthReady) return <PageFallback />;
    if (!isAuthed) return <Navigate to="/login" replace />;
    if (user?.role === 'admin') return <Navigate to="/admin" replace />;
    if (!isSubscriber(user)) return <Navigate to="/pricing" replace />;
    return children;
}

function Protected({ children }) {
    const { isAuthed, isAuthReady, user } = useAuth();
    if (!isAuthReady) return <PageFallback />;
    if (!isAuthed) return <Navigate to="/login" replace />;
    // Admins live in their own portal and cannot access subscriber features.
    if (user?.role === 'admin') return <Navigate to="/admin" replace />;
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

function CompanyProtected({ children }) {
    const { isAuthed, isAuthReady, user } = useAuth();
    if (!isAuthReady) return <PageFallback />;
    if (!isAuthed) return <Navigate to="/login" replace />;
    if (user?.role === 'admin') return <Navigate to="/admin" replace />;
    if (user?.accountType !== 'company') return <Navigate to="/app" replace />;
    return children;
}

function AppChrome() {
    const { pathname } = useLocation();
    const hideTicker = ['/login', '/signup', '/reset', '/onboarding'].includes(pathname);

    return (
        <>
            {!hideTicker && <GlobalTicker />}
            <AlertMonitor />
            <ScrollToTop />
        </>
    );
}

// Signed-in users hitting the bare domain land straight in their area
// (.app/ instead of .app/app/).
function RootRedirect() {
    const { isAuthed, isAuthReady, user } = useAuth();
    const { pathname } = useLocation();
    if (!isAuthReady || !isAuthed || pathname !== '/') return null;
    return <Navigate to={homeRouteForUser(user)} replace />;
}

// Remounts the page-level error boundary on navigation so one broken page
// never poisons the rest of the app.
function RoutesWithBoundary() {
    const { pathname } = useLocation();
    return (
        <ErrorBoundary key={pathname}>
            <Suspense fallback={<PageFallback />}>
                <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/pricing" element={<PricingPage />} />
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
                    <Route path="/tv" element={<TvPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/signup" element={<SignupPage />} />
                    <Route path="/reset" element={<ResetPage />} />
                    <Route path="/onboarding" element={<Protected><OnboardingPage /></Protected>} />
                    <Route path="/app" element={<Protected><DashboardPage /></Protected>} />
                    <Route path="/app/analytics" element={<Protected><AnalyticsPage /></Protected>} />
                    <Route path="/app/watchlists" element={<Protected><WatchlistsPage /></Protected>} />
                    <Route path="/app/terminal" element={<Protected><TerminalPage /></Protected>} />
                    <Route path="/app/alerts" element={<Protected><AlertsPage /></Protected>} />
                    <Route path="/app/signals" element={<Protected><SignalsPage /></Protected>} />
                    <Route path="/app/economic-calendar" element={<Protected><EconomicCalendarPage /></Protected>} />
                    <Route path="/app/charts" element={<Protected><ChartsPage /></Protected>} />
                    <Route path="/app/heatmaps" element={<Protected><HeatmapsPage /></Protected>} />
                    <Route path="/app/indicators" element={<Protected><IndicatorsPage /></Protected>} />
                    <Route path="/app/journal" element={<Protected><JournalPage /></Protected>} />
                    <Route path="/app/reports" element={<Protected><ReportsPage /></Protected>} />
                    <Route path="/app/coach" element={<SubscriberProtected><CoachPage /></SubscriberProtected>} />
                    <Route path="/app/tools" element={<SubscriberProtected><RiskToolsPage /></SubscriberProtected>} />
                    <Route path="/app/community" element={<SubscriberProtected><CommunityPage /></SubscriberProtected>} />
                    <Route path="/app/academy" element={<SubscriberProtected><AcademyPage /></SubscriberProtected>} />
                    <Route path="/app/security" element={<Protected><SecurityPage /></Protected>} />
                    <Route path="/app/api-docs" element={<SubscriberProtected><ApiDocsPage /></SubscriberProtected>} />
                    <Route path="/app/integrations" element={<SubscriberProtected><IntegrationsPage /></SubscriberProtected>} />
                    <Route path="/app/branding" element={<SubscriberProtected><BrandingPage /></SubscriberProtected>} />
                    <Route path="/app/brokers" element={<Protected><BrokersPage /></Protected>} />
                    <Route path="/app/prop-firms" element={<Protected><PropFirmsPage /></Protected>} />
                    <Route path="/app/affiliate" element={<Protected><AffiliatePage /></Protected>} />
                    <Route path="/app/billing" element={<Protected><BillingPage /></Protected>} />
                    <Route path="/app/wallet" element={<SubscriberProtected><WalletPage /></SubscriberProtected>} />
                    <Route path="/app/crypto-bank" element={<Navigate to="/app/wallet" replace />} />
                    <Route path="/app/profile" element={<Protected><ProfilePage /></Protected>} />
                    <Route path="/app/api-keys" element={<Protected><UserApiKeysPage /></Protected>} />
                    <Route path="/company" element={<CompanyProtected><CompanyDashboardPage /></CompanyProtected>} />
                    <Route path="/company/students" element={<CompanyProtected><CompanyStudentsPage /></CompanyProtected>} />
                    <Route path="/company/teachers" element={<CompanyProtected><CompanyTeachersPage /></CompanyProtected>} />
                    <Route path="/company/assessments" element={<CompanyProtected><CompanyAssessmentsPage /></CompanyProtected>} />
                    <Route path="/company/submissions" element={<CompanyProtected><CompanySubmissionsPage /></CompanyProtected>} />
                    <Route path="/company/academy-profiles" element={<CompanyProtected><CompanyAcademyProfilesPage /></CompanyProtected>} />
                    <Route path="/admin" element={<AdminProtected><AdminDashboard /></AdminProtected>} />
                    <Route path="/admin/users" element={<AdminProtected><AdminUsers /></AdminProtected>} />
                    <Route path="/admin/analytics" element={<AdminProtected><AdminAnalytics /></AdminProtected>} />
                    <Route path="/admin/billing" element={<AdminProtected><AdminBilling /></AdminProtected>} />
                    <Route path="/admin/content" element={<AdminProtected><AdminContent /></AdminProtected>} />
                    <Route path="/admin/reports" element={<AdminProtected><AdminReports /></AdminProtected>} />
                    <Route path="/admin/settings" element={<AdminProtected><AdminSettings /></AdminProtected>} />
                    <Route path="/admin/integrations" element={<AdminProtected><AdminIntegrations /></AdminProtected>} />
                    <Route path="/admin/tv" element={<AdminProtected><AdminTvAds /></AdminProtected>} />
                    <Route path="/admin/api-keys" element={<AdminProtected><AdminApiKeys /></AdminProtected>} />
                    <Route path="/admin/plugins" element={<AdminProtected><AdminPlugins /></AdminProtected>} />
                </Routes>
            </Suspense>
        </ErrorBoundary>
    );
}

function App() {
    return (
        <I18nProvider>
        <ThemeProvider>
        <AuthProvider>
          <NotificationsProvider>
            <div id="app-bg" aria-hidden="true" />
            <Router>
                <RootRedirect />
                <AppChrome />
                <RoutesWithBoundary />
                <PwaStatus />
                <ThemeSwitcher />
                <Toaster />
            </Router>
          </NotificationsProvider>
        </AuthProvider>
        </ThemeProvider>
        </I18nProvider>
    );
}

export default App;
