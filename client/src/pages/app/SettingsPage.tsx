import React, { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  Lock,
  Eye,
  Bell,
  Moon,
  Sun,
  Type,
  Trash2,
  Download,
  Check,
  AlertTriangle,
  Volume2,
  Smartphone,
} from 'lucide-react';
import { apiFetch } from '../../lib/api.js';
import { audioSynthesizer } from '../../lib/audio.js';
import { useSettingsStore } from '../../stores/settingsStore.js';
import { useAuthStore } from '../../stores/authStore.js';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, setUser, logout } = useAuthStore();
  const {
    theme,
    setTheme,
    textSize,
    setTextSize,
    highContrast,
    setHighContrast,
    hapticFeedback,
    setHapticFeedback,
    timingProfile,
    setTimingProfile,
  } = useSettingsStore();

  // Security PIN states
  const [safetyPin, setSafetyPin] = useState('');
  const [duressPin, setDuressPin] = useState('');
  const [pinSuccess, setPinSuccess] = useState(false);
  const [pinError, setPinError] = useState('');

  // Siren preview state
  const [isPlayingSiren, setIsPlayingSiren] = useState(false);
  const [sirenStopFn, setSirenStopFn] = useState<(() => void) | null>(null);

  const handleUpdatePins = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');
    setPinSuccess(false);

    if (safetyPin.length < 4 || duressPin.length < 4) {
      setPinError('PINs must be at least 4 digits');
      return;
    }
    if (safetyPin === duressPin) {
      setPinError('Duress PIN must be different from your Safety PIN');
      return;
    }

    try {
      await apiFetch('/api/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({
          safetyPin,
          duressPin,
        }),
      });
      setPinSuccess(true);
      setSafetyPin('');
      setDuressPin('');
      setTimeout(() => setPinSuccess(false), 3000);
    } catch (err: any) {
      setPinError(err.message || 'Failed to update PINs');
    }
  };

  const handleToggleSiren = () => {
    if (isPlayingSiren && sirenStopFn) {
      sirenStopFn();
      setSirenStopFn(null);
      setIsPlayingSiren(false);
    } else {
      audioSynthesizer.unlock();
      const stop = audioSynthesizer.startSiren();
      setSirenStopFn(() => stop);
      setIsPlayingSiren(true);
    }
  };

  const handleExportData = async () => {
    try {
      const res = await apiFetch<any>('/api/auth/export');
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(res, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `raksha_user_archive_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      console.error('Failed to export data:', err);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmation = prompt(
      'Type DELETE to permanently erase your account, contacts, and journey history. This action cannot be undone.'
    );
    if (confirmation !== 'DELETE') return;

    try {
      await apiFetch('/api/auth/me', { method: 'DELETE' });
      logout();
      navigate('/');
    } catch (err) {
      console.error('Failed to delete account:', err);
    }
  };

  return (
    <>
      <Helmet>
        <title>Settings &amp; Security — Raksha</title>
      </Helmet>

      <div className="max-w-3xl mx-auto px-4 py-6 pb-28 md:pb-12 space-y-8">
        {/* Header */}
        <div>
          <h1 className="font-heading font-bold text-2xl text-text">Settings &amp; Security</h1>
          <p className="text-xs text-text-muted mt-1">
            Configure emergency trigger sensitivities, duress secrecy, and personal data preferences.
          </p>
        </div>

        {/* SECTION 1: SECURITY PINS */}
        <section className="bg-surface border border-border rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <Lock className="w-5 h-5 text-primary" />
            <h2 className="font-heading font-bold text-base text-text">Security PINs</h2>
          </div>

          <p className="text-xs text-text-muted leading-relaxed">
            Your <strong>Safety PIN</strong> dismisses active checks normally. Your <strong>Duress PIN</strong> secretly signals an emergency while showing a fake &quot;SOS Cancelled&quot; screen.
          </p>

          <form onSubmit={handleUpdatePins} className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text mb-1">
                  New Safety PIN (4–6 digits)
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={safetyPin}
                  onChange={(e) => setSafetyPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 1234"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-input-bg text-xs text-text focus:outline-hidden focus:ring-2 focus:ring-primary font-mono tracking-widest"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text mb-1">
                  New Duress PIN (Must be different)
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={duressPin}
                  onChange={(e) => setDuressPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 4321"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-input-bg text-xs text-text focus:outline-hidden focus:ring-2 focus:ring-primary font-mono tracking-widest"
                />
              </div>
            </div>

            {pinError && (
              <div className="text-xs text-emergency font-medium flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span>{pinError}</span>
              </div>
            )}

            {pinSuccess && (
              <div className="text-xs text-emerald-800 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                <Check className="w-4 h-4" />
                <span>Security PINs successfully updated.</span>
              </div>
            )}

            <button
              type="submit"
              disabled={!safetyPin || !duressPin}
              className="px-4 py-2.5 bg-primary text-primary-foreground font-semibold text-xs rounded-xl shadow-xs hover:bg-primary-hover disabled:opacity-40 transition-colors"
            >
              Update Security PINs
            </button>
          </form>
        </section>

        {/* SECTION 2: TIMING PROFILE */}
        <section className="bg-surface border border-border rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="font-heading font-bold text-base text-text">Safety Monitoring Sensitivity</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                id: 'relaxed',
                title: 'Relaxed',
                desc: '60s safety check response. Lower frequency alerts for familiar daytime routes.',
              },
              {
                id: 'standard',
                title: 'Standard',
                desc: '30s safety check response. Balanced deviation detection for normal commuting.',
              },
              {
                id: 'strict',
                title: 'Strict',
                desc: '15s safety check response. Immediate alerts on sudden stops or off-route turns.',
              },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setTimingProfile(p.id as any)}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  timingProfile === p.id
                    ? 'border-primary bg-primary-soft text-primary shadow-xs'
                    : 'border-border bg-surface text-text hover:bg-surface-raised'
                }`}
              >
                <div className="font-heading font-bold text-sm text-text">{p.title}</div>
                <div className="text-xs text-text-muted mt-1 leading-relaxed">{p.desc}</div>
              </button>
            ))}
          </div>
        </section>

        {/* SECTION 3: ACCESSIBILITY & AUDIO */}
        <section className="bg-surface border border-border rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <Type className="w-5 h-5 text-primary" />
            <h2 className="font-heading font-bold text-base text-text">Appearance &amp; Accessibility</h2>
          </div>

          <div className="space-y-4 text-xs">
            {/* Theme */}
            <div className="flex items-center justify-between">
              <span className="font-semibold text-text">Color Scheme</span>
              <div className="flex items-center gap-1 bg-surface-raised border border-border p-1 rounded-xl">
                {(['auto', 'light', 'dark'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`px-3 py-1 rounded-lg capitalize font-medium ${
                      theme === t ? 'bg-surface text-text shadow-xs' : 'text-text-muted'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Text Size */}
            <div className="flex items-center justify-between">
              <span className="font-semibold text-text">Text Size</span>
              <div className="flex items-center gap-1 bg-surface-raised border border-border p-1 rounded-xl">
                {(['normal', 'large', 'xl'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setTextSize(s)}
                    className={`px-3 py-1 rounded-lg capitalize font-medium ${
                      textSize === s ? 'bg-surface text-text shadow-xs' : 'text-text-muted'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* High Contrast */}
            <div className="flex items-center justify-between py-1">
              <div>
                <span className="font-semibold text-text block">High Contrast Mode</span>
                <span className="text-[11px] text-text-muted">Boosts border and text contrast for outdoor daylight readability.</span>
              </div>
              <input
                type="checkbox"
                checked={highContrast}
                onChange={(e) => setHighContrast(e.target.checked)}
                className="w-5 h-5 text-primary rounded"
              />
            </div>

            {/* Siren Test */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div>
                <span className="font-semibold text-text block">Audio Siren Test</span>
                <span className="text-[11px] text-text-muted">Audible 100dB-equivalent synthesizer tone for disorienting attackers.</span>
              </div>
              <button
                type="button"
                onClick={handleToggleSiren}
                className={`px-3.5 py-2 rounded-xl font-semibold flex items-center gap-1.5 transition-colors ${
                  isPlayingSiren
                    ? 'bg-emergency text-emergency-foreground animate-pulse'
                    : 'bg-surface-raised border border-border text-text hover:bg-surface'
                }`}
              >
                <Volume2 className="w-4 h-4" />
                <span>{isPlayingSiren ? 'Stop Siren' : 'Test Siren'}</span>
              </button>
            </div>
          </div>
        </section>

        {/* SECTION 4: PRIVACY & DATA SELF-SERVICE */}
        <section className="bg-surface border border-border rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <Trash2 className="w-5 h-5 text-emergency" />
            <h2 className="font-heading font-bold text-base text-text">Privacy &amp; Data Control</h2>
          </div>

          <p className="text-xs text-text-muted leading-relaxed">
            Raksha operates under strict data minimization. Zero third-party trackers, zero advertising SDKs. GPS breadcrumbs are automatically purged within 24 hours of journey completion.
          </p>

          <div className="flex flex-wrap gap-3 pt-1">
            <button
              type="button"
              onClick={handleExportData}
              className="px-4 py-2 bg-surface border border-border rounded-xl text-xs font-semibold text-text hover:bg-surface-raised flex items-center gap-1.5"
            >
              <Download className="w-4 h-4 text-primary" />
              <span>Export Personal Archive (JSON)</span>
            </button>

            <button
              type="button"
              onClick={handleDeleteAccount}
              className="px-4 py-2 bg-red-600/10 border border-red-500/30 text-red-600 dark:text-red-400 rounded-xl text-xs font-semibold hover:bg-red-600/20 flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Account &amp; Erase Data</span>
            </button>
          </div>
        </section>

        {/* SECTION 5: APP META & DISCLAIMER */}
        <div className="text-center text-xs text-text-muted space-y-1">
          <p>Raksha Safety Web Platform • Version 1.0.0 (Production Build)</p>
          <p className="text-[11px]">
            In an immediate life-threatening emergency, always dial <strong>112</strong>.
          </p>
        </div>
      </div>
    </>
  );
};
