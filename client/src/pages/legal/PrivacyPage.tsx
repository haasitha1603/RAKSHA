import React from 'react';
import { Shield, Lock, Trash2, Eye, Server, RefreshCw } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

export const PrivacyPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Privacy Policy — Raksha</title>
      </Helmet>

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-soft text-primary font-bold text-xs rounded-full">
              <Shield className="w-3.5 h-3.5" />
              <span>Privacy by Design</span>
            </div>
            <h1 className="font-heading font-bold text-3xl sm:text-4xl text-text">
              Raksha Privacy Policy
            </h1>
            <p className="text-xs text-text-muted">
              Effective Date: September 2026 • Version 1.0
            </p>
          </div>

          <div className="space-y-6 text-xs text-text-muted leading-relaxed font-sans">
            <section className="space-y-2">
              <h2 className="font-heading font-bold text-base text-text">1. Core Privacy Principles</h2>
              <p>
                Raksha is engineered around the principle of strict data minimization. We do not track you continuously, we do not monetize your location, and we do not incorporate third-party advertising SDKs or behavioural trackers.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-heading font-bold text-base text-text">2. Data We Collect During Active Journeys</h2>
              <p>
                When you explicitly start a journey or trigger SOS, the application collects:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-text">
                <li>Real-time GPS coordinates and speed telemetry.</li>
                <li>Device battery percentage (used to warn guardians before battery depletion).</li>
                <li>Accelerometer metrics for fall/shake detection (processed locally on device).</li>
                <li>Cab details and vehicle registration numbers you choose to enter.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="font-heading font-bold text-base text-text">3. 24-Hour Automatic Telemetry Purge</h2>
              <p>
                Precise GPS breadcrumbs are automatically wiped from our databases within 24 hours of journey completion. Only high-level aggregated trip metadata (start time, duration, max risk score) is retained in your personal history for review.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-heading font-bold text-base text-text">4. Emergency Dispatch Data Sharing</h2>
              <p>
                During an active SOS or unacknowledged safety check failure, Raksha compiles an Emergency Context Packet containing your last known location, battery status, and vehicle information. This packet is dispatched in parallel to your accepted emergency guardians, the nearest simulated police station, and the nearest trauma hospital.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-heading font-bold text-base text-text">5. Self-Serve Data Access &amp; Hard Deletion</h2>
              <p>
                You retain complete control over your data. In the Settings screen, you may at any time download your complete data archive in structured JSON format or execute a permanent account deletion that erases all records, contacts, and logs.
              </p>
            </section>
          </div>
      </div>
    </>
  );
};
