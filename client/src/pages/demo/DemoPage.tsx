import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  AlertTriangle,
  Battery,
  WifiOff,
  Navigation,
  ShieldAlert,
  Smartphone,
  CheckCircle,
  Inbox,
  Radio,
  ExternalLink,
} from 'lucide-react';
import { apiFetch } from '../../lib/api.js';
import { Helmet } from 'react-helmet-async';
import { SafetyMap } from '../../components/map/SafetyMap.js';
import { PrototypeDisclaimer } from '../../components/common/PrototypeDisclaimer.js';

interface SmsItem {
  id: string;
  to_phone: string;
  message: string;
  created_at: number;
}

export const DemoPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'controls' | 'outbox' | 'multiview'>('controls');
  const [multiplier, setMultiplier] = useState<number>(2);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [batteryLevel, setBatteryLevel] = useState<number>(82);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [riskScore, setRiskScore] = useState<number>(24);
  const [smsList, setSmsList] = useState<SmsItem[]>([]);
  const [guardianToken, setGuardianToken] = useState<string>('tok_seed_demo_priya');

  // Coordinates along a sample journey in central Bengaluru
  const sampleRoute: [number, number][] = [
    [12.9716, 77.5946], // Vidhana Soudha
    [12.973, 77.598],
    [12.975, 77.603], // MG Road
    [12.9765, 77.61], // Brigade Road
    [12.975, 77.62],
    [12.97, 77.63], // Indiranagar 100ft Rd
    [12.965, 77.64],
  ];

  const [currentCoordIndex, setCurrentCoordIndex] = useState<number>(0);
  const timerRef = useRef<number | null>(null);

  const fetchOutbox = async () => {
    try {
      const res = await apiFetch<{ outbox: SmsItem[] }>('/api/demo/outbox');
      setSmsList(res.outbox || []);
    } catch (err) {
      console.error('Failed to load SMS outbox:', err);
    }
  };

  useEffect(() => {
    fetchOutbox();
    const interval = setInterval(fetchOutbox, 3000);
    return () => clearInterval(interval);
  }, []);

  // Simulator step
  useEffect(() => {
    if (isRunning) {
      const stepDuration = 2000 / multiplier;
      timerRef.current = window.setInterval(() => {
        setCurrentCoordIndex((prev) => {
          if (prev >= sampleRoute.length - 1) {
            setIsRunning(false);
            setActiveScenario('Journey safely finished');
            return prev;
          }
          const next = prev + 1;
          setProgress(Math.round((next / (sampleRoute.length - 1)) * 100));
          return next;
        });
      }, stepDuration);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, multiplier]);

  // Scenario injections
  const handleInjectDeviation = async () => {
    setActiveScenario('Abrupt 350m deviation detected into unlit zone');
    setRiskScore(78);
    try {
      await apiFetch('/api/demo/simulate-scenario', {
        method: 'POST',
        body: JSON.stringify({
          scenario: 'deviation',
          latitude: 12.978,
          longitude: 77.608,
        }),
      });
      fetchOutbox();
    } catch (e) {}
  };

  const handleInjectStop = async () => {
    setActiveScenario('Sudden prolonged stop (120s) in low-activity cluster');
    setRiskScore(65);
    try {
      await apiFetch('/api/demo/simulate-scenario', {
        method: 'POST',
        body: JSON.stringify({ scenario: 'stop' }),
      });
      fetchOutbox();
    } catch (e) {}
  };

  const handleInjectBattery = () => {
    setActiveScenario('Battery critically dropped to 9%');
    setBatteryLevel(9);
  };

  const handleInjectSos = async () => {
    setActiveScenario('Simulated stealth duress SOS triggered');
    setRiskScore(99);
    try {
      await apiFetch('/api/demo/simulate-scenario', {
        method: 'POST',
        body: JSON.stringify({ scenario: 'sos_duress' }),
      });
      fetchOutbox();
    } catch (e) {}
  };

  const handleReset = () => {
    setIsRunning(false);
    setCurrentCoordIndex(0);
    setProgress(0);
    setBatteryLevel(82);
    setIsOffline(false);
    setActiveScenario(null);
    setRiskScore(24);
  };

  const currentCoords = sampleRoute[currentCoordIndex];

  return (
    <>
      <Helmet>
        <title>Demo Simulator &amp; Multi-View — Raksha</title>
      </Helmet>

      <div className="min-h-screen bg-bg text-text pb-12 flex flex-col justify-between">
        <PrototypeDisclaimer />

        <div className="max-w-6xl mx-auto w-full px-4 py-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-surface border border-border rounded-2xl shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-heading font-bold text-2xl text-text">Virtual Traveller Simulator</h1>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-primary-soft text-primary">
                  Interactive Testbench
                </span>
              </div>
              <p className="text-xs text-text-muted mt-1">
                Trigger real-time edge cases, test the risk engine hysteresis, inspect the simulated SMS outbox, and view 3-device live sync.
              </p>
            </div>

            {/* View Mode Tabs */}
            <div className="flex items-center gap-1 bg-surface-raised border border-border p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setActiveTab('controls')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  activeTab === 'controls' ? 'bg-surface text-text shadow-xs' : 'text-text-muted'
                }`}
              >
                Simulator
              </button>
              <button
                onClick={() => setActiveTab('outbox')}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                  activeTab === 'outbox' ? 'bg-surface text-text shadow-xs' : 'text-text-muted'
                }`}
              >
                <Inbox className="w-3.5 h-3.5" />
                <span>Outbox ({smsList.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('multiview')}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                  activeTab === 'multiview' ? 'bg-surface text-text shadow-xs' : 'text-text-muted'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>3-Device Sync</span>
              </button>
            </div>
          </div>

          {/* TAB 1: SIMULATOR CONTROLS */}
          {activeTab === 'controls' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Playback & Injection Panel */}
              <div className="space-y-4">
                {/* Playback Controls */}
                <div className="p-4 bg-surface border border-border rounded-2xl shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-heading font-bold text-xs uppercase tracking-wider text-text">
                      Movement Simulation
                    </span>
                    <span className="text-xs font-mono text-text-muted">{progress}% Complete</span>
                  </div>

                  <div className="w-full bg-surface-raised h-2 rounded-full overflow-hidden border border-border">
                    <div
                      className="bg-primary h-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => setIsRunning(!isRunning)}
                      className={`flex-1 py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors ${
                        isRunning
                          ? 'bg-amber-600 hover:bg-amber-700 text-white'
                          : 'bg-primary hover:bg-primary-hover text-primary-foreground'
                      }`}
                    >
                      {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      <span>{isRunning ? 'Pause' : 'Start Journey'}</span>
                    </button>

                    <button
                      onClick={handleReset}
                      className="p-2.5 bg-surface-raised hover:bg-surface border border-border rounded-xl text-text-muted hover:text-text transition-colors"
                      title="Reset position"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Speed Multiplier */}
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-border">
                    <span className="text-text-muted flex items-center gap-1">
                      <FastForward className="w-3.5 h-3.5" />
                      <span>Speed:</span>
                    </span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 5, 10, 20].map((s) => (
                        <button
                          key={s}
                          onClick={() => setMultiplier(s)}
                          className={`px-2 py-0.5 rounded-md font-mono text-[11px] ${
                            multiplier === s
                              ? 'bg-primary text-primary-foreground font-bold'
                              : 'bg-surface-raised text-text-muted hover:text-text'
                          }`}
                        >
                          {s}x
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Scenario Injections */}
                <div className="p-4 bg-surface border border-border rounded-2xl shadow-xs space-y-3">
                  <span className="font-heading font-bold text-xs uppercase tracking-wider text-text block">
                    Inject Edge Scenarios
                  </span>

                  <div className="space-y-2">
                    <button
                      onClick={handleInjectDeviation}
                      className="w-full text-left p-3 rounded-xl border border-border bg-surface hover:bg-surface-raised transition-colors flex items-center justify-between text-xs font-semibold"
                    >
                      <div className="flex items-center gap-2 text-text">
                        <Navigation className="w-4 h-4 text-amber-500" />
                        <span>Simulate 350m Deviation</span>
                      </div>
                      <span className="text-[10px] text-text-muted">Off-corridor</span>
                    </button>

                    <button
                      onClick={handleInjectStop}
                      className="w-full text-left p-3 rounded-xl border border-border bg-surface hover:bg-surface-raised transition-colors flex items-center justify-between text-xs font-semibold"
                    >
                      <div className="flex items-center gap-2 text-text">
                        <AlertTriangle className="w-4 h-4 text-orange-500" />
                        <span>Simulate 90s Sudden Stop</span>
                      </div>
                      <span className="text-[10px] text-text-muted">Low activity</span>
                    </button>

                    <button
                      onClick={handleInjectBattery}
                      className="w-full text-left p-3 rounded-xl border border-border bg-surface hover:bg-surface-raised transition-colors flex items-center justify-between text-xs font-semibold"
                    >
                      <div className="flex items-center gap-2 text-text">
                        <Battery className="w-4 h-4 text-red-500" />
                        <span>Drop Battery to 9%</span>
                      </div>
                      <span className="text-[10px] text-text-muted">Low power</span>
                    </button>

                    <button
                      onClick={handleInjectSos}
                      className="w-full text-left p-3 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-700 dark:text-red-300 transition-colors flex items-center justify-between text-xs font-bold"
                    >
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-emergency" />
                        <span>Simulate Duress SOS</span>
                      </div>
                      <span className="text-[10px]">Parallel Bridge</span>
                    </button>
                  </div>
                </div>

                {/* Scenario Banner */}
                {activeScenario && (
                  <div className="p-3 bg-primary-soft/60 border border-primary/30 rounded-xl text-xs flex items-start gap-2">
                    <Radio className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-primary block">Active Injection</span>
                      <span className="text-text leading-tight">{activeScenario}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Columns: Map and Live Telemetry */}
              <div className="lg:col-span-2 space-y-4">
                <div className="h-[380px] rounded-2xl overflow-hidden border border-border shadow-md">
                  <SafetyMap
                    center={currentCoords}
                    zoom={14}
                    showIncidentZones={true}
                    showLightingZones={true}
                    customPolylines={[
                      {
                        id: 'demo-route',
                        coordinates: sampleRoute,
                        color: riskScore > 60 ? '#EF4444' : '#4338CA',
                      },
                    ]}
                    markers={[
                      {
                        id: 'simulated-traveller',
                        lat: currentCoords[0],
                        lng: currentCoords[1],
                        label: `🚶 Virtual Traveller (Risk: ${riskScore})`,
                        type: riskScore > 60 ? 'danger' : 'safe',
                      },
                    ]}
                  />
                </div>

                {/* Telemetry Chips */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-surface border border-border rounded-xl shadow-xs">
                    <div className="text-text-muted">Dynamic Risk Score</div>
                    <div className="font-heading font-bold text-lg text-text mt-0.5">
                      {riskScore}/100
                    </div>
                  </div>

                  <div className="p-3 bg-surface border border-border rounded-xl shadow-xs">
                    <div className="text-text-muted">Battery Level</div>
                    <div className="font-heading font-bold text-lg text-text mt-0.5">
                      {batteryLevel}%
                    </div>
                  </div>

                  <div className="p-3 bg-surface border border-border rounded-xl shadow-xs">
                    <div className="text-text-muted">Coordinates</div>
                    <div className="font-mono text-xs text-text mt-1">
                      {currentCoords[0].toFixed(4)}, {currentCoords[1].toFixed(4)}
                    </div>
                  </div>

                  <div className="p-3 bg-surface border border-border rounded-xl shadow-xs">
                    <div className="text-text-muted">Network Status</div>
                    <div className="font-semibold text-emerald-500 mt-1 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span>Connected</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MOCK SMS OUTBOX */}
          {activeTab === 'outbox' && (
            <div className="bg-surface border border-border rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div>
                  <h2 className="font-heading font-bold text-base text-text">Simulated SMS Outbox</h2>
                  <p className="text-xs text-text-muted">
                    Honest simulation: outbound emergency alerts and tracking invitations logged below.
                  </p>
                </div>
                <button
                  onClick={fetchOutbox}
                  className="px-3 py-1.5 bg-surface-raised hover:bg-surface border border-border rounded-lg text-xs font-semibold text-text"
                >
                  Refresh
                </button>
              </div>

              {smsList.length === 0 ? (
                <div className="p-12 text-center text-xs text-text-muted">
                  Outbox empty. Trigger an SOS or send a test alert from the Guardians page to populate.
                </div>
              ) : (
                <div className="space-y-3">
                  {smsList.map((sms) => (
                    <div
                      key={sms.id}
                      className="p-3.5 bg-surface-raised/70 border border-border rounded-xl space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="font-mono font-semibold text-primary">To: {sms.to_phone}</div>
                        <div className="text-text-muted font-mono text-[11px]">
                          {new Date(sms.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </div>
                      </div>
                      <p className="text-xs text-text font-mono leading-relaxed bg-surface p-2.5 rounded-lg border border-border">
                        {sms.message}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: 3-DEVICE LIVE SYNC SPLIT VIEW */}
          {activeTab === 'multiview' && (
            <div className="space-y-4">
              <div className="p-3 bg-surface border border-border rounded-xl text-xs text-text-muted flex items-center justify-between">
                <span>
                  Desktop Multi-Device View: View the <strong>Traveller App</strong>, the <strong>Guardian Link</strong>, and the <strong>Police Console</strong> side-by-side.
                </span>
                <span className="font-mono text-emerald-500 font-semibold">● Synchronized</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Frame 1: Traveller */}
                <div className="border border-border rounded-3xl overflow-hidden bg-black shadow-lg flex flex-col h-[650px]">
                  <div className="bg-neutral-900 px-4 py-2 text-xs font-semibold text-white flex items-center justify-between border-b border-neutral-800">
                    <span>1. Traveller Phone</span>
                    <a href="/app" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-3.5 h-3.5 text-neutral-400 hover:text-white" />
                    </a>
                  </div>
                  <iframe src="/app" className="w-full flex-1 border-0" title="Traveller Phone" />
                </div>

                {/* Frame 2: Guardian */}
                <div className="border border-border rounded-3xl overflow-hidden bg-black shadow-lg flex flex-col h-[650px]">
                  <div className="bg-neutral-900 px-4 py-2 text-xs font-semibold text-white flex items-center justify-between border-b border-neutral-800">
                    <span>2. Guardian Stream</span>
                    <a href={`/g/${guardianToken}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-3.5 h-3.5 text-neutral-400 hover:text-white" />
                    </a>
                  </div>
                  <iframe
                    src={`/g/${guardianToken}`}
                    className="w-full flex-1 border-0"
                    title="Guardian Stream"
                  />
                </div>

                {/* Frame 3: Police Console */}
                <div className="border border-border rounded-3xl overflow-hidden bg-black shadow-lg flex flex-col h-[650px]">
                  <div className="bg-neutral-900 px-4 py-2 text-xs font-semibold text-white flex items-center justify-between border-b border-neutral-800">
                    <span>3. Police Dispatch</span>
                    <a href="/responder/fac_ps_cubbon" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-3.5 h-3.5 text-neutral-400 hover:text-white" />
                    </a>
                  </div>
                  <iframe
                    src="/responder/fac_ps_cubbon"
                    className="w-full flex-1 border-0"
                    title="Police Console"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="text-center text-xs text-text-muted pt-8 pb-4">
          Raksha Interactive Evaluation Rig • Production-grade simulation harness
        </div>
      </div>
    </>
  );
};
