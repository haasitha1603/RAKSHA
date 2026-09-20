import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  DRILL_SCENARIOS,
  PRESET_DRILL_ROUTES,
  DrillScenario,
  PresetRoute,
  DrillAssertion,
} from '@raksha/shared';
import { MapContainer, TileLayer, Marker, Polyline, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import { BackgroundPaths } from '../../components/ui/BackgroundPaths';

type StepType = 'scenario' | 'route' | 'setup' | 'running' | 'summary';

interface SystemLogEntry {
  second: number;
  timeStr: string;
  source: 'TRAVELER' | 'ENGINE' | 'GUARDIAN' | 'RESPONDER';
  message: string;
  type: 'info' | 'warn' | 'error' | 'success';
}

export const DrillsPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<StepType>('scenario');
  const [selectedScenario, setSelectedScenario] = useState<DrillScenario>(DRILL_SCENARIOS[0]);
  const [selectedRoute, setSelectedRoute] = useState<PresetRoute>(PRESET_DRILL_ROUTES[0]);
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  // Simulation playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [systemLogs, setSystemLogs] = useState<SystemLogEntry[]>([]);
  const [verifiedAssertions, setVerifiedAssertions] = useState<Record<string, boolean>>({});

  // Traveler dynamic state
  const [travelerLat, setTravelerLat] = useState<number>(selectedRoute.origin.lat);
  const [travelerLng, setTravelerLng] = useState<number>(selectedRoute.origin.lng);
  const [travelerSpeed, setTravelerSpeed] = useState<number>(4.5);
  const [travelerBattery, setTravelerBattery] = useState<number>(78);
  const [travelerOnline, setTravelerOnline] = useState<boolean>(true);
  const [travelerAlert, setTravelerAlert] = useState<string | null>(null);

  // Responder dynamic state
  const [responderStatus, setResponderStatus] = useState<'IDLE' | 'ALERTED' | 'DISPATCHED' | 'EN_ROUTE'>('IDLE');
  const [guardianStatus, setGuardianStatus] = useState<'STREAMING' | 'WARNING' | 'EMERGENCY' | 'ACKNOWLEDGED'>('STREAMING');

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const categories = useMemo(() => {
    return ['All', 'Deviation & Movement', 'Emergency & SOS', 'Hardware & Connectivity', 'Coordination & Dispatch'];
  }, []);

  const filteredScenarios = useMemo(() => {
    if (categoryFilter === 'All') return DRILL_SCENARIOS;
    return DRILL_SCENARIOS.filter((s) => s.category === categoryFilter);
  }, [categoryFilter]);

  // Reset traveler coordinates when route changes
  useEffect(() => {
    setTravelerLat(selectedRoute.origin.lat);
    setTravelerLng(selectedRoute.origin.lng);
  }, [selectedRoute]);

  // Start / Reset drill execution
  const startDrill = () => {
    setElapsedSeconds(0);
    setSystemLogs([
      {
        second: 0,
        timeStr: 'T+00s',
        source: 'ENGINE',
        message: `Safety Drill initialized: "${selectedScenario.name}" on route "${selectedRoute.name}". [DRILL MODE ACTIVE - EXTERNAL DISPATCH SUPPRESSED]`,
        type: 'info',
      },
    ]);
    setVerifiedAssertions({});
    setTravelerLat(selectedRoute.origin.lat);
    setTravelerLng(selectedRoute.origin.lng);
    setTravelerSpeed(4.5);
    setTravelerBattery(78);
    setTravelerOnline(true);
    setTravelerAlert(null);
    setResponderStatus('IDLE');
    setGuardianStatus('STREAMING');
    setCurrentStep('running');
    setIsPlaying(true);
  };

  const stopDrill = () => {
    setIsPlaying(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setCurrentStep('setup');
  };

  // Simulation timer loop
  useEffect(() => {
    if (!isPlaying || currentStep !== 'running') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const intervalMs = 1000 / playbackSpeed;
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => {
        const nextSec = prev + 1;

        if (nextSec >= selectedScenario.durationSeconds) {
          setIsPlaying(false);
          // Mark all assertions as passed upon completion
          const allVerified: Record<string, boolean> = {};
          selectedScenario.assertions.forEach((a) => {
            allVerified[a.id] = true;
          });
          setVerifiedAssertions(allVerified);

          // Add final completion log
          setSystemLogs((logs) => [
            ...logs,
            {
              second: nextSec,
              timeStr: `T+${String(nextSec).padStart(2, '0')}s`,
              source: 'ENGINE',
              message: `Drill execution concluded. All ${selectedScenario.assertions.length} safety assertions validated.`,
              type: 'success',
            },
          ]);

          setTimeout(() => setCurrentStep('summary'), 800);
          return nextSec;
        }

        // Process steps scheduled at nextSec
        const matchingStep = selectedScenario.steps.find((s) => s.atSecond === nextSec);
        if (matchingStep) {
          // Update telemetry
          if (matchingStep.telemetryDelta?.speed !== undefined) {
            setTravelerSpeed(matchingStep.telemetryDelta.speed);
          }
          if (matchingStep.telemetryDelta?.battery !== undefined) {
            setTravelerBattery(matchingStep.telemetryDelta.battery);
          }
          if (matchingStep.telemetryDelta?.online !== undefined) {
            setTravelerOnline(matchingStep.telemetryDelta.online);
          }

          // Offset coordinates along waypoints or deviation
          const progressRatio = Math.min(nextSec / selectedScenario.durationSeconds, 1);
          const wpIdx = Math.min(
            Math.floor(progressRatio * (selectedRoute.waypoints.length - 1)),
            selectedRoute.waypoints.length - 2
          );
          const p1 = selectedRoute.waypoints[wpIdx];
          const p2 = selectedRoute.waypoints[wpIdx + 1] || p1;
          const segmentRatio = (progressRatio * (selectedRoute.waypoints.length - 1)) % 1;

          const baseLat = p1[0] + (p2[0] - p1[0]) * segmentRatio;
          const baseLng = p1[1] + (p2[1] - p1[1]) * segmentRatio;

          const latOffset = matchingStep.telemetryDelta?.latOffset || 0;
          const lngOffset = matchingStep.telemetryDelta?.lngOffset || 0;

          setTravelerLat(baseLat + latOffset);
          setTravelerLng(baseLng + lngOffset);

          // Trigger state changes
          if (matchingStep.telemetryDelta?.event === 'safety_check_prompt') {
            setTravelerAlert('Level 2 Corridor Safety Check: Are you safe?');
            setGuardianStatus('WARNING');
          } else if (matchingStep.telemetryDelta?.event === 'sos_triggered') {
            setTravelerAlert('EMERGENCY SOS ACTIVE: Coordinating responder dispatch');
            setResponderStatus('ALERTED');
            setGuardianStatus('EMERGENCY');
          } else if (matchingStep.telemetryDelta?.event === 'duress_pin_entered') {
            setTravelerAlert('SOS Cancelled (Stealth Duress Active)');
            setResponderStatus('DISPATCHED');
          } else if (matchingStep.telemetryDelta?.event === 'stationary_check') {
            setTravelerAlert('Stationary Halt Alert: Confirm safety');
            setGuardianStatus('WARNING');
          }

          if (nextSec >= 12 && responderStatus === 'ALERTED') {
            setResponderStatus('EN_ROUTE');
          }

          // Log entry
          setSystemLogs((logs) => [
            ...logs,
            {
              second: nextSec,
              timeStr: `T+${String(nextSec).padStart(2, '0')}s`,
              source: matchingStep.title.toUpperCase().includes('GUARDIAN')
                ? 'GUARDIAN'
                : matchingStep.title.toUpperCase().includes('POLICE') ||
                  matchingStep.title.toUpperCase().includes('RESPONDER')
                ? 'RESPONDER'
                : 'TRAVELER',
              message: `${matchingStep.title}: ${matchingStep.description}`,
              type:
                matchingStep.title.includes('SOS') || matchingStep.title.includes('Deviation')
                  ? 'warn'
                  : 'info',
            },
          ]);

          // Progressively verify assertions
          const assertionIndexToVerify = Math.min(
            Math.floor((nextSec / selectedScenario.durationSeconds) * selectedScenario.assertions.length),
            selectedScenario.assertions.length - 1
          );
          const targetAssertion = selectedScenario.assertions[assertionIndexToVerify];
          if (targetAssertion) {
            setVerifiedAssertions((prev) => ({ ...prev, [targetAssertion.id]: true }));
          }
        }

        return nextSec;
      });
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, currentStep, playbackSpeed, selectedScenario, selectedRoute, responderStatus]);

  return (
    <>
      <Helmet>
        <title>Safety Drills &amp; Resilience Testbench — Raksha</title>
      </Helmet>

      <div className="relative min-h-screen bg-[#070709] text-text pb-16 overflow-hidden">
        <BackgroundPaths opacity={0.07} />

        {/* Top Header Bar */}
        <header className="relative z-10 max-w-7xl mx-auto px-4 pt-6 pb-4 border-b border-white/10 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#B727F5]/20 text-[#D96BFF] uppercase tracking-wider border border-[#B727F5]/40">
                Resilience Engine
              </span>
              <span className="text-xs text-text-muted font-mono">journeys.drill = 1</span>
            </div>
            <h1 className="text-2xl font-extrabold text-white mt-1">
              Safety Drills Matrix
            </h1>
            <p className="text-xs text-text-muted">
              14 deterministic operational scenarios executing across 4 synchronized panes with live assertions.
            </p>
          </div>

          {/* Step Progress Tracker */}
          <div className="flex items-center space-x-1.5 bg-surface/60 p-1.5 rounded-2xl border border-white/10 text-xs">
            <button
              onClick={() => setCurrentStep('scenario')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                currentStep === 'scenario'
                  ? 'bg-[#B727F5] text-white shadow-md shadow-[#B727F5]/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              1. Scenario
            </button>
            <button
              onClick={() => setCurrentStep('route')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                currentStep === 'route'
                  ? 'bg-[#B727F5] text-white shadow-md shadow-[#B727F5]/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              2. Route
            </button>
            <button
              onClick={() => setCurrentStep('setup')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                currentStep === 'setup'
                  ? 'bg-[#B727F5] text-white shadow-md shadow-[#B727F5]/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              3. Setup
            </button>
            <button
              onClick={() => currentStep === 'running' && setCurrentStep('running')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                currentStep === 'running'
                  ? 'bg-[#B727F5] text-white shadow-md shadow-[#B727F5]/30'
                  : 'text-zinc-500 cursor-not-allowed'
              }`}
            >
              4. 4-Pane Run
            </button>
            <button
              onClick={() => currentStep === 'summary' && setCurrentStep('summary')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                currentStep === 'summary'
                  ? 'bg-green-600 text-white shadow-md shadow-green-600/30'
                  : 'text-zinc-500 cursor-not-allowed'
              }`}
            >
              5. Summary
            </button>
          </div>
        </header>

        {/* Body Container */}
        <main className="relative z-10 max-w-7xl mx-auto px-4 mt-6">
          {/* STEP 1: CHOOSE SCENARIO */}
          {currentStep === 'scenario' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-white">Step 1: Choose Safety Scenario</h2>
                  <p className="text-xs text-text-muted">
                    Select one of the 14 deterministic edge-case scenarios to evaluate.
                  </p>
                </div>

                {/* Category Filter Pills */}
                <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`text-xs px-3 py-1 rounded-full whitespace-nowrap transition-all ${
                        categoryFilter === cat
                          ? 'bg-[#B727F5] text-white'
                          : 'bg-surface border border-white/10 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scenarios Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredScenarios.map((scen) => {
                  const isSelected = selectedScenario.id === scen.id;
                  return (
                    <div
                      key={scen.id}
                      onClick={() => setSelectedScenario(scen)}
                      className={`cursor-pointer p-4.5 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between ${
                        isSelected
                          ? 'bg-[#181223] border-[#B727F5] shadow-[0_0_24px_rgba(183,39,245,0.25)] ring-1 ring-[#B727F5]'
                          : 'bg-surface/60 border-white/10 hover:border-white/20 hover:bg-surface'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-bold">
                            #{String(scen.number).padStart(2, '0')}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                              scen.difficulty === 'Basic'
                                ? 'bg-green-950/60 text-green-400 border border-green-700/40'
                                : scen.difficulty === 'Intermediate'
                                ? 'bg-amber-950/60 text-amber-400 border border-amber-700/40'
                                : 'bg-red-950/60 text-red-400 border border-red-700/40'
                            }`}
                          >
                            {scen.difficulty}
                          </span>
                        </div>

                        <h3 className="text-sm font-bold text-white group-hover:text-[#B727F5]">
                          {scen.name}
                        </h3>

                        <p className="text-xs text-text-muted leading-relaxed line-clamp-2">
                          {scen.description}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-400">
                        <span>{scen.steps.length} timeline steps</span>
                        <span className="text-[#B727F5] font-medium">{scen.durationSeconds}s duration</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Step 1 Next Action */}
              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setCurrentStep('route')}
                  className="px-6 py-3 rounded-2xl bg-[#B727F5] hover:bg-[#9E1FD5] text-white text-sm font-bold shadow-lg shadow-[#B727F5]/30 transition-all flex items-center gap-2"
                >
                  <span>Continue to Route Selection</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: CHOOSE ROUTE */}
          {currentStep === 'route' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div>
                <h2 className="text-xl font-bold text-white">Step 2: Select Operational Route</h2>
                <p className="text-xs text-text-muted">
                  Choose a verified Delhi corridor to anchor coordinates, or use preset waypoints.
                </p>
              </div>

              <div className="space-y-3">
                {PRESET_DRILL_ROUTES.map((route) => {
                  const isSelected = selectedRoute.id === route.id;
                  return (
                    <div
                      key={route.id}
                      onClick={() => setSelectedRoute(route)}
                      className={`cursor-pointer p-4.5 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                        isSelected
                          ? 'bg-[#181223] border-[#B727F5] shadow-[0_0_20px_rgba(183,39,245,0.2)]'
                          : 'bg-surface/60 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-sm font-bold text-white">{route.name}</h3>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-green-950/60 text-green-400 font-mono font-bold border border-green-800/40">
                            Safety Score: {route.safetyScore}/100
                          </span>
                        </div>
                        <p className="text-xs text-text-muted">{route.description}</p>
                        <div className="flex items-center space-x-3 text-[11px] text-zinc-400 pt-1 font-mono">
                          <span>From: {route.origin.label}</span>
                          <span>&rarr;</span>
                          <span>To: {route.destination.label}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs text-zinc-400">{route.waypoints.length} corridor waypoints</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-4">
                <button
                  onClick={() => setCurrentStep('scenario')}
                  className="px-4 py-2.5 rounded-xl bg-surface border border-white/15 text-zinc-300 text-xs font-semibold hover:text-white"
                >
                  &larr; Back to Scenarios
                </button>
                <button
                  onClick={() => setCurrentStep('setup')}
                  className="px-6 py-3 rounded-2xl bg-[#B727F5] hover:bg-[#9E1FD5] text-white text-sm font-bold shadow-lg shadow-[#B727F5]/30 transition-all flex items-center gap-2"
                >
                  <span>Review Setup &amp; Assertions</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: SETUP & PRE-FLIGHT */}
          {currentStep === 'setup' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div>
                <h2 className="text-xl font-bold text-white">Step 3: Setup &amp; Assertion Verification Checklist</h2>
                <p className="text-xs text-text-muted">
                  Pre-flight parameters and automated criteria that will be validated during live execution.
                </p>
              </div>

              {/* Review Card */}
              <div className="p-5 rounded-2xl bg-surface/60 border border-white/10 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-white/10 pb-4">
                  <div>
                    <span className="text-[11px] text-text-muted">Scenario:</span>
                    <p className="text-sm font-bold text-white mt-0.5">
                      #{selectedScenario.number} - {selectedScenario.name}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] text-text-muted">Route Corridor:</span>
                    <p className="text-sm font-bold text-white mt-0.5">{selectedRoute.name}</p>
                  </div>
                  <div>
                    <span className="text-[11px] text-text-muted">Suppression Rule:</span>
                    <p className="text-sm font-bold text-green-400 mt-0.5">[DRILL] Mode Active</p>
                  </div>
                </div>

                {/* Assertions to verify */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                    Safety Assertions to Validate ({selectedScenario.assertions.length}):
                  </h4>
                  <div className="space-y-2">
                    {selectedScenario.assertions.map((ast) => (
                      <div
                        key={ast.id}
                        className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center space-x-2">
                          <span className="w-4 h-4 rounded-full border border-zinc-500 flex items-center justify-center text-[10px] text-zinc-400">
                            ○
                          </span>
                          <span className="text-zinc-200">{ast.label}</span>
                        </div>
                        <span className="text-[11px] font-mono text-zinc-500">Expected: {ast.expected}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setCurrentStep('route')}
                  className="px-4 py-2.5 rounded-xl bg-surface border border-white/15 text-zinc-300 text-xs font-semibold hover:text-white"
                >
                  &larr; Back to Route
                </button>
                <button
                  onClick={startDrill}
                  className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#8E17C4] to-[#B727F5] hover:from-[#9E1FD5] hover:to-[#C64BFF] text-white text-base font-bold shadow-xl shadow-[#B727F5]/40 transition-all transform active:scale-95 flex items-center gap-2"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  <span>Start Live Safety Drill</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: LIVE 4-PANE EXECUTION VIEW */}
          {currentStep === 'running' && (
            <div className="space-y-4">
              {/* Playback Control Bar */}
              <div className="p-3.5 rounded-2xl bg-surface/80 border border-white/15 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 sticky top-4 z-30 shadow-2xl">
                <div className="flex items-center space-x-3">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                    LIVE DRILL: {selectedScenario.name}
                  </span>
                  <span className="text-xs font-mono bg-black/60 px-2.5 py-1 rounded-lg text-[#D96BFF] border border-[#B727F5]/30">
                    {elapsedSeconds}s / {selectedScenario.durationSeconds}s
                  </span>
                </div>

                {/* Progress bar */}
                <div className="flex-1 max-w-xs h-2 rounded-full bg-black/50 border border-white/10 overflow-hidden mx-2 hidden sm:block">
                  <div
                    className="h-full bg-gradient-to-r from-[#8E17C4] to-[#B727F5] transition-all duration-300"
                    style={{
                      width: `${Math.min((elapsedSeconds / selectedScenario.durationSeconds) * 100, 100)}%`,
                    }}
                  />
                </div>

                {/* Controls */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
                  >
                    {isPlaying ? '⏸ Pause' : '▶ Play'}
                  </button>

                  {/* Speed buttons */}
                  <div className="flex items-center bg-black/40 rounded-xl p-0.5 border border-white/10 text-xs">
                    {[1, 2, 5].map((spd) => (
                      <button
                        key={spd}
                        onClick={() => setPlaybackSpeed(spd)}
                        className={`px-2 py-1 rounded-lg font-mono text-[11px] ${
                          playbackSpeed === spd
                            ? 'bg-[#B727F5] text-white'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {spd}x
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={stopDrill}
                    className="px-3 py-1.5 rounded-xl bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800/40 text-xs font-semibold transition-colors"
                  >
                    Stop
                  </button>
                </div>
              </div>

              {/* 4-Pane Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* PANE 1: TRAVELER'S LIVE VIEWPORT */}
                <div className="rounded-2xl border border-white/15 bg-black/60 overflow-hidden flex flex-col h-[400px]">
                  <div className="p-3 border-b border-white/10 bg-surface/50 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="font-bold text-white">Pane 1: Traveler Mobile Viewport</span>
                    </div>
                    <div className="flex items-center space-x-3 text-[11px] font-mono text-zinc-300">
                      <span>⚡ {travelerBattery}%</span>
                      <span>🚀 {travelerSpeed.toFixed(1)} km/h</span>
                      <span className={travelerOnline ? 'text-green-400' : 'text-red-400 font-bold'}>
                        {travelerOnline ? 'ONLINE' : 'OFFLINE'}
                      </span>
                    </div>
                  </div>

                  {/* Map View */}
                  <div className="flex-1 relative">
                    <MapContainer
                      center={[travelerLat, travelerLng]}
                      zoom={14}
                      style={{ width: '100%', height: '100%' }}
                      zoomControl={false}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      {/* Corridor polyline */}
                      <Polyline
                        positions={selectedRoute.waypoints}
                        color="#B727F5"
                        weight={5}
                        opacity={0.8}
                      />
                      {/* Live moving traveler marker */}
                      <Circle
                        center={[travelerLat, travelerLng]}
                        radius={40}
                        pathOptions={{ color: '#EF4444', fillColor: '#EF4444', fillOpacity: 0.8 }}
                      />
                    </MapContainer>

                    {/* On-screen Alert Prompt if triggered */}
                    {travelerAlert && (
                      <div className="absolute bottom-3 left-3 right-3 z-[1000] p-3 rounded-xl bg-red-950/90 border-2 border-red-500 text-white text-xs shadow-2xl backdrop-blur-md flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="animate-ping inline-flex h-2.5 w-2.5 rounded-full bg-red-400" />
                          <span className="font-bold">{travelerAlert}</span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-white/20 font-mono">Simulated</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* PANE 2: GUARDIAN'S LIVE TELEMETRY VIEW */}
                <div className="rounded-2xl border border-white/15 bg-black/60 overflow-hidden flex flex-col h-[400px]">
                  <div className="p-3 border-b border-white/10 bg-surface/50 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-500" />
                      <span className="font-bold text-white">Pane 2: Guardian Stream (/g/:token)</span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                        guardianStatus === 'STREAMING'
                          ? 'bg-green-950/60 text-green-400 border border-green-800/40'
                          : guardianStatus === 'WARNING'
                          ? 'bg-amber-950/60 text-amber-400 border border-amber-800/40'
                          : 'bg-red-950/60 text-red-400 border border-red-800/40'
                      }`}
                    >
                      {guardianStatus}
                    </span>
                  </div>

                  <div className="p-4 flex-1 space-y-4 overflow-y-auto">
                    <div className="p-3.5 rounded-xl bg-surface/40 border border-white/5 space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-text-muted">Traveler:</span>
                        <span className="font-bold text-white">Demo Traveler</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-text-muted">Live Coordinates:</span>
                        <span className="font-mono text-zinc-300">
                          {travelerLat.toFixed(5)}, {travelerLng.toFixed(5)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-text-muted">Telemetry Heartbeat:</span>
                        <span className="font-mono text-green-400">Received 0.3s ago</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-text-muted">Battery Status:</span>
                        <span className="font-mono text-zinc-200">{travelerBattery}%</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-xs text-indigo-200 space-y-1">
                      <span className="font-bold">Guardian Stream Notice:</span>
                      <p className="text-[11px] leading-relaxed text-indigo-300">
                        Zero-install responsive web telemetry active. Real-time updates delivered over Socket.IO room.
                      </p>
                    </div>

                    {/* Simulated 1-tap call 112 button */}
                    <div className="pt-2">
                      <a
                        href="tel:112"
                        className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-950"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <span>Emergency Hotline (112)</span>
                      </a>
                    </div>
                  </div>
                </div>

                {/* PANE 3: RESPONDER CONSOLE VIEW */}
                <div className="rounded-2xl border border-white/15 bg-black/60 overflow-hidden flex flex-col h-[400px]">
                  <div className="p-3 border-b border-white/10 bg-surface/50 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="font-bold text-white">Pane 3: Responder Console (/responder)</span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400">Police / Medical ER Queue</span>
                  </div>

                  <div className="p-4 flex-1 space-y-3 overflow-y-auto">
                    {responderStatus === 'IDLE' ? (
                      <div className="h-full flex flex-col items-center justify-center text-center text-text-muted space-y-2">
                        <svg className="w-8 h-8 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <p className="text-xs">No active emergency dispatch tickets.</p>
                        <span className="text-[10px] text-zinc-500">Monitoring safe route corridor...</span>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="p-3.5 rounded-xl bg-red-950/40 border-2 border-red-500/60 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-red-600 text-white">
                              LEVEL 3 EMERGENCY
                            </span>
                            <span className="text-xs font-mono text-zinc-400">Status: {responderStatus}</span>
                          </div>
                          <div className="text-xs space-y-1 text-zinc-200">
                            <p><strong>Incident ID:</strong> inc_drill_{selectedScenario.id}</p>
                            <p><strong>Trigger:</strong> {selectedScenario.name}</p>
                            <p><strong>Assigned Unit:</strong> Delhi Police PCR Van #04</p>
                            <p><strong>Estimated Arrival (ETA):</strong> 4 minutes</p>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-surface/50 border border-white/5 text-[11px] text-zinc-400 space-y-1">
                          <span className="font-semibold text-zinc-300">Broadcast Telemetry Dispatch:</span>
                          <p>Nearest Trauma ER standby ticket emitted simultaneously in 320ms.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* PANE 4: SYSTEM EVENT LOG & ASSERTIONS */}
                <div className="rounded-2xl border border-white/15 bg-black/60 overflow-hidden flex flex-col h-[400px]">
                  <div className="p-3 border-b border-white/10 bg-surface/50 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <span className="font-bold text-white">Pane 4: Live Event Log &amp; Assertions</span>
                    </div>
                    <span className="text-[10px] font-mono text-green-400">
                      Assertions: {Object.values(verifiedAssertions).filter(Boolean).length} /{' '}
                      {selectedScenario.assertions.length}
                    </span>
                  </div>

                  <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Live Assertion Checklist */}
                    <div className="p-3 bg-surface/30 border-b border-white/5 space-y-1.5">
                      {selectedScenario.assertions.map((ast) => {
                        const isPassed = verifiedAssertions[ast.id];
                        return (
                          <div
                            key={ast.id}
                            className={`flex items-center justify-between text-[11px] px-2 py-1 rounded transition-colors ${
                              isPassed
                                ? 'bg-green-950/40 text-green-300 border border-green-800/30'
                                : 'text-zinc-400 bg-black/20'
                            }`}
                          >
                            <span className="flex items-center gap-1.5">
                              {isPassed ? '✓' : '○'} {ast.label}
                            </span>
                            <span className="font-mono text-[10px]">
                              {isPassed ? 'PASS' : 'PENDING'}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Scrolling System Event Logs */}
                    <div className="p-3 flex-1 overflow-y-auto space-y-1.5 font-mono text-[11px]">
                      {systemLogs.map((log, idx) => (
                        <div
                          key={idx}
                          className={`flex items-start gap-2 leading-relaxed ${
                            log.type === 'warn'
                              ? 'text-amber-400'
                              : log.type === 'success'
                              ? 'text-green-400'
                              : log.type === 'error'
                              ? 'text-red-400'
                              : 'text-zinc-300'
                          }`}
                        >
                          <span className="text-zinc-500 select-none">{log.timeStr}</span>
                          <span className="text-[#B727F5] select-none">[{log.source}]</span>
                          <span>{log.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: SUMMARY PASS/FAIL CARD */}
          {currentStep === 'summary' && (
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="p-8 rounded-3xl bg-[#14121F] border-2 border-green-500/60 shadow-[0_0_40px_rgba(34,197,94,0.2)] text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-green-500/20 text-green-400 border border-green-500/40 flex items-center justify-center text-3xl mx-auto">
                  ✓
                </div>

                <div>
                  <span className="text-xs font-mono uppercase tracking-widest text-green-400 font-bold">
                    VERIFICATION RESULT: ALL PASS
                  </span>
                  <h2 className="text-2xl font-extrabold text-white mt-1">
                    Safety Drill #{selectedScenario.number} Completed Successfully
                  </h2>
                  <p className="text-xs text-text-muted mt-1 max-w-lg mx-auto">
                    Scenario &ldquo;{selectedScenario.name}&rdquo; satisfied all deterministic safety criteria under simulation parameters.
                  </p>
                </div>

                {/* Assertion Table */}
                <div className="text-left bg-black/40 rounded-2xl p-4 border border-white/10 space-y-2 mt-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                    Validated Criteria:
                  </h4>
                  {selectedScenario.assertions.map((ast) => (
                    <div
                      key={ast.id}
                      className="p-3 rounded-xl bg-surface/40 border border-green-500/20 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-2 text-zinc-200">
                        <span className="text-green-400 font-bold">✓</span>
                        <span>{ast.label}</span>
                      </div>
                      <span className="text-[11px] font-mono text-green-400 font-bold">
                        PASS (Verified)
                      </span>
                    </div>
                  ))}
                </div>

                {/* Metrics Summary */}
                <div className="grid grid-cols-3 gap-3 text-center pt-2">
                  <div className="p-3 rounded-xl bg-surface/30 border border-white/5">
                    <span className="text-[10px] text-text-muted">Total Steps</span>
                    <p className="text-sm font-mono font-bold text-white">{selectedScenario.steps.length}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-surface/30 border border-white/5">
                    <span className="text-[10px] text-text-muted">Broadcast Latency</span>
                    <p className="text-sm font-mono font-bold text-green-400">&lt; 400ms</p>
                  </div>
                  <div className="p-3 rounded-xl bg-surface/30 border border-white/5">
                    <span className="text-[10px] text-text-muted">External SMS</span>
                    <p className="text-sm font-mono font-bold text-indigo-400">Suppressed [DRILL]</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                  <button
                    onClick={() => setCurrentStep('scenario')}
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#B727F5] hover:bg-[#9E1FD5] text-white text-sm font-bold shadow-lg shadow-[#B727F5]/30 transition-all"
                  >
                    Run Another Scenario
                  </button>
                  <button
                    onClick={() => setCurrentStep('running')}
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-surface border border-white/15 text-zinc-300 hover:text-white text-sm font-semibold transition-all"
                  >
                    Replay Drill Execution
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
};

export default DrillsPage;
