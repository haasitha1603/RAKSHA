import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import {
  Home,
  MapPin,
  Users,
  PhoneCall,
  AlertTriangle,
  Clock,
  Shield,
  HelpCircle,
  Calculator,
  Settings,
  AlertOctagon,
  Sun,
  Moon,
  Menu,
  X,
  LogOut,
  Lock,
  ChevronDown,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore.js';
import { useSettingsStore } from '../../stores/settingsStore.js';
import { useSosStore } from '../../stores/sosStore.js';
import { useJourneyStore } from '../../stores/journeyStore.js';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
}

const MAIN_NAV_ITEMS: NavItem[] = [
  { to: '/app', label: 'Home', icon: Home, end: true },
  { to: '/app/plan', label: 'Plan Journey', icon: MapPin },
  { to: '/app/guardians', label: 'Guardians', icon: Users },
  { to: '/app/fake-call', label: 'Fake Call', icon: PhoneCall },
  { to: '/app/reports', label: 'Safety Reports', icon: AlertTriangle },
  { to: '/app/history', label: 'Journey History', icon: Clock },
];

const TOOLS_NAV_ITEMS: NavItem[] = [
  { to: '/app/drills', label: 'Safety Drills', icon: Shield },
  { to: '/app/help', label: 'Help & Queries', icon: HelpCircle },
  { to: '/app/decoy', label: 'Decoy Calculator', icon: Calculator },
];

