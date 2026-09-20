import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  HelpCircle,
  AlertOctagon,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Search,
  ChevronDown,
  ChevronUp,
  Zap,
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { PrototypeDisclaimer } from '../../components/common/PrototypeDisclaimer.js';

interface LoopholeItem {
  id: number;
  category: 'Attacker Action' | 'Hardware Failure' | 'Network & GPS' | 'Algorithmic' | 'Human Factor';
  scenario: string;
  traditionalFailure: string;
  rakshaDefense: string;
  simAction?: string;
}

const LOOPHOLE_MATRIX: LoopholeItem[] = [
  {
    id: 1,
    category: 'Attacker Action',
    scenario: 'Attacker forces victim to cancel active SOS under physical threat',
    traditionalFailure: 'Victim enters PIN; alarm aborts; police/family never alerted.',
    rakshaDefense: 'Duress PIN (4321) enters stealth duress state: UI says "SOS Cancelled", but silently dispatches emergency packet with duress flag to responders.',
    simAction: 'sos_duress',
  },
  {
    id: 2,
    category: 'Attacker Action',
    scenario: 'Attacker snatches and smashes phone or throws it into a drain',
    traditionalFailure: 'No further telemetry; server assumes user closed the app normally.',
    rakshaDefense: 'Server 5-second Watchdog checks last ping. If ping ceases during an active journey without safe conclusion, triggers Escalated Missing Alert.',
    simAction: 'offline',
  },
  {
    id: 3,
    category: 'Attacker Action',
    scenario: 'Cab driver takes an unlit bypass road instead of highway',
    traditionalFailure: 'Navigation reroutes silently without alerting guardians.',
    rakshaDefense: 'Corridor deviation detector flags >150m off-route excursion and triggers a safety check with 30s countdown before escalating to guardians.',
    simAction: 'deviation',
  },
  {
    id: 4,
    category: 'Hardware Failure',
    scenario: 'Phone battery drops below 10% late at night',
    traditionalFailure: 'Phone dies unannounced; guardians have no idea where user last was.',
    rakshaDefense: 'Battery API monitors voltage. When battery drops below 15%, last known GPS and route progress are preemptively transmitted to guardians.',
    simAction: 'battery',
  },
  {
    id: 5,
    category: 'Network & GPS',
    scenario: 'Victim enters an underground parking lot or tunnel (cellular dead zone)',
    traditionalFailure: 'App crashes or loses tracking entirely.',
    rakshaDefense: 'Client-side Service Worker caches breadcrumbs in IndexedDB and uses dead-reckoning speed projections until network recovers.',
    simAction: 'offline',
  },
  {
    id: 6,
    category: 'Human Factor',
    scenario: 'Pocket trigger / false touch of SOS button while jogging',
    traditionalFailure: 'Triggers embarrassing false alarms to police or relatives.',
    rakshaDefense: '88px raised SOS button requires deliberate 3-second hold with visual animated SVG progress ring and loud countdown beeps before dispatch.',
  },
  {
    id: 7,
    category: 'Algorithmic',
    scenario: 'GPS multipath glitch produces an instantaneous 200 km/h jump',
    traditionalFailure: 'Algorithm triggers false kidnapping or car-crash alert.',
    rakshaDefense: 'Kalman-inspired speed jump filter rejects instantaneous delta > 40 m/s unless verified over consecutive GPS readings.',
  },
  {
    id: 8,
    category: 'Human Factor',
    scenario: 'User gets stuck in a boring or uncomfortable conversation with a stranger',
    traditionalFailure: 'User has no realistic pretext to exit without causing friction.',
    rakshaDefense: 'Fake Call generator simulates realistic incoming phone call with customized caller identity, ringtone, and spoken speech synthesis.',
  },
  {
    id: 9,
    category: 'Attacker Action',
    scenario: 'Attacker grabs phone and inspects screen looking for safety apps',
    traditionalFailure: 'Prominent "SOS Active" screens invite violence or phone destruction.',
    rakshaDefense: 'Triple-tap logo or quick toggle instantly switches to fully working Calculator Decoy; exits only with 2-second hold on "=".',
  },
  {
    id: 10,
    category: 'Algorithmic',
    scenario: 'Malicious actors attempt to downvote or spam safety hazard reports',
    traditionalFailure: 'Review bombs distort safety maps and mislead travellers.',
    rakshaDefense: 'Community reports employ exponential half-life decay (24h) and require multi-user geographic confirmation weighting.',
  },
  {
    id: 11,
    category: 'Network & GPS',
    scenario: 'Traffic jam causes user to stop on road for 15 minutes',
    traditionalFailure: 'Simple stop-detectors spam repeated alarms.',
    rakshaDefense: 'Activity zone context checking verifies if the stop is along a recognized high-traffic arterial road before raising concern.',
  },
  {
    id: 12,
    category: 'Human Factor',
    scenario: 'Guardian is asleep and has their phone on silent',
    traditionalFailure: 'App relies solely on one guardian who misses the alert.',
    rakshaDefense: 'PulseRouteAI Emergency Bridge notifies all guardians plus the nearest local police control room simultaneously.',
  },
  {
    id: 13,
    category: 'Attacker Action',
    scenario: 'Driver locks doors and accelerates away from destination',
    traditionalFailure: 'App shows estimated arrival increasing without distress triggers.',
    rakshaDefense: 'Reverse progress vector detector identifies negative distance delta toward destination and triggers priority safety check.',
  },
  {
    id: 14,
    category: 'Hardware Failure',
    scenario: 'User drops phone and screen cracks, touch becomes unresponsive',
    traditionalFailure: 'Cannot type PIN or navigate menus to call for help.',
    rakshaDefense: 'Physical device shake detection (accelerometer threshold > 24 m/s²) arms and triggers SOS without needing screen input.',
  },
  {
    id: 15,
    category: 'Network & GPS',
    scenario: 'SMS network congestion delays SMS delivery by 20 minutes',
    traditionalFailure: 'SMS is the single point of failure.',
    rakshaDefense: 'Multi-protocol dispatch: Socket.IO real-time stream + Web Push notification + mock SMS outbox + direct Police radio bridge.',
  },
  {
    id: 16,
    category: 'Human Factor',
    scenario: 'User safely reaches home but forgets to tap "Finish Journey"',
    traditionalFailure: 'App triggers false alarm when user goes to bed.',
    rakshaDefense: 'Geofence auto-arrival detects coordinates within 50m of destination and marks journey completed automatically.',
  },
  {
    id: 17,
    category: 'Algorithmic',
    scenario: 'Route planner chooses a dark, deserted alleyway because it is 30 seconds faster',
    traditionalFailure: 'Standard GPS navigators optimize strictly for travel time, routing pedestrians through high-risk crime clusters.',
    rakshaDefense: 'Safety slider (0–100%) balances travel time against lighting, crime incident clusters, and verified commercial activity.',
  },
  {
    id: 18,
    category: 'Attacker Action',
    scenario: 'Attacker forces victim to open app and reveal guardian contacts',
    traditionalFailure: 'Attacker sees phone numbers of relatives to threaten.',
    rakshaDefense: 'Guardian phone numbers and tokens are masked in user-facing views after confirmation.',
  },
  {
    id: 19,
    category: 'Network & GPS',
    scenario: 'User traverses area with fluctuating 2G/3G connectivity',
    traditionalFailure: 'Requests time out and disconnect.',
    rakshaDefense: 'Lightweight binary/JSON payloads with exponential backoff retry and optimistic local UI state.',
  },
  {
    id: 20,
    category: 'Human Factor',
    scenario: 'User is hearing-impaired or has low vision',
    traditionalFailure: 'Visual-only alerts or inaccessible contrast fail in dark environments.',
    rakshaDefense: 'WCAG 2.1 AA contrast, large text modes, vibration haptics, and audible speech synthesis with screen reader ARIA live regions.',
  },
  {
    id: 21,
    category: 'Hardware Failure',
    scenario: 'Browser tab is backgrounded on mobile device',
    traditionalFailure: 'Operating system pauses timers and web workers.',
    rakshaDefense: 'Custom Service Worker with background sync + server-side watchdog that monitors heartbeat from the backend.',
  },
  {
    id: 22,
    category: 'Attacker Action',
    scenario: 'Attacker demands victim hand over phone passcode to unlock',
    traditionalFailure: 'Safety apps are clearly visible as installed apps.',
    rakshaDefense: 'Decoy calculator icon and title mode conceal Raksha during manual phone inspections.',
  },
  {
    id: 23,
    category: 'Algorithmic',
    scenario: 'Daytime safe road becomes high-risk after 10 PM due to commercial closure',
    traditionalFailure: 'Static safety scores ignore the time of day.',
    rakshaDefense: 'Dynamic night multiplier increases risk weight by 1.6x for unlit zones between 20:00 and 06:00.',
  },
  {
    id: 24,
    category: 'Human Factor',
    scenario: 'Guardian is on desktop and does not have Raksha installed',
    traditionalFailure: 'Guardian forced to download app from app store before viewing.',
    rakshaDefense: 'Zero-install web tracking link opens instantly on any desktop or mobile browser via secure token.',
  },
  {
    id: 25,
    category: 'Attacker Action',
    scenario: 'Attacker tries to brute-force Safety PIN',
    traditionalFailure: 'Infinite attempts allowed without lockout.',
    rakshaDefense: '3 consecutive incorrect attempts locks dismissal and escalates safety check directly to SOS.',
  },
  {
    id: 26,
    category: 'Network & GPS',
    scenario: 'GPS accuracy degrades to ±500m due to heavy cloud cover or high-rises',
    traditionalFailure: 'Erroneous off-route deviation triggered.',
    rakshaDefense: 'Hysteresis and accuracy-radius tolerance: deviation only registers if distance exceeds `accuracy_radius + 100m`.',
  },
  {
    id: 27,
    category: 'Human Factor',
    scenario: 'Traveller is in a shared auto or cab and cannot speak freely',
    traditionalFailure: 'Emergency apps require voice commands or loud calls.',
    rakshaDefense: 'Discreet 1-tap presets and voice-recognition keyword detection (detects "help me", "bachao", "stop the car").',
  },
  {
    id: 28,
    category: 'Attacker Action',
    scenario: 'Attacker attempts to eavesdrop or intercept guardian tracking links',
    traditionalFailure: 'Predictable sequential IDs (e.g. `/g/1234`) allow unauthorized monitoring.',
    rakshaDefense: 'Cryptographically random high-entropy tokens (`tok_...`) generated via `crypto.randomBytes`.',
  },
  {
    id: 29,
    category: 'Hardware Failure',
    scenario: 'Accidental device restart during journey',
    traditionalFailure: 'Journey state lost upon browser reopen.',
    rakshaDefense: 'Active journey ID persisted in local storage; auto-resumes monitoring upon app reopening.',
  },
  {
    id: 30,
    category: 'Human Factor',
    scenario: 'Elderly guardian struggles to read complex coordinates',
    traditionalFailure: 'Shows raw latitude/longitude numbers.',
    rakshaDefense: 'Human-readable reverse geocoded street names, live speed in km/h, and landmark references.',
  },
];

