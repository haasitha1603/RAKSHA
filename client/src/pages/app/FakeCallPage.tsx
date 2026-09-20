import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PhoneCall,
  Play,
  Square,
  Clock,
  Shield,
  Plus,
  Trash2,
  Lock,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { apiFetch } from '../../lib/api.js';
import { audioSynthesizer } from '../../lib/audio.js';
import { FakeCallRow } from '@raksha/shared';
import { Helmet } from 'react-helmet-async';
import { EmptyState } from '../../components/common/EmptyState.js';

const CALLER_PRESETS = [
  { name: 'Mom', number: '+91 98765 43210', color: '#4338CA' },
  { name: 'Dad', number: '+91 98765 43211', color: '#1E40AF' },
  { name: 'Brother', number: '+91 98765 43212', color: '#047857' },
  { name: 'Sister', number: '+91 98765 43213', color: '#B45309' },
  { name: 'Friend', number: '+91 98765 43214', color: '#7C3AED' },
  { name: 'Boss', number: '+91 98765 43215', color: '#374151' },
  { name: 'Cab Driver', number: '+91 98765 43216', color: '#D97706' },
];

const BUILTIN_SCRIPTS = [
  {
    name: 'Mom — Come home soon',
    lines: [
      { line: 'Beta, where have you reached? It is getting late.', pauseSeconds: 3 },
      { line: 'I am waiting by the gate. Should your brother come pick you up?', pauseSeconds: 3 },
      { line: 'Okay, keep your phone in hand and hurry home safely.', pauseSeconds: 2 },
    ],
  },
  {
    name: 'Dad — Outside picking you up',
    lines: [
      { line: 'Hello, I have parked the car right at the main crossing.', pauseSeconds: 3 },
      { line: 'Are you walking towards the signal now?', pauseSeconds: 3 },
      { line: 'Alright, see you in two minutes.', pauseSeconds: 2 },
    ],
  },
  {
    name: 'Friend — At the gate',
    lines: [
      { line: 'Hey, where are you? We are all standing near the entrance.', pauseSeconds: 3 },
      { line: 'Hurry up, we are waiting for you.', pauseSeconds: 2 },
    ],
  },
  {
    name: 'Boss — Urgent work call',
    lines: [
      { line: 'Hi, sorry to call late, but we need you to check this immediately.', pauseSeconds: 3 },
      { line: 'Can you step aside and take a look right now?', pauseSeconds: 2 },
    ],
  },
];

