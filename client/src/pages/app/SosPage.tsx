import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  PhoneCall,
  Volume2,
  VolumeX,
  X,
  AlertTriangle,
  Lock,
  CheckCircle,
  Radio,
  Calculator,
} from 'lucide-react';
import { useSosStore } from '../../stores/sosStore.js';
import { useJourneyStore } from '../../stores/journeyStore.js';
import { useAuthStore } from '../../stores/authStore.js';
import { audioSynthesizer } from '../../lib/audio.js';
import { VerticalTimeline } from '../../components/timeline/VerticalTimeline.js';
import { SimulationNotice } from '../../components/common/SimulationNotice.js';
import { Helmet } from 'react-helmet-async';
import { apiFetch } from '../../lib/api.js';

export const SosPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    pendingSos,
    activeIncident,
    discreetMode,
    setDiscreetMode,
    triggerSos,
    cancelSos,
    confirmSos,
    resolveIncident,
  } = useSosStore();

  const { currentLocation, activeJourney } = useJourneyStore();

  const [countdown, setCountdown] = useState(10);
  const [loudSirenPlaying, setLoudSirenPlaying] = useState(false);
  const [cancelPinInput, setCancelPinInput] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [resolvePinInput, setResolvePinInput] = useState('');
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [isFalseAlarm, setIsFalseAlarm] = useState(false);
  const [duressFakeCancelled, setDuressFakeCancelled] = useState(false);

  // Countdown timer for pending SOS cancellation window
  useEffect(() => {
    if (!pendingSos) return;

    const cancelUntilMs = new Date(pendingSos.cancelUntil).getTime();
    const interval = setInterval(() => {
      const remainingSec = Math.max(0, Math.ceil((cancelUntilMs - Date.now()) / 1000));
      setCountdown(remainingSec);

      if (remainingSec <= 0) {
        clearInterval(interval);
        confirmSos();
      }
    }, 200);

    return () => clearInterval(interval);
  }, [pendingSos, confirmSos]);

  // Loud SOS siren and vibration
  useEffect(() => {
    if (activeIncident && !discreetMode && !loudSirenPlaying) {
      audioSynthesizer.playSiren();
      setLoudSirenPlaying(true);
    }
    return () => {
      audioSynthesizer.stopAll();
      setLoudSirenPlaying(false);
    };
  }, [activeIncident, discreetMode, loudSirenPlaying]);

  const handleManualTrigger = (isDiscreet: boolean) => {
    setDuressFakeCancelled(false);
    setDiscreetMode(isDiscreet);
    const loc = currentLocation || { lat: 28.6139, lng: 77.2090, acc: 10 };
    triggerSos({
      journeyId: activeJourney?.id,
      trigger: 'button',
      discreet: isDiscreet,
      location: loc,
    }).catch(() => {});
  };

  const handleCancelClick = async () => {
    // If risk level >= 2 or PIN required, show PIN modal
    if (activeJourney && activeJourney.level >= 2) {
      setShowPinModal(true);
      return;
    }

    await cancelSos();
  };

  const handlePinCancelSubmit = async () => {
    setPinError(null);
    try {
      await cancelSos(cancelPinInput);
      setShowPinModal(false);
      setCancelPinInput('');
    } catch (err: any) {
      setPinError(err.message || 'Invalid PIN.');
    }
  };

  const handleResolveSubmit = async () => {
    try {
      await resolveIncident(resolvePinInput, isFalseAlarm);
      setResolveModalOpen(false);
      setResolvePinInput('');
    } catch (err: any) {
      alert(err.message || 'Invalid PIN.');
    }
  };

  return (
    <>
      <Helmet>
        <title>Emergency SOS — Raksha</title>
      </Helmet>

      <div className="max-w-md mx-auto px-4 py-6 pb-28 md:pb-12 space-y-6 text-center">
        <SimulationNotice />

        {/* DURESS FAKE CANCELLED MESSAGE (§2.4 S7 & §4.3 primary flow 4) */}
        {duressFakeCancelled ? (
          <div className="bg-surface border border-border rounded-3xl p-6 shadow-xl space-y-4 animate-in fade-in">
            <div className="w-16 h-16 rounded-full bg-safe-bg text-safe flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h2 className="font-heading font-bold text-xl text-text">SOS Cancelled</h2>
            <p className="text-xs text-text-muted leading-relaxed">
              Safety assistance has been deactivated. You can safely return to the home screen.
            </p>
            <button
              onClick={() => navigate('/app')}
              className="w-full py-3 bg-surface-raised border border-border rounded-xl text-xs font-semibold"
            >
              Return to Home
            </button>
          </div>
        ) : pendingSos ? (
          /* ================= CANCELLATION WINDOW COUNTDOWN ================= */
          <div className="bg-surface border-2 border-emergency rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="space-y-1">
              <span className="text-xs uppercase font-bold text-emergency tracking-wider">
                Emergency Alert Activating
              </span>
              <h2 className="font-heading font-extrabold text-2xl text-text">
                Cancellation Window
              </h2>
            </div>

            {/* Circular Countdown Ring */}
            <div className="relative w-36 h-36 mx-auto flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="44" fill="none" stroke="var(--border)" strokeWidth="8" />
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  fill="none"
                  stroke="#DC2626"
                  strokeWidth="8"
                  strokeDasharray="276"
                  strokeDashoffset={276 - (276 * countdown) / 10}
                  strokeLinecap="round"
                  className="transition-all duration-200"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
                <span className="text-3xl font-black text-emergency">{countdown}s</span>
                <span className="text-[10px] text-text-muted font-sans font-semibold">REMAINING</span>
              </div>
            </div>

            <p className="text-xs text-text-muted leading-relaxed">
              If this was accidental, tap Cancel now. Otherwise, emergency alerts will be dispatched in parallel to guardians, police, and hospitals.
            </p>

            <div className="space-y-2.5">
              <button
                onClick={handleCancelClick}
                className="w-full py-3.5 bg-surface border-2 border-border text-text font-heading font-bold text-sm rounded-xl hover:bg-surface-raised transition-colors"
              >
                Cancel SOS
              </button>
              <button
                onClick={() => confirmSos()}
                className="w-full py-3.5 bg-emergency text-white font-heading font-bold text-sm rounded-xl shadow-lg hover:bg-red-700 transition-colors"
              >
                Send Help Now (Skip Countdown)
              </button>
            </div>
          </div>
        ) : activeIncident ? (
          /* ================= ACTIVE INCIDENT SCREEN ================= */
          <div
            className={`rounded-3xl p-6 shadow-2xl space-y-5 border-2 text-left ${
              discreetMode
                ? 'bg-surface border-border'
                : 'bg-red-50/50 dark:bg-red-950/40 border-emergency animate-in zoom-in-95'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span
                  className={`text-[11px] font-bold uppercase tracking-wider block ${
                    discreetMode ? 'text-text-muted' : 'text-emergency'
                  }`}
                >
                  {discreetMode ? 'Assistance Active' : '🚨 Parallel Emergency Dispatch'}
                </span>
                <h2 className="font-heading font-bold text-xl text-text">
                  {discreetMode ? 'Safety Assistance Activated' : 'PulseRouteAI Bridge Active'}
                </h2>
              </div>
              <button
                onClick={() => navigate('/app/decoy')}
                className="px-2.5 py-1.5 bg-surface border border-border text-xs font-semibold rounded-lg flex items-center gap-1.5 text-text-muted hover:text-text"
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>Quick Hide</span>
              </button>
            </div>

            <p className="text-xs text-text-muted leading-relaxed">
              Structured emergency packet shared simultaneously with verified emergency contacts.
            </p>

            {/* Parallel Coordination Recipient Status Cards */}
            <div className="space-y-2 pt-2 border-t border-border">
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider block">
                Parallel Notification Status
              </span>

              <div className="p-3 bg-surface border border-border rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-safe animate-pulse" />
                  <span className="font-semibold text-text">Police Dispatch (Simulated)</span>
                </div>
                <span className="text-[11px] font-semibold text-safe bg-safe-bg px-2 py-0.5 rounded">
                  Delivered
                </span>
              </div>

              <div className="p-3 bg-surface border border-border rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-safe animate-pulse" />
                  <span className="font-semibold text-text">Hospital Control (Simulated)</span>
                </div>
                <span className="text-[11px] font-semibold text-safe bg-safe-bg px-2 py-0.5 rounded">
                  Delivered
                </span>
              </div>

              <div className="p-3 bg-surface border border-border rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-safe animate-pulse" />
                  <span className="font-semibold text-text">Emergency Guardians</span>
                </div>
                <span className="text-[11px] font-semibold text-primary bg-primary-soft px-2 py-0.5 rounded">
                  SMS / Push Dispatched
                </span>
              </div>
            </div>

            {/* Resolve Flow Button */}
            <div className="pt-3">
              <button
                onClick={() => setResolveModalOpen(true)}
                className="w-full py-3 bg-surface border border-border text-text font-bold text-xs rounded-xl hover:bg-surface-raised transition-colors"
              >
                I am Safe (Resolve with PIN)
              </button>
            </div>
          </div>
        ) : (
          /* ================= DEFAULT SOS LAUNCHER ================= */
          <div className="space-y-6">
            <div className="space-y-1">
              <h1 className="font-heading font-extrabold text-2xl text-text">Emergency Assistance</h1>
              <p className="text-xs text-text-muted">
                Trigger emergency coordination in loud or discreet stealth mode.
              </p>
            </div>

            {/* Big SOS Circle Button */}
            <div className="py-6 flex justify-center">
              <button
                onClick={() => handleManualTrigger(false)}
                aria-label="Activate Emergency SOS. Hold for 1.5 seconds"
                className="w-44 h-44 rounded-full bg-gradient-to-tr from-[#B91C1C] to-[#DC2626] text-white flex flex-col items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-red-400 group"
              >
                <Shield className="w-12 h-12 mb-1 group-hover:scale-110 transition-transform" />
                <span className="font-heading font-black text-3xl tracking-wider">SOS</span>
                <span className="text-xs font-semibold opacity-90">TAP TO TRIGGER</span>
              </button>
            </div>

            {/* Discreet SOS Mode */}
            <div className="p-4 bg-surface border border-border rounded-2xl shadow-sm text-left space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-text">Discreet SOS Mode</span>
                </div>
                <span className="text-[10px] uppercase font-bold text-safe bg-safe-bg px-2 py-0.5 rounded">
                  Silent &amp; Stealth
                </span>
              </div>
              <p className="text-xs text-text-muted leading-relaxed">
                Dispatches full parallel coordination without siren, vibration, or alarming screens.
              </p>
              <button
                onClick={() => handleManualTrigger(true)}
                className="w-full py-2.5 bg-surface-raised border border-border hover:border-primary text-text font-semibold text-xs rounded-xl transition-colors"
              >
                Trigger Discreet SOS
              </button>
            </div>

            {/* Helpline Direct Dial Buttons */}
            <div className="space-y-2 pt-2">
              <span className="text-xs font-semibold text-text-muted block">Direct Helpline Numbers</span>
              <div className="grid grid-cols-2 gap-2">
                <a
                  href="tel:112"
                  className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-emergency font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>Call 112 (Police)</span>
                </a>
                <a
                  href="tel:1091"
                  className="p-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900 rounded-xl text-purple-700 dark:text-purple-300 font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>Women Help (1091)</span>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* PIN CANCEL MODAL */}
        {showPinModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-surface border border-border rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-left">
              <h3 className="font-heading font-bold text-base text-text">Enter Security PIN</h3>
              <p className="text-xs text-text-muted">
                Enter your 4–6 digit Safety PIN to cancel the alert.
              </p>
              {pinError && (
                <div className="p-2.5 bg-red-50 text-emergency text-xs rounded-lg">
                  {pinError}
                </div>
              )}
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={cancelPinInput}
                onChange={(e) => setCancelPinInput(e.target.value)}
                placeholder="PIN"
                className="w-full px-3.5 py-2.5 border border-border rounded-xl font-mono text-center text-lg"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowPinModal(false)}
                  className="flex-1 py-2.5 border border-border rounded-xl text-xs font-semibold"
                >
                  Back
                </button>
                <button
                  onClick={handlePinCancelSubmit}
                  className="flex-1 py-2.5 bg-primary text-white rounded-xl text-xs font-semibold"
                >
                  Submit PIN
                </button>
              </div>
            </div>
          </div>
        )}

        {/* RESOLVE INCIDENT MODAL */}
        {resolveModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-surface border border-border rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-left">
              <h3 className="font-heading font-bold text-base text-text">Confirm You Are Safe</h3>
              <p className="text-xs text-text-muted">
                Enter your Safety PIN to confirm resolution.
              </p>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={resolvePinInput}
                onChange={(e) => setResolvePinInput(e.target.value)}
                placeholder="Safety PIN"
                className="w-full px-3.5 py-2.5 border border-border rounded-xl font-mono text-center text-lg"
              />
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={isFalseAlarm}
                  onChange={(e) => setIsFalseAlarm(e.target.checked)}
                  className="rounded accent-primary"
                />
                <span className="text-xs text-text-muted">Mark as accidental false alarm</span>
              </label>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setResolveModalOpen(false)}
                  className="flex-1 py-2.5 border border-border rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResolveSubmit}
                  className="flex-1 py-2.5 bg-safe text-white rounded-xl text-xs font-bold"
                >
                  Confirm Safe
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