const ACCOUNT_NAV_ITEMS: NavItem[] = [
  { to: '/app/settings', label: 'Settings & PINs', icon: Settings },
];

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { theme, setTheme } = useSettingsStore();
  const { triggerSos } = useSosStore();
  const { activeJourney, currentLocation } = useJourneyStore();
  const location = useLocation();
  const navigate = useNavigate();

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile more sheet on location change
  useEffect(() => {
    setMobileMoreOpen(false);
    setProfileMenuOpen(false);
  }, [location.pathname]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleLogout = async () => {
    setProfileMenuOpen(false);
    setMobileMoreOpen(false);
    await logout();
    navigate('/login');
  };

  const handleTriggerSos = async () => {
    const loc = currentLocation || { lat: 28.6139, lng: 77.2090, acc: 10 };
    try {
      await triggerSos({
        journeyId: activeJourney?.id,
        trigger: 'button',
        discreet: false,
        location: loc,
      });
      navigate('/app/sos');
    } catch {
      navigate('/app/sos');
    }
  };

  // Compute Page Title based on route
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/app') return 'Dashboard';
    if (path.startsWith('/app/plan')) return 'Plan Safe Route';
    if (path.startsWith('/app/journey')) return 'Active Journey';
    if (path.startsWith('/app/guardians')) return 'Guardians';
    if (path.startsWith('/app/fake-call')) return 'Fake Call Generator';
    if (path.startsWith('/app/reports')) return 'Safety Reports';
    if (path.startsWith('/app/history')) return 'Journey History';
    if (path.startsWith('/app/drills')) return 'Safety Drills';
    if (path.startsWith('/app/help')) return 'Help & Queries';
    if (path.startsWith('/app/settings')) return 'Settings & PINs';
    if (path.startsWith('/app/decoy')) return 'Calculator Decoy';
    return 'Raksha';
  };

  const userInitial = user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'T';

  return (
    <div className="app-shell">
      {/* ========================================================================= */}
      {/* 1. APP SIDEBAR (Desktop >= 1024px full; Tablet 768-1023px icon rail; Mobile hidden) */}
      {/* ========================================================================= */}
      <aside className="app-sidebar" aria-label="Sidebar Navigation">
        {/* Brand Header */}
        <div className="app-sidebar__brand">
          <Link
            to="/app"
            className="flex items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl p-1"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-indigo-600 flex items-center justify-center text-white shadow-sm flex-shrink-0">
              <Shield className="w-5 h-5 fill-current" />
            </div>
            <div className="app-sidebar__brand-text flex flex-col">
              <span className="font-heading font-extrabold text-lg tracking-tight text-text leading-tight">
                RAKSHA
              </span>
              <span className="text-[10px] text-text-muted font-medium">Safe Route &amp; Emergency</span>
            </div>
          </Link>
        </div>

        {/* Navigation Groups Container */}
        <nav className="app-sidebar__nav space-y-6">
          {/* Group 1: Main */}
          <div>
            <div className="app-sidebar__group-title px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-text-muted select-none">
              Main
            </div>
            <div className="space-y-1">
              {MAIN_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    title={item.label}
                    className={({ isActive }) =>
                      `app-sidebar__item flex items-center gap-3 px-3.5 rounded-xl text-xs font-semibold min-h-[44px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-text hover:bg-surface-raised hover:text-text'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="app-sidebar__item-text truncate">{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>

          {/* Group 2: Tools */}
          <div>
            <div className="app-sidebar__group-title px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-text-muted select-none">
              Tools
            </div>
            <div className="space-y-1">
              {TOOLS_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    title={item.label}
                    className={({ isActive }) =>
                      `app-sidebar__item flex items-center gap-3 px-3.5 rounded-xl text-xs font-semibold min-h-[44px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-text hover:bg-surface-raised hover:text-text'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="app-sidebar__item-text truncate">{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>

          {/* Group 3: Account */}
          <div>
            <div className="app-sidebar__group-title px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-text-muted select-none">
              Account
            </div>
            <div className="space-y-1">
              {ACCOUNT_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    title={item.label}
                    className={({ isActive }) =>
                      `app-sidebar__item flex items-center gap-3 px-3.5 rounded-xl text-xs font-semibold min-h-[44px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-text hover:bg-surface-raised hover:text-text'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="app-sidebar__item-text truncate">{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Footer with Persistent SOS Button */}
        <div className="app-sidebar__footer border-t border-border">
          <button
            onClick={handleTriggerSos}
            title="Emergency SOS"
            className="app-sidebar__sos-btn w-full min-h-[48px] py-2.5 px-3 rounded-xl bg-emergency hover:bg-red-700 active:scale-95 text-white font-heading font-extrabold text-xs shadow-lg shadow-red-900/30 transition-all flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          >
            <AlertOctagon className="w-5 h-5 flex-shrink-0 animate-pulse" />
            <span className="app-sidebar__sos-text uppercase tracking-wider">
              Emergency SOS
            </span>
          </button>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. APP TOP BAR (The ONLY header inside the app shell) */}
      {/* ========================================================================= */}
      <header className="app-top" aria-label="App Header">
        {/* Left: Dynamic Page Title */}
        <div className="flex items-center gap-2.5 min-w-0">
          <h1 className="font-heading font-bold text-base sm:text-lg text-text truncate">
            {getPageTitle()}
          </h1>
        </div>

        {/* Right: Actions (Help, Theme Toggle, Profile Menu) */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* Help & Queries Quick Icon */}
          <Link
            to="/app/help"
            title="Help & Queries"
            className="p-2 rounded-xl text-text-muted hover:text-text hover:bg-surface-raised transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Help and Queries"
          >
            <HelpCircle className="w-5 h-5" />
          </Link>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            title="Toggle theme"
            aria-label="Toggle dark/light theme"
            className="p-2 rounded-xl text-text-muted hover:text-text hover:bg-surface-raised transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* User Profile Menu Dropdown */}
          <div className="relative" ref={profileMenuRef}>
            <button
              onClick={() => setProfileMenuOpen((prev) => !prev)}
              aria-expanded={profileMenuOpen}
              aria-haspopup="true"
              aria-label="User Profile Menu"
              className="flex items-center gap-2 p-1 rounded-xl hover:bg-surface-raised transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground font-heading font-bold text-xs flex items-center justify-center shadow-sm">
                {userInitial}
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-text-muted hidden sm:block" />
            </button>

            {/* Dropdown Card */}
            {profileMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-surface border border-border rounded-2xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                {/* User Info */}
                <div className="px-4 py-2 border-b border-border">
                  <p className="font-semibold text-xs text-text truncate">
                    {user?.displayName || 'Traveller'}
                  </p>
                  <p className="text-[11px] text-text-muted truncate font-mono">
                    @{user?.username || 'user'}
                  </p>
                </div>

                {/* Menu Items */}
                <div className="py-1">
                  <Link
                    to="/app/settings"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-text hover:bg-surface-raised transition-colors"
                  >
                    <Settings className="w-4 h-4 text-text-muted" />
                    <span>Settings &amp; PINs</span>
                  </Link>

                  <Link
                    to="/app/help"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-text hover:bg-surface-raised transition-colors"
                  >
                    <HelpCircle className="w-4 h-4 text-text-muted" />
                    <span>Help &amp; Queries</span>
                  </Link>

                  <Link
                    to="/legal/privacy"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-text hover:bg-surface-raised transition-colors"
                  >
                    <Lock className="w-4 h-4 text-text-muted" />
                    <span>Privacy Policy</span>
                  </Link>

                  <Link
                    to="/legal/contact"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-text hover:bg-surface-raised transition-colors"
                  >
                    <Users className="w-4 h-4 text-text-muted" />
                    <span>Contact Support</span>
                  </Link>
                </div>

                {/* Logout Action */}
                <div className="border-t border-border pt-1">
                  <button
                    onClick={handleLogout}
                    className="w-full text-left flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-emergency hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Log out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 3. APP MAIN CONTENT (The ONLY vertical scroll container in the shell) */}
      {/* ========================================================================= */}
      <main className="app-main" id="main">
        <div className="app-main-inner">
          <Outlet />
        </div>
      </main>

      {/* ========================================================================= */}
      {/* 4. APP MOBILE BOTTOM TABS (Visible only on < 768px screens) */}
      {/* ========================================================================= */}
      <nav className="app-tabs bg-surface/95 backdrop-blur-md border-t border-border" aria-label="Mobile Navigation">
        <div className="h-16 flex items-center justify-around px-2 relative">
          {/* Home */}
          <NavLink
            to="/app"
            end
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-14 h-full text-[11px] font-medium transition-colors ${
                isActive ? 'text-primary' : 'text-text-muted hover:text-text'
              }`
            }
          >
            <Home className="w-5 h-5 mb-0.5" />
            <span>Home</span>
          </NavLink>

          {/* Plan Journey */}
          <NavLink
            to="/app/plan"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-14 h-full text-[11px] font-medium transition-colors ${
                isActive ? 'text-primary' : 'text-text-muted hover:text-text'
              }`
            }
          >
            <MapPin className="w-5 h-5 mb-0.5" />
            <span>Plan</span>
          </NavLink>

          {/* Raised SOS Center Button */}
          <div className="relative -top-3">
            <button
              onClick={handleTriggerSos}
              aria-label="Trigger Emergency SOS"
              className="w-14 h-14 rounded-full bg-emergency text-white flex flex-col items-center justify-center shadow-lg shadow-red-600/40 border-4 border-bg active:scale-95 transition-transform"
            >
              <span className="font-heading font-black text-base tracking-wider leading-none">SOS</span>
              <span className="text-[9px] font-bold opacity-90 mt-0.5">TAP</span>
            </button>
          </div>

          {/* Reports */}
          <NavLink
            to="/app/reports"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-14 h-full text-[11px] font-medium transition-colors ${
                isActive ? 'text-primary' : 'text-text-muted hover:text-text'
              }`
            }
          >
            <AlertTriangle className="w-5 h-5 mb-0.5" />
            <span>Reports</span>
          </NavLink>

          {/* More Sheet Trigger */}
          <button
            onClick={() => setMobileMoreOpen(true)}
            aria-label="Open more tools and settings"
            className={`flex flex-col items-center justify-center w-14 h-full text-[11px] font-medium transition-colors ${
              mobileMoreOpen ? 'text-primary' : 'text-text-muted hover:text-text'
            }`}
          >
            <Menu className="w-5 h-5 mb-0.5" />
            <span>More</span>
          </button>
        </div>
      </nav>

      {/* Mobile More Sheet Modal */}
      {mobileMoreOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm md:hidden">
          <div className="bg-surface border-t border-border rounded-t-3xl max-h-[80vh] overflow-y-auto p-4 space-y-4 shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center">
                  <Shield className="w-4 h-4" />
                </div>
                <span className="font-heading font-bold text-sm text-text">More Features &amp; Tools</span>
              </div>
              <button
                onClick={() => setMobileMoreOpen(false)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text"
                aria-label="Close more sheet"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <Link
                to="/app/guardians"
                onClick={() => setMobileMoreOpen(false)}
                className="p-3 rounded-xl bg-surface-raised border border-border flex flex-col gap-1.5 hover:border-primary/50"
              >
                <Users className="w-5 h-5 text-primary" />
                <span className="font-semibold text-text">Guardians</span>
                <span className="text-[10px] text-text-muted">Manage safety contacts</span>
              </Link>

              <Link
                to="/app/fake-call"
                onClick={() => setMobileMoreOpen(false)}
                className="p-3 rounded-xl bg-surface-raised border border-border flex flex-col gap-1.5 hover:border-primary/50"
              >
                <PhoneCall className="w-5 h-5 text-primary" />
                <span className="font-semibold text-text">Fake Call</span>
                <span className="text-[10px] text-text-muted">Schedule voice evasion</span>
              </Link>

              <Link
                to="/app/history"
                onClick={() => setMobileMoreOpen(false)}
                className="p-3 rounded-xl bg-surface-raised border border-border flex flex-col gap-1.5 hover:border-primary/50"
              >
                <Clock className="w-5 h-5 text-primary" />
                <span className="font-semibold text-text">Journey History</span>
                <span className="text-[10px] text-text-muted">Past routes &amp; breadcrumbs</span>
              </Link>

              <Link
                to="/app/drills"
                onClick={() => setMobileMoreOpen(false)}
                className="p-3 rounded-xl bg-surface-raised border border-border flex flex-col gap-1.5 hover:border-primary/50"
              >
                <Shield className="w-5 h-5 text-primary" />
                <span className="font-semibold text-text">Safety Drills</span>
                <span className="text-[10px] text-text-muted">14 scenario testbench</span>
              </Link>

              <Link
                to="/app/help"
                onClick={() => setMobileMoreOpen(false)}
                className="p-3 rounded-xl bg-surface-raised border border-border flex flex-col gap-1.5 hover:border-primary/50"
              >
                <HelpCircle className="w-5 h-5 text-primary" />
                <span className="font-semibold text-text">Help &amp; Queries</span>
                <span className="text-[10px] text-text-muted">Knowledge base &amp; AI</span>
              </Link>

              <Link
                to="/app/decoy"
                onClick={() => setMobileMoreOpen(false)}
                className="p-3 rounded-xl bg-surface-raised border border-border flex flex-col gap-1.5 hover:border-primary/50"
              >
                <Calculator className="w-5 h-5 text-primary" />
                <span className="font-semibold text-text">Decoy Calculator</span>
                <span className="text-[10px] text-text-muted">Covert tool interface</span>
              </Link>

              <Link
                to="/app/settings"
                onClick={() => setMobileMoreOpen(false)}
                className="p-3 rounded-xl bg-surface-raised border border-border flex flex-col gap-1.5 hover:border-primary/50"
              >
                <Settings className="w-5 h-5 text-primary" />
                <span className="font-semibold text-text">Settings &amp; PINs</span>
                <span className="text-[10px] text-text-muted">Safety &amp; Duress PIN</span>
              </Link>

              <button
                onClick={handleLogout}
                className="p-3 rounded-xl bg-red-950/30 border border-red-900/30 flex flex-col gap-1.5 text-left text-emergency"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-semibold">Log out</span>
                <span className="text-[10px] text-red-400/70">End current session</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppLayout;