export const FakeCallPage: React.FC = () => {
  const [calls, setCalls] = useState<FakeCallRow[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [previewingRingtone, setPreviewingRingtone] = useState<string | null>(null);

  // New call form state
  const [callerName, setCallerName] = useState('Mom');
  const [callerNumber, setCallerNumber] = useState('+91 98765 43210');
  const [avatarColor, setAvatarColor] = useState('#4338CA');
  const [delayOption, setDelayOption] = useState('30s');
  const [ringtone, setRingtone] = useState<'classic' | 'digital' | 'vibrate'>('classic');
  const [uiStyle, setUiStyle] = useState<'classic' | 'modern'>('classic');
  const [ringSeconds, setRingSeconds] = useState(30);
  const [selectedScriptIdx, setSelectedScriptIdx] = useState(0);

  const navigate = useNavigate();

  const loadCalls = () => {
    apiFetch<{ calls: FakeCallRow[] }>('/api/fake-calls')
      .then((res) => setCalls(res.calls || []))
      .catch(() => {});
  };

  useEffect(() => {
    loadCalls();
    return () => {
      audioSynthesizer.stopAll();
    };
  }, []);

  const handlePreviewRingtone = (tone: 'classic' | 'digital' | 'vibrate') => {
    if (previewingRingtone === tone) {
      audioSynthesizer.stopAll();
      setPreviewingRingtone(null);
      return;
    }

    setPreviewingRingtone(tone);
    if (tone === 'classic') audioSynthesizer.playClassicBell();
    else if (tone === 'digital') audioSynthesizer.playDigitalMelody();
    else audioSynthesizer.stopAll();

    setTimeout(() => {
      audioSynthesizer.stopAll();
      setPreviewingRingtone(null);
    }, 4000);
  };

  const handleScheduleSubmit = async (armNow = false) => {
    let delayMs = 30000;
    if (delayOption === '1m') delayMs = 60000;
    else if (delayOption === '2m') delayMs = 120000;
    else if (delayOption === '5m') delayMs = 300000;
    else if (delayOption === '10m') delayMs = 600000;

    const scheduledFor = new Date(Date.now() + delayMs).toISOString();
    const scriptJson = JSON.stringify(BUILTIN_SCRIPTS[selectedScriptIdx].lines);

    try {
      const res = await apiFetch<any>('/api/fake-calls', {
        method: 'POST',
        body: JSON.stringify({
          callerName,
          callerNumber,
          avatarColor,
          ringtone,
          uiStyle,
          scriptJson,
          scheduledFor,
          ringSeconds,
          notifyGuardian: false,
        }),
      });

      setSheetOpen(false);
      loadCalls();

      if (armNow) {
        // Unlock audio context via user gesture tap
        audioSynthesizer.unlock();
        await apiFetch(`/api/fake-calls/${res.call.id}/arm`, { method: 'POST' });
        navigate(`/app/fake-call/standby/${res.call.id}`);
      }
    } catch (err) {
      console.error('Failed to schedule fake call:', err);
    }
  };

  const handleArmExisting = async (callId: string) => {
    audioSynthesizer.unlock();
    await apiFetch(`/api/fake-calls/${callId}/arm`, { method: 'POST' });
    navigate(`/app/fake-call/standby/${callId}`);
  };

  const handleDelete = async (callId: string) => {
    await apiFetch(`/api/fake-calls/${callId}`, { method: 'DELETE' });
    loadCalls();
  };

  return (
    <>
      <Helmet>
        <title>Fake Call Generator — Raksha</title>
      </Helmet>

      <div className="max-w-4xl mx-auto px-4 py-6 pb-28 md:pb-12 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading font-bold text-2xl text-text">Fake Call Generator</h1>
            <p className="text-xs text-text-muted">
              Schedule an authentic-sounding incoming call to excuse yourself from uncomfortable situations.
            </p>
          </div>
          <button
            onClick={() => setSheetOpen(true)}
            className="px-4 py-2.5 bg-primary text-primary-foreground font-semibold text-xs rounded-xl shadow hover:bg-primary-hover transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule New Call</span>
          </button>
        </div>

        {/* Informational Call-out */}
        <div className="p-4 bg-primary-soft/40 border border-primary/20 rounded-2xl text-xs space-y-1">
          <span className="font-semibold text-primary block">How Raksha Fake Call Works</span>
          <p className="text-text-muted leading-relaxed">
            The call rings directly inside Raksha with realistic screen graphics, custom ringtones, vibration, and multi-turn speech synthesis with natural pauses so you can reply out loud. No real telephone charges apply.
          </p>
        </div>

        {/* Scheduled / Past Calls List */}
        <div className="space-y-3">
          <h2 className="font-heading font-bold text-base text-text">Scheduled &amp; Recent Calls</h2>

          {calls.length === 0 ? (
            <EmptyState
              title="No fake calls scheduled"
              description="Schedule a call ahead of time or create a 30-second exit trigger."
              icon="phone"
              actionLabel="Schedule a Fake Call"
              onAction={() => setSheetOpen(true)}
            />
          ) : (
            <div className="space-y-2.5">
              {calls.map((call) => (
                <div
                  key={call.id}
                  className="p-4 bg-surface border border-border rounded-2xl shadow-xs flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm"
                      style={{ backgroundColor: call.avatar_color }}
                    >
                      {call.caller_name[0]}
                    </div>
                    <div>
                      <div className="font-heading font-bold text-sm text-text">
                        {call.caller_name}
                      </div>
                      <div className="text-xs text-text-muted">{call.caller_number}</div>
                      <div className="text-[11px] text-text-muted mt-0.5 font-mono">
                        Scheduled: {new Date(call.scheduled_for).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                        call.status === 'armed'
                          ? 'bg-amber-100 text-amber-800 animate-pulse'
                          : call.status === 'scheduled'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {call.status}
                    </span>

                    {call.status === 'scheduled' && (
                      <button
                        onClick={() => handleArmExisting(call.id)}
                        className="px-3 py-1.5 bg-primary text-primary-foreground font-semibold text-xs rounded-lg hover:bg-primary-hover"
                      >
                        Arm Standby
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(call.id)}
                      className="p-1.5 text-text-muted hover:text-emergency transition-colors"
                      aria-label="Delete call"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SCHEDULE NEW CALL SHEET MODAL */}
        {sheetOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-surface border border-border rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto p-6 max-w-lg w-full space-y-5 shadow-2xl">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <h3 className="font-heading font-bold text-lg text-text">Schedule Fake Call</h3>
                <button onClick={() => setSheetOpen(false)}>
                  <Square className="w-4 h-4 text-text-muted" />
                </button>
              </div>

              {/* Presets */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-text block">Caller Preset</span>
                <div className="flex flex-wrap gap-1.5">
                  {CALLER_PRESETS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => {
                        setCallerName(p.name);
                        setCallerNumber(p.number);
                        setAvatarColor(p.color);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                        callerName === p.name
                          ? 'border-primary bg-primary-soft text-primary'
                          : 'border-border bg-surface text-text hover:bg-surface-raised'
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text mb-1">Caller Name</label>
                  <input
                    type="text"
                    value={callerName}
                    onChange={(e) => setCallerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-input-bg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={callerNumber}
                    onChange={(e) => setCallerNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-input-bg text-xs"
                  />
                </div>
              </div>

              {/* Timing Segmented */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-text block">Ring In</span>
                <div className="grid grid-cols-4 gap-1.5 text-xs">
                  {['30s', '1m', '2m', '5m'].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDelayOption(d)}
                      className={`py-2 rounded-lg border font-semibold ${
                        delayOption === d
                          ? 'border-primary bg-primary-soft text-primary'
                          : 'border-border bg-surface text-text'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ringtone Selection & Preview */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-text block">Ringtone &amp; Sound</span>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {(['classic', 'digital', 'vibrate'] as const).map((r) => (
                    <div
                      key={r}
                      className={`p-2.5 rounded-xl border flex flex-col justify-between gap-2 ${
                        ringtone === r ? 'border-primary bg-primary-soft/50' : 'border-border'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setRingtone(r)}
                        className="font-semibold text-text capitalize text-left"
                      >
                        {r}
                      </button>
                      {r !== 'vibrate' && (
                        <button
                          type="button"
                          onClick={() => handlePreviewRingtone(r)}
                          className="px-2 py-1 bg-surface border border-border rounded text-[11px] flex items-center gap-1 text-text-muted hover:text-text"
                        >
                          {previewingRingtone === r ? (
                            <>
                              <Square className="w-3 h-3 text-emergency" />
                              <span>Stop</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3 h-3 text-primary" />
                              <span>Preview</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Script Selection */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-text block">Spoken Script</span>
                <select
                  value={selectedScriptIdx}
                  onChange={(e) => setSelectedScriptIdx(parseInt(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-input-bg text-xs"
                >
                  {BUILTIN_SCRIPTS.map((s, idx) => (
                    <option key={idx} value={idx}>
                      {s.name} ({s.lines.length} turns)
                    </option>
                  ))}
                </select>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => handleScheduleSubmit(false)}
                  className="flex-1 py-3 bg-surface border border-border rounded-xl text-xs font-semibold text-text hover:bg-surface-raised"
                >
                  Save Schedule
                </button>
                <button
                  type="button"
                  onClick={() => handleScheduleSubmit(true)}
                  className="flex-1 py-3 bg-primary text-primary-foreground font-semibold text-xs rounded-xl hover:bg-primary-hover shadow-md"
                >
                  Save &amp; Arm Now
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
