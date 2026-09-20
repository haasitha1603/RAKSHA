import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  MapPin,
  Bell,
  Mic,
  Smartphone,
  KeyRound,
  Users,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { apiFetch } from '../../lib/api.js';
import { useAuthStore } from '../../stores/authStore.js';
import { Helmet } from 'react-helmet-async';

export const OnboardingWizard: React.FC = () => {
  const [step, setStep] = useState(1);
  const [permissions, setPermissions] = useState({
    location: false,
    push: false,
    motion: false,
    voice: false,
  });
  const [safetyPin, setSafetyPin] = useState('');
  const [duressPin, setDuressPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  // Guardian form
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [guardianRelation, setGuardianRelation] = useState('');
  const [guardianTold, setGuardianTold] = useState(false);
  const [guardianError, setGuardianError] = useState<string | null>(null);

  const { user, setUser } = useAuthStore();
  const navigate = useNavigate();

  const handlePermissionsNext = async () => {
    // Record optional consents
    for (const [key, val] of Object.entries(permissions)) {
      if (val) {
        await apiFetch('/api/consents', {
          method: 'POST',
          body: JSON.stringify({ type: key, granted: true }),
        }).catch(() => {});
      }
    }
    setStep(3);
  };

  const handlePinsNext = async () => {
    setPinError(null);
    if (!/^\d{4,6}$/.test(safetyPin)) {
      setPinError('Safety PIN must be 4 to 6 digits.');
      return;
    }
    if (!/^\d{4,6}$/.test(duressPin)) {
      setPinError('Duress PIN must be 4 to 6 digits.');
      return;
    }
    if (safetyPin === duressPin) {
      setPinError('Safety PIN and Duress PIN must be completely different.');
      return;
    }

    try {
      await apiFetch('/api/me/pins', {
        method: 'POST',
        body: JSON.stringify({ safetyPin, duressPin }),
      });
      if (user) {
        setUser({ ...user, hasSafetyPin: true, hasDuressPin: true });
      }
      setStep(4);
    } catch (err: any) {
      setPinError(err.message || 'Failed to set PINs.');
    }
  };

  const handleGuardianNext = async (skip = false) => {
    setGuardianError(null);
    if (skip) {
      setStep(5);
      return;
    }

    if (!guardianName.trim() || !guardianPhone.trim() || !guardianRelation.trim()) {
      setGuardianError('Please fill in all guardian fields.');
      return;
    }
    if (!guardianTold) {
      setGuardianError('You must confirm you have informed this guardian.');
      return;
    }

    try {
      await apiFetch('/api/guardians', {
        method: 'POST',
        body: JSON.stringify({
          name: guardianName.trim(),
          phone: guardianPhone.trim(),
          relation: guardianRelation.trim(),
          priority: 1,
          toldConfirmed: true,
        }),
      });
      setStep(5);
    } catch (err: any) {
      setGuardianError(err.message || 'Failed to add guardian.');
    }
  };

  return (
    <>
      <Helmet>
        <title>Setup &amp; Onboarding — Raksha</title>
      </Helmet>

      <div className="min-h-[85vh] flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full bg-surface border border-border rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          {/* Progress Indicator */}
          <div className="flex items-center justify-between border-b border-border pb-4 text-xs font-semibold text-text-muted">
            <span>Step {step} of 5</span>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <div
                  key={s}
                  className={`w-5 h-1.5 rounded-full transition-all ${
                    s === step ? 'bg-primary w-8' : s < step ? 'bg-safe' : 'bg-border'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* STEP 1: WELCOME */}
          {step === 1 && (
            <div className="space-y-5 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary-soft text-primary flex items-center justify-center mx-auto shadow-sm">
                <Shield className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h2 className="font-heading font-bold text-2xl text-text">
                  Welcome, {user?.displayName || 'Traveller'}
                </h2>
                <p className="text-xs text-text-muted leading-relaxed">
                  Raksha is your personal safety companion. In the next few steps, we will configure your sensors, secret emergency PINs, and safety contacts.
                </p>
              </div>

              <div className="bg-surface-raised p-4 rounded-xl text-xs text-left space-y-2 border border-border">
                <div className="flex items-center gap-2 font-semibold text-text">
                  <CheckCircle className="w-4 h-4 text-safe" />
                  <span>Privacy-first architecture</span>
                </div>
                <p className="text-text-muted">
                  No ads, zero third-party trackers, and no unsolicited contact sharing. You retain complete control over every permission.
                </p>
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary-hover shadow-md transition-colors flex items-center justify-center gap-2"
              >
                <span>Begin Setup</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STEP 2: PERMISSIONS & CONSENTS */}
          {step === 2 && (
            <div className="space-y-5 text-left">
              <div className="space-y-1">
                <h2 className="font-heading font-bold text-xl text-text">Sensors &amp; Permissions</h2>
                <p className="text-xs text-text-muted">
                  Each feature is optional and unbundled. Enable only the capabilities you want.
                </p>
              </div>

              <div className="space-y-3">
                <label className="flex items-start gap-3 p-3 rounded-xl border border-border hover:border-primary cursor-pointer transition-colors">
                  <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div className="flex-1 text-xs">
                    <span className="font-semibold text-text block">Location Tracking</span>
                    <span className="text-text-muted">
                      Active only during started journeys for route deviation and stop alerts.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={permissions.location}
                    onChange={(e) => setPermissions({ ...permissions, location: e.target.checked })}
                    className="w-4 h-4 mt-0.5 rounded accent-primary"
                  />
                </label>

                <label className="flex items-start gap-3 p-3 rounded-xl border border-border hover:border-primary cursor-pointer transition-colors">
                  <Bell className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div className="flex-1 text-xs">
                    <span className="font-semibold text-text block">Push Notifications</span>
                    <span className="text-text-muted">
                      Allows fake calls and safety check alerts to ring even if the screen is locked.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={permissions.push}
                    onChange={(e) => setPermissions({ ...permissions, push: e.target.checked })}
                    className="w-4 h-4 mt-0.5 rounded accent-primary"
                  />
                </label>

                <label className="flex items-start gap-3 p-3 rounded-xl border border-border hover:border-primary cursor-pointer transition-colors">
                  <Smartphone className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div className="flex-1 text-xs">
                    <span className="font-semibold text-text block">Shake-to-SOS</span>
                    <span className="text-text-muted">
                      Detects 3 rapid shakes during a journey to activate emergency assistance.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={permissions.motion}
                    onChange={(e) => setPermissions({ ...permissions, motion: e.target.checked })}
                    className="w-4 h-4 mt-0.5 rounded accent-primary"
                  />
                </label>

                <label className="flex items-start gap-3 p-3 rounded-xl border border-border hover:border-primary cursor-pointer transition-colors">
                  <Mic className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div className="flex-1 text-xs">
                    <span className="font-semibold text-text block">Voice SOS ("help help")</span>
                    <span className="text-text-muted">
                      Listens for the spoken distress phrase during an active journey.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={permissions.voice}
                    onChange={(e) => setPermissions({ ...permissions, voice: e.target.checked })}
                    className="w-4 h-4 mt-0.5 rounded accent-primary"
                  />
                </label>
              </div>

              <button
                onClick={handlePermissionsNext}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary-hover transition-colors"
              >
                Continue to PIN Setup
              </button>
            </div>
          )}

          {/* STEP 3: SAFETY PIN & DURESS PIN */}
          {step === 3 && (
            <div className="space-y-5 text-left">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-primary" />
                  <h2 className="font-heading font-bold text-xl text-text">Configure Security PINs</h2>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  Configure two distinct 4–6 digit codes: your genuine Safety PIN and your secret Duress PIN.
                </p>
              </div>

              {pinError && (
                <div role="alert" className="p-3 bg-red-50 dark:bg-red-950/40 text-emergency text-xs rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{pinError}</span>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-text mb-1">
                    Safety PIN (Normal Resolution)
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="4–6 digits (e.g. 1234)"
                    value={safetyPin}
                    onChange={(e) => setSafetyPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-bg text-text text-sm font-mono focus:ring-2 focus:ring-primary"
                  />
                  <p className="mt-1 text-[11px] text-text-muted">
                    Used to confirm you are safe and cancel false alarms.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-red-50/60 dark:bg-red-950/30 border border-red-200 dark:border-red-900 space-y-2">
                  <label className="block text-xs font-semibold text-emergency">
                    Secret Duress PIN (Coercion Safety)
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="Must differ (e.g. 4321)"
                    value={duressPin}
                    onChange={(e) => setDuressPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-red-300 dark:border-red-800 bg-input-bg text-text text-sm font-mono focus:ring-2 focus:ring-red-500"
                  />
                  <p className="text-[11px] text-text-muted leading-tight">
                    If an attacker forces you to cancel SOS, enter this code. The screen will say "Cancelled", but emergency assistance will continue dispatching silently.
                  </p>
                </div>
              </div>

              <button
                onClick={handlePinsNext}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary-hover transition-colors"
              >
                Save PINs &amp; Continue
              </button>
            </div>
          )}

          {/* STEP 4: ADD FIRST GUARDIAN */}
          {step === 4 && (
            <div className="space-y-5 text-left">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  <h2 className="font-heading font-bold text-xl text-text">Add Primary Guardian</h2>
                </div>
                <p className="text-xs text-text-muted">
                  Add someone you trust (parent, partner, friend). They do not need to download an app.
                </p>
              </div>

              {guardianError && (
                <div role="alert" className="p-3 bg-red-50 dark:bg-red-950/40 text-emergency text-xs rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{guardianError}</span>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-text mb-1">Guardian Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Mom"
                    value={guardianName}
                    onChange={(e) => setGuardianName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-bg text-text text-sm focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text mb-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="e.g. +91 98765 43210"
                    value={guardianPhone}
                    onChange={(e) => setGuardianPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-bg text-text text-sm focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text mb-1">Relation</label>
                  <input
                    type="text"
                    placeholder="e.g. Mother, Roommate, Sister"
                    value={guardianRelation}
                    onChange={(e) => setGuardianRelation(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-bg text-text text-sm focus:ring-2 focus:ring-primary"
                  />
                </div>

                <label className="flex items-start gap-2 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={guardianTold}
                    onChange={(e) => setGuardianTold(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded accent-primary cursor-pointer"
                  />
                  <span className="text-xs text-text-muted leading-tight">
                    I have told this person and they agreed to be my safety guardian.
                  </span>
                </label>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => handleGuardianNext(true)}
                  className="flex-1 py-3 rounded-xl border border-border text-text font-semibold text-sm hover:bg-surface-raised transition-colors"
                >
                  Skip for Now
                </button>
                <button
                  onClick={() => handleGuardianNext(false)}
                  className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary-hover transition-colors"
                >
                  Add Guardian
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: DONE */}
          {step === 5 && (
            <div className="space-y-6 text-center">
              <div className="w-16 h-16 rounded-full bg-safe-bg text-safe flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <h2 className="font-heading font-bold text-2xl text-text">Setup Complete!</h2>
                <p className="text-xs text-text-muted leading-relaxed">
                  Your safety preferences and security PINs are active. You can now plan safe routes, schedule fake exit calls, and share journeys with your emergency network.
                </p>
              </div>

              <button
                onClick={() => navigate('/app')}
                className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-heading font-bold text-base hover:bg-primary-hover shadow-lg transition-colors flex items-center justify-center gap-2"
              >
                <span>Enter Raksha</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
