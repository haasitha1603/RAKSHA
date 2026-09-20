import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Menu, X, Sun, Moon } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore.js';
import { useSettingsStore } from '../../stores/settingsStore.js';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const { theme, setTheme } = useSettingsStore();
  const navigate = useNavigate();

  const toggleTheme = () => {
    if (theme === 'dark') setTheme('light');
    else setTheme('dark');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 bg-surface/90 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg p-1">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-indigo-500 flex items-center justify-center text-white shadow-sm">
            <Shield className="w-5 h-5 fill-current" />
          </div>
          <div>
            <span className="font-heading font-extrabold text-xl tracking-tight text-text">RAKSHA</span>
            <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-primary-soft text-primary">
              Prototype
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-text-muted">
          <Link to="/what-if" className="hover:text-text transition-colors">
            What-If Matrix
          </Link>
          <Link to="/demo" className="hover:text-text transition-colors">
            Demo Simulator
          </Link>
          <Link to="/legal/privacy" className="hover:text-text transition-colors">
            Privacy
          </Link>
          <Link to="/contact" className="hover:text-text transition-colors">
            Contact
          </Link>
        </nav>

        {/* Right Actions */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={toggleTheme}
            aria-label="Toggle dark/light theme"
            className="p-2 rounded-lg text-text-muted hover:text-text hover:bg-surface-raised transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {user ? (
            <div className="flex items-center gap-3">
              <Link
                to="/app"
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary-hover transition-colors"
              >
                Open App
              </Link>
              <button
                onClick={handleLogout}
                className="px-3 py-2 text-sm font-medium text-text-muted hover:text-text transition-colors"
              >
                Log out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-semibold text-text hover:bg-surface-raised rounded-lg transition-colors"
              >
                Log in
              </Link>
              <Link
                to="/signup"
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm transition-colors"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-2 rounded-lg text-text-muted hover:text-text"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            className="p-2 rounded-lg text-text"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-surface px-4 pt-3 pb-6 space-y-3">
          <Link
            to="/what-if"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-medium text-text"
          >
            What-If Matrix
          </Link>
          <Link
            to="/demo"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-medium text-text"
          >
            Demo Simulator
          </Link>
          <Link
            to="/responder"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-medium text-text"
          >
            Responder Console
          </Link>
          <Link
            to="/legal/privacy"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-medium text-text"
          >
            Privacy Policy
          </Link>

          <div className="pt-4 border-t border-border flex flex-col gap-2">
            {user ? (
              <>
                <Link
                  to="/app"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm"
                >
                  Go to App
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-center py-2 text-sm text-text-muted"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 rounded-lg border border-border text-text font-semibold text-sm"
                >
                  Log in
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
