import React, { useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
} from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { useAuthStore } from './stores/authStore.js';
import { useSettingsStore } from './stores/settingsStore.js';

// Layout & Common
import { SkipLink } from './components/common/SkipLink.js';
import { OfflineBanner } from './components/common/OfflineBanner.js';
import { AppLayout } from './components/layout/AppLayout.js';
import { PublicLayout } from './components/layout/PublicLayout.js';
import { GuardianLayout } from './components/layout/GuardianLayout.js';
import { ResponderLayout } from './components/layout/ResponderLayout.js';

// Pages
import { SignupPage } from './pages/auth/SignupPage.js';
import { LoginPage } from './pages/auth/LoginPage.js';
import { OnboardingWizard } from './pages/auth/OnboardingWizard.js';

import { HomePage } from './pages/app/HomePage.js';
import { PlanPage } from './pages/app/PlanPage.js';
import { ActiveJourneyPage } from './pages/app/ActiveJourneyPage.js';
import { SosPage } from './pages/app/SosPage.js';
import { FakeCallPage } from './pages/app/FakeCallPage.js';
import { FakeCallStandbyPage } from './pages/app/FakeCallStandbyPage.js';
import { FakeCallIncomingPage } from './pages/app/FakeCallIncomingPage.js';
import { GuardiansPage } from './pages/app/GuardiansPage.js';
import { ReportsPage } from './pages/app/ReportsPage.js';
import { HistoryPage } from './pages/app/HistoryPage.js';
import { SettingsPage } from './pages/app/SettingsPage.js';
import { DecoyPage } from './pages/app/DecoyPage.js';
import { HelpPage } from './pages/app/HelpPage.js';
import { DrillsPage } from './pages/app/DrillsPage.js';

import { GuardianViewPage } from './pages/guardian/GuardianViewPage.js';
import { ResponderLoginPage } from './pages/responder/ResponderLoginPage.js';
import { ResponderConsolePage } from './pages/responder/ResponderConsolePage.js';

import { PrivacyPage } from './pages/legal/PrivacyPage.js';
import { TermsPage } from './pages/legal/TermsPage.js';
import { CookiesPage } from './pages/legal/CookiesPage.js';
import { ThirdPartiesPage } from './pages/legal/ThirdPartiesPage.js';
import { LicensesPage } from './pages/legal/LicensesPage.js';
import { ContactPage } from './pages/legal/ContactPage.js';
import { NotFoundPage } from './pages/NotFoundPage.js';

// Protected Route Component
const ProtectedRoute: React.FC = () => {
  const { user, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

// Root Redirect based on authentication state
const RootRedirect: React.FC = () => {
  const { user, isLoading } = useAuthStore();
  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  return user ? <Navigate to="/app" replace /> : <Navigate to="/login" replace />;
};

export const App: React.FC = () => {
  const checkSession = useAuthStore((s) => s.checkSession);
  const { theme, textSize, highContrast } = useSettingsStore();

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // Apply theme & accessibility attributes to root HTML
  useEffect(() => {
    const root = document.documentElement;

    // Theme class
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      // System
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }

    // Text size
    root.classList.remove('text-size-large', 'text-size-xl');
    if (textSize === 'large') root.classList.add('text-size-large');
    if (textSize === 'xl') root.classList.add('text-size-xl');

    // High contrast
    if (highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
  }, [theme, textSize, highContrast]);

  return (
    <HelmetProvider>
      <BrowserRouter>
        <SkipLink />
        <OfflineBanner />

        <Routes>
          {/* Root Entry: Operational Redirect */}
          <Route path="/" element={<RootRedirect />} />

          {/* Public Routes (Public Layout with clean header & footer) */}
          <Route element={<PublicLayout />}>
            <Route path="/legal/privacy" element={<PrivacyPage />} />
            <Route path="/legal/terms" element={<TermsPage />} />
            <Route path="/legal/cookies" element={<CookiesPage />} />
            <Route path="/legal/third-parties" element={<ThirdPartiesPage />} />
            <Route path="/legal/licenses" element={<LicensesPage />} />
            <Route path="/legal/contact" element={<ContactPage />} />

            <Route path="/signup" element={<SignupPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/onboarding" element={<OnboardingWizard />} />
          </Route>

          {/* Direct Redirects */}
          <Route path="/demo" element={<Navigate to="/app/drills" replace />} />
          <Route path="/what-if" element={<Navigate to="/app/help" replace />} />
          <Route path="/demo/what-if" element={<Navigate to="/app/help" replace />} />

          {/* Public Guardian Tracking Stream */}
          <Route element={<GuardianLayout />}>
            <Route path="/g/:token" element={<GuardianViewPage />} />
          </Route>

          {/* Simulated Responder Console */}
          <Route element={<ResponderLayout />}>
            <Route path="/responder" element={<ResponderLoginPage />} />
            <Route path="/responder/:facilityId" element={<ResponderConsolePage />} />
          </Route>

          {/* Protected User Routes (Standard App Layout with 272px Sidebar, single topbar, single scroll) */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/app" element={<HomePage />} />
              <Route path="/app/plan" element={<PlanPage />} />
              <Route path="/app/journey/:id" element={<ActiveJourneyPage />} />
              <Route path="/app/fake-call" element={<FakeCallPage />} />
              <Route path="/app/guardians" element={<GuardiansPage />} />
              <Route path="/app/reports" element={<ReportsPage />} />
              <Route path="/app/history" element={<HistoryPage />} />
              <Route path="/app/settings" element={<SettingsPage />} />
              <Route path="/app/help" element={<HelpPage />} />
              <Route path="/app/drills" element={<DrillsPage />} />
            </Route>

            {/* Immersive Fullscreen Pages (No standard bottom nav or sidebar) */}
            <Route path="/app/sos" element={<SosPage />} />
            <Route path="/app/fake-call/standby/:id" element={<FakeCallStandbyPage />} />
            <Route path="/app/fake-call/incoming/:id" element={<FakeCallIncomingPage />} />
            <Route path="/app/decoy" element={<DecoyPage />} />
          </Route>

          {/* 404 Catch-All */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </HelmetProvider>
  );
};

export default App;