const JUDGE_QA = [
  {
    q: 'Why did you build Raksha as a progressive web app (PWA) instead of a native iOS/Android app?',
    a: 'Zero-install friction is paramount in safety emergencies. If a user needs help or a guardian receives a link, they cannot afford a 40MB app download, account signup, and biometric verification. PWAs load in under 1 second on any device, work offline via Service Workers, and allow instant tracking links to open directly in any browser.',
  },
  {
    q: 'How does Raksha prevent false positives from turning guardians and responders away?',
    a: 'We use a 3-layer filter: (1) Kalman-inspired speed jump rejection, (2) Hysteresis with a 30-second local Safety Check countdown with vibration and chime, and (3) Dynamic context checking (e.g. traffic congestion on known arterials is not marked as an abduction stop). Only unacknowledged checks escalate.',
  },
  {
    q: 'What is the "Duress PIN" and why is it distinct from a normal PIN?',
    a: 'If a victim is held at knifepoint and forced to unlock or cancel an alarm, typing a normal PIN stops help. Entering the secret Duress PIN (e.g. 4321) pretends to cancel the alarm on screen ("SOS Cancelled"), but secretly marks the database record as `duress_escalated` and broadcasts an immediate silent distress beacon.',
  },
  {
    q: 'How does PulseRouteAI differ from existing SOS apps like Life360 or government 112 apps?',
    a: 'Traditional apps use sequential notification trees (user -> guardian -> 15m delay -> guardian calls police -> police questions -> police radios ambulance). PulseRouteAI executes a parallel broadcast in under 800ms to guardians, the nearest police station, and the nearest trauma hospital simultaneously with structured context (GPS, battery, speed, cab plate).',
  },
  {
    q: 'How do you prevent harassment report spamming or competitor sabotage of businesses?',
    a: 'Community hazard reports require geographic proximity, include an automated exponential half-life decay (scores diminish after 24h unless re-confirmed by distinct users), and incorporate NLP keyword categorization rather than subjective star ratings.',
  },
  {
    q: 'How do you safeguard user privacy when tracking journeys?',
    a: 'Privacy by design: No third-party ad SDKs or tracking pixels. GPS breadcrumbs are automatically purged within 24 hours of journey completion. Live tracking tokens are revocable with 1 tap, and users can export or permanently wipe their account data at any time.',
  },
  {
    q: 'What happens if the traveller loses internet connectivity inside a basement or tunnel?',
    a: 'The Service Worker stores breadcrumbs locally in IndexedDB and queues them for opportunistic transmission upon reconnect. Meanwhile, the backend 5-second Watchdog notices missing pings and triggers an alert if the timeout exceeds the safety profile threshold.',
  },
  {
    q: 'How do you calculate safety scores for route alternatives?',
    a: 'We sample candidate routes at 100-meter intervals, querying spatial indexes for unlit segments, historical incident clusters, deserted roads, and open commercial establishments. A night multiplier (1.6x) adjusts risk after dark, and the interactive slider lets users trade extra travel time for higher safety.',
  },
  {
    q: 'What are the current limitations of this prototype?',
    a: 'In this hackathon prototype, police and hospital responder desks are simulated via the Responder Console rather than live government 112 ERSS integrations. SMS notifications go to a mock outbox by default. On iOS Safari, background location streaming is throttled when the screen is locked compared to Android WebAPK.',
  },
  {
    q: 'How will Raksha be deployed and monetized in production?',
    a: 'Raksha is designed as open public safety infrastructure. Deployment can be partnered with municipal police departments (112 ERSS API integration), ride-hailing platforms (safety verification layer), and university campuses. Core consumer features will remain 100% free and ad-free.',
  },
];

