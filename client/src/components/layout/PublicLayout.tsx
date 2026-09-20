import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Shield, Sun, Moon } from 'lucide-react';
import { useSettingsStore } from '../../stores/settingsStore.js';
import { useAuthStore } from '../../stores/authStore.js';

export const PublicLayout: React.FC = () => {
  const { theme, setTheme } = useSettingsStore();
  const { user } = useAuthStore();
  const location = useLocation();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const isLoginPage = location.pathname === '/login';

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col justify-between">
      {/* Minimal Public Header */}
      <header className="h-16 border-b border-border bg-surface/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
        <Link to={user ? '/app' : '/login'} className="flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg p-1">
          <div className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center shadow-sm">
            <Shield className="w-5 h-5 fill-current" />
          </div>
          <span className="font-heading font-extrabold text-lg tracking-tight text-text">
            RAKSHA
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-2 rounded-lg text-text-muted hover:text-text hover:bg-surface-raised transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {user ? (
            <Link
              to="/app"
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary-hover transition-colors"
            >
              Dashboard
            </Link>
          ) : isLoginPage ? (
            <Link
              to="/signup"
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-surface-raised border border-border text-text hover:border-primary transition-colors"
            >
              Sign up
            </Link>
          ) : (
            <Link
              to="/login"
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary-hover transition-colors"
            >
              Log in
            </Link>
          )}
        </div>
      </header>

      {/* Main Public Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Minimal Public Footer */}
      <footer className="border-t border-border bg-surface/50 py-6 px-4 text-center text-xs text-text-muted space-y-2">
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link to="/legal/privacy" className="hover:text-text transition-colors">Privacy</Link>
          <span>&middot;</span>
          <Link to="/legal/terms" className="hover:text-text transition-colors">Terms</Link>
          <span>&middot;</span>
          <Link to="/legal/cookies" className="hover:text-text transition-colors">Cookies</Link>
          <span>&middot;</span>
          <Link to="/legal/third-parties" className="hover:text-text transition-colors">Third Parties</Link>
          <span>&middot;</span>
          <Link to="/legal/licenses" className="hover:text-text transition-colors">Licenses</Link>
          <span>&middot;</span>
          <Link to="/legal/contact" className="hover:text-text transition-colors">Contact</Link>
        </div>
        <p className="text-[11px] text-text-muted opacity-80">
          &copy; {new Date().getFullYear()} Raksha Safe Navigation. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default PublicLayout;
