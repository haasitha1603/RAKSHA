import React from 'react';
import { Cookie, CheckCircle2 } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { Navbar } from '../../components/layout/Navbar.js';
import { Footer } from '../../components/layout/Footer.js';

export const CookiesPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Cookie Policy — Raksha</title>
      </Helmet>

      <div className="min-h-screen bg-bg text-text flex flex-col justify-between">
        <Navbar />

        <main className="max-w-3xl mx-auto px-4 py-10 space-y-8 flex-1">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-soft text-primary font-bold text-xs rounded-full">
              <Cookie className="w-3.5 h-3.5" />
              <span>Zero Tracking Cookies</span>
            </div>
            <h1 className="font-heading font-bold text-3xl sm:text-4xl text-text">
              Cookie &amp; Local Storage Policy
            </h1>
            <p className="text-xs text-text-muted">
              Effective Date: September 2026 • Version 1.0
            </p>
          </div>

          <div className="space-y-6 text-xs text-text-muted leading-relaxed font-sans">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <strong className="block font-heading">Zero Advertising or Tracking Cookies</strong>
                <p className="leading-relaxed">
                  Raksha does not use marketing cookies, tracking pixels, or cross-site fingerprinting scripts. We strictly use essential local storage to keep you securely signed in and cache offline map tiles.
                </p>
              </div>
            </div>

            <section className="space-y-2">
              <h2 className="font-heading font-bold text-base text-text">1. Essential Cookies &amp; Sessions</h2>
              <p>
                We set a single HTTP-only, secure cookie for authentication session management (`raksha_session`). This cookie verifies your identity on secure API requests and expires automatically after inactivity.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-heading font-bold text-base text-text">2. Browser LocalStorage &amp; IndexedDB</h2>
              <p>
                To provide resilient offline functionality as a Progressive Web App (PWA), Raksha stores:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-text">
                <li>Active journey progress and navigation state (to resume if browser closes).</li>
                <li>Offline map tiles and incident markers in IndexedDB.</li>
                <li>Accessibility preferences (theme, font size, contrast, haptic switches).</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="font-heading font-bold text-base text-text">3. Managing and Clearing Storage</h2>
              <p>
                You can clear your local offline cache at any time via your browser settings or directly in the Raksha Settings page under &quot;Privacy &amp; Data Control&quot;.
              </p>
            </section>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};