export const WhatIfPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedQA, setExpandedQA] = useState<number | null>(null);

  const filteredLoopholes = LOOPHOLE_MATRIX.filter((item) => {
    const matchesSearch =
      item.scenario.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.rakshaDefense.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <>
      <Helmet>
        <title>What-If Matrix &amp; Judge Q&amp;A — Raksha</title>
      </Helmet>

      <div className="min-h-screen bg-bg text-text pb-12 flex flex-col justify-between">
        <PrototypeDisclaimer />

        <div className="max-w-5xl mx-auto w-full px-4 py-8 space-y-10">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-soft text-primary font-bold text-xs rounded-full">
              <Zap className="w-3.5 h-3.5" />
              <span>Rigorous Threat Modeling &amp; Architecture Defense</span>
            </div>
            <h1 className="font-heading font-bold text-3xl sm:text-4xl text-text">
              What-If Loophole Matrix &amp; Judge Q&amp;A
            </h1>
            <p className="text-xs text-text-muted max-w-2xl mx-auto leading-relaxed">
              Real-world safety applications fail at the boundaries. We cataloged 30 distinct attacker actions, hardware failures, and edge cases, detailing Raksha&apos;s mitigation for each.
            </p>
          </div>

          {/* SECTION 1: LOOPHOLE MATRIX */}
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-primary" />
                <h2 className="font-heading font-bold text-xl text-text">
                  The 30-Scenario Edge Case Matrix ({filteredLoopholes.length})
                </h2>
              </div>

              {/* Search & Filter */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-text-muted" />
                  <input
                    type="text"
                    placeholder="Search scenarios..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 pr-3 py-1.5 rounded-xl border border-border bg-input-bg text-xs w-48 focus:outline-hidden focus:ring-2 focus:ring-primary"
                  />
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-border bg-input-bg text-xs focus:outline-hidden"
                >
                  <option value="all">All Categories</option>
                  <option value="Attacker Action">Attacker Action</option>
                  <option value="Hardware Failure">Hardware Failure</option>
                  <option value="Network & GPS">Network &amp; GPS</option>
                  <option value="Algorithmic">Algorithmic</option>
                  <option value="Human Factor">Human Factor</option>
                </select>
              </div>
            </div>

            {/* Matrix Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredLoopholes.map((item) => (
                <div
                  key={item.id}
                  className="p-4 bg-surface border border-border rounded-2xl shadow-xs space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-surface-raised text-text-muted border border-border">
                        #{item.id} • {item.category}
                      </span>
                      {item.simAction && (
                        <button
                          onClick={() => navigate('/demo')}
                          className="text-[10px] text-primary hover:underline font-semibold flex items-center gap-1"
                        >
                          <span>Test in Demo</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <h3 className="font-heading font-bold text-sm text-text leading-snug">
                      {item.scenario}
                    </h3>

                    <div className="space-y-1.5 text-xs">
                      <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-800 dark:text-red-300 flex items-start gap-1.5">
                        <XCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                        <div>
                          <strong className="block text-[11px]">Conventional Failure:</strong>
                          <span>{item.traditionalFailure}</span>
                        </div>
                      </div>

                      <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 flex items-start gap-1.5">
                        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
                        <div>
                          <strong className="block text-[11px]">Raksha Architectural Defense:</strong>
                          <span>{item.rakshaDefense}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* SECTION 2: JUDGE Q&A */}
          <section className="space-y-4 pt-6 border-t border-border">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              <h2 className="font-heading font-bold text-xl text-text">
                Hackathon Judge Q&amp;A &amp; Deep-Dive Technical Answers
              </h2>
            </div>

            <div className="space-y-3">
              {JUDGE_QA.map((qa, idx) => {
                const isOpen = expandedQA === idx;
                return (
                  <div
                    key={idx}
                    className="bg-surface border border-border rounded-2xl overflow-hidden transition-colors"
                  >
                    <button
                      onClick={() => setExpandedQA(isOpen ? null : idx)}
                      className="w-full text-left p-4 flex items-center justify-between gap-3 hover:bg-surface-raised transition-colors"
                    >
                      <span className="font-heading font-bold text-sm text-text">
                        {idx + 1}. {qa.q}
                      </span>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-text-muted shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-text-muted shrink-0" />
                      )}
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-4 pt-1 text-xs text-text-muted leading-relaxed border-t border-border/60 bg-surface-raised/40">
                        {qa.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <div className="text-center text-xs text-text-muted pt-8 pb-4">
          Raksha Engineering Documentation • Verified Threat Model
        </div>
      </div>
    </>
  );
};
