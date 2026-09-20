import React from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  Navigation,
  Activity,
  PhoneCall,
  Users,
  Radio,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { APPROVED_HONEST_COPY } from '@raksha/shared';
import { Helmet } from 'react-helmet-async';

export const LandingPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Raksha — Smart Safe Route &amp; Emergency Assistance</title>
        <meta
          name="description"
          content="Raksha is a safety-aware navigation and emergency-response web app recommending safer routes, continuous monitoring, and coordinated emergency bridge."
        />
      </Helmet>

      <div className="space-y-16 py-8">
        {/* Hero Section */}
        <section className="text-center max-w-4xl mx-auto px-4 pt-6 pb-4 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-soft border border-primary/20 text-primary text-xs font-semibold">
            <Shield className="w-4 h-4" />
            <span>Smart Safe Route &amp; Emergency Assistance</span>
          </div>

          <h1 className="font-heading font-extrabold text-4xl sm:text-5xl lg:text-6xl text-text tracking-tight leading-tight">
            Get there more safely — and know what happens if something goes wrong.
          </h1>

          <p className="text-lg sm:text-xl text-text-muted max-w-2xl mx-auto leading-relaxed">
            Raksha recommends safer routes, monitors your journey in real time, offers discreet emergency triggers, and connects your guardian, nearest police station, and hospital simultaneously.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              to="/signup"
              className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-heading font-bold text-base hover:bg-primary-hover shadow-lg hover:shadow-primary/25 transition-all flex items-center gap-2"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/demo"
              className="px-6 py-3 rounded-xl bg-surface border border-border text-text font-heading font-bold text-base hover:bg-surface-raised transition-all flex items-center gap-2"
            >
              <span>Try Demo Simulator</span>
            </Link>
          </div>
        </section>

        {/* Honest Claims Box (§1.3 Mandatory Wording) */}
        <section className="max-w-4xl mx-auto px-4">
          <div className="bg-surface border-2 border-primary/30 rounded-2xl p-6 shadow-sm">
            <div className="flex items-start gap-3.5">
              <Shield className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <h3 className="font-heading font-bold text-base text-text">
                  Our Commitment: Honest Safety Coordination
                </h3>
                <p className="text-sm text-text-muted leading-relaxed">
                  {APPROVED_HONEST_COPY.honestFraming}
                </p>
                <div className="flex items-center gap-2 text-xs font-semibold text-caution">
                  <AlertTriangle className="w-4 h-4 text-caution" />
                  <span>{APPROVED_HONEST_COPY.prototypeNotice}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* The Full Problem Statement (§1.1) */}
        <section className="max-w-4xl mx-auto px-4 space-y-6">
          <div className="text-center space-y-2">
            <span className="text-xs uppercase tracking-wider font-bold text-primary">The Gap</span>
            <h2 className="font-heading font-bold text-3xl text-text">The Problem We Solve</h2>
          </div>

          <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 space-y-4 text-sm sm:text-base text-text-muted leading-relaxed">
            <p>
              Current navigation applications optimise distance, travel time and traffic. They do not fundamentally optimise for the personal safety of the person travelling.
            </p>
            <p>
              A person travelling alone may unknowingly enter areas with a history of incidents, poor lighting, low population density, or limited access to emergency facilities. Even when a journey begins safely, unexpected route deviations, prolonged stops, loss of communication or emergencies can occur.
            </p>
            <p>
              Existing emergency mechanisms also depend on the user being able to physically use their phone, recognise that they are in danger, and manually contact the right person or authority. This creates critical gaps:
            </p>

            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 text-xs sm:text-sm font-medium text-text">
              <li className="flex items-start gap-2">
                <span className="text-emergency font-bold mt-0.5">•</span>
                <span>What if the user cannot unlock or operate the phone?</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emergency font-bold mt-0.5">•</span>
                <span>What if they are already on a phone call?</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emergency font-bold mt-0.5">•</span>
                <span>What if they are unconscious or unable to press SOS?</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emergency font-bold mt-0.5">•</span>
                <span>What if they deliberately avoid a visible emergency call?</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emergency font-bold mt-0.5">•</span>
                <span>What if the phone loses internet connectivity?</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emergency font-bold mt-0.5">•</span>
                <span>What if the user deviates significantly from the route?</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emergency font-bold mt-0.5">•</span>
                <span>What if the user suddenly stops moving?</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emergency font-bold mt-0.5">•</span>
                <span>How can a guardian know whether they are actually safe?</span>
              </li>
            </ul>

            <p className="pt-2 font-medium text-text">
              Raksha closes these gaps by combining safety-aware navigation, continuous journey monitoring, discreet emergency activation, guardian communication, AI-assisted risk analysis and coordinated emergency notification in one system. Instead of only answering <em>"How do I get there?"</em>, Raksha answers <em>"How do I get there more safely, and what happens if something goes wrong?"</em>
            </p>
          </div>
        </section>

        {/* 5-Layer Architecture Diagram & Cards (§1.4) */}
        <section className="max-w-5xl mx-auto px-4 space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs uppercase tracking-wider font-bold text-primary">Architecture</span>
            <h2 className="font-heading font-bold text-3xl text-text">The 5-Layer Protection System</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="p-5 rounded-2xl bg-surface border border-border shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 flex items-center justify-center font-bold">
                1
              </div>
              <h3 className="font-heading font-bold text-base text-text">Safe Navigation</h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Candidate routes ranked live by time and explainable Safety Scores with segment risk colour coding.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-surface border border-border shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center font-bold">
                2
              </div>
              <h3 className="font-heading font-bold text-base text-text">Journey Monitoring</h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Live monitoring for sustained route deviation, unexpected stops, delays, connectivity drop, and low battery.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-surface border border-border shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 flex items-center justify-center font-bold">
                3
              </div>
              <h3 className="font-heading font-bold text-base text-text">Risk Engine</h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Explainable scoring 0–100 mapped to Levels 0–3, with statistical speed-jump and GPS glitch anomaly filters.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-surface border border-border shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 flex items-center justify-center font-bold">
                4
              </div>
              <h3 className="font-heading font-bold text-base text-text">PulseRouteAI Bridge</h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Simultaneous coordination notifying Guardian, nearest Police, and Hospital with one structured emergency packet.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-surface border border-border shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 flex items-center justify-center font-bold">
                5
              </div>
              <h3 className="font-heading font-bold text-base text-text">Guardian &amp; Community</h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Private magic links for guardians, safe arrival pings, and decaying community reports with multi-user corroboration.
              </p>
            </div>
          </div>
        </section>

        {/* Discreet SOS & Fake Call Highlights */}
        <section className="max-w-4xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-surface border border-border rounded-2xl p-6 space-y-3">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <Lock className="w-5 h-5" />
                <span>Discreet SOS &amp; Duress PIN</span>
              </div>
              <h3 className="font-heading font-bold text-lg text-text">
                Protection Even Under Coercion
              </h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Discreet SOS activates without sounds, vibration or red flashing. If an aggressor forces you to cancel, entering your secret <strong>Duress PIN</strong> fakes an "SOS Cancelled" confirmation while silently escalating alerts to guardians and responders.
              </p>
            </div>

            <div className="bg-surface border border-border rounded-2xl p-6 space-y-3">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <PhoneCall className="w-5 h-5" />
                <span>Realistic Fake Call</span>
              </div>
              <h3 className="font-heading font-bold text-lg text-text">
                Schedule a Believable Exit
              </h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Schedule incoming calls beforehand. At the chosen time, your phone rings with full-screen realistic incoming caller UI, synthesised ringtone, vibration, and multi-turn spoken dialogue with natural pauses so you can reply out loud.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="max-w-4xl mx-auto px-4 text-center pb-8">
          <div className="bg-gradient-to-r from-primary to-indigo-900 text-white rounded-3xl p-8 sm:p-10 shadow-xl space-y-4">
            <h2 className="font-heading font-extrabold text-2xl sm:text-3xl">
              Experience the Full Prototype
            </h2>
            <p className="text-white/80 text-sm max-w-xl mx-auto">
              Test all 30 edge-case scenarios, simulate deviations and unexpected stops, and watch the parallel emergency coordination bridge in action.
            </p>
            <div className="pt-2 flex flex-wrap justify-center gap-4">
              <Link
                to="/demo"
                className="px-6 py-3 rounded-xl bg-white text-primary font-heading font-bold text-sm hover:bg-white/90 shadow-md transition-colors"
              >
                Launch Demo Simulator
              </Link>
              <Link
                to="/what-if"
                className="px-6 py-3 rounded-xl bg-white/10 text-white border border-white/20 font-heading font-bold text-sm hover:bg-white/20 transition-colors"
              >
                Read What-If Matrix &amp; Judge Q&amp;A
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};
