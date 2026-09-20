import React from 'react';
import { FileText, AlertTriangle } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { Navbar } from '../../components/layout/Navbar.js';
import { Footer } from '../../components/layout/Footer.js';

export const TermsPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Terms of Service — Raksha</title>
      </Helmet>

      <div className="min-h-screen bg-bg text-text flex flex-col justify-between">
        <Navbar />

        <main className="max-w-3xl mx-auto px-4 py-10 space-y-8 flex-1">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-soft text-primary font-bold text-xs rounded-full">
              <FileText className="w-3.5 h-3.5" />
              <span>Legal Terms</span>
            </div>
            <h1 className="font-heading font-bold text-3xl sm:text-4xl text-text">
              Terms of Service
            </h1>
            <p className="text-xs text-text-muted">
              Effective Date: September 2026 • Version 1.0
            </p>
          </div>

          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="block font-heading">Emergency Disclaimer Notice</strong>
              <p className="leading-relaxed">
                Raksha is a safety assistive tool and hackathon prototype. In any immediate, life-threatening emergency, always dial <strong>112</strong> (National Emergency Helpline) or contact local law enforcement directly. Raksha does not replace municipal emergency services.
              </p>
            </div>
          </div>

          <div className="space-y-6 text-xs text-text-muted leading-relaxed font-sans">
            <section className="space-y-2">
              <h2 className="font-heading font-bold text-base text-text">1. Nature of Service</h2>
              <p>
                Raksha provides risk-aware route planning, simulated emergency alerts, and guardian telemetry monitoring. Features are provided on an &quot;as-is&quot; basis to assist users in making informed navigation decisions.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-heading font-bold text-base text-text">2. Age Requirement &amp; Eligibility</h2>
              <p>
                You must be at least 18 years of age or possess legal parental/guardian consent to create an account and use Raksha services.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-heading font-bold text-base text-text">3. Accuracy of Crowdsourced Reports</h2>
              <p>
                Safety reports, hazard markings, and lighting scores represent crowdsourced community submissions and public OpenStreetMap data. While Raksha applies automated confidence weighting and half-life decay, we cannot warrant 100% accuracy of road conditions.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-heading font-bold text-base text-text">4. Prohibited Uses</h2>
              <p>
                You agree not to submit fraudulent emergency alerts, harass other users, misuse community reporting tools to harm local establishments, or attempt unauthorized access to infrastructure endpoints.
              </p>
            </section>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};
