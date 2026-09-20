import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Shield, Clock, X, Play, Bell } from 'lucide-react';
import { apiFetch } from '../../lib/api.js';
import { audioSynthesizer } from '../../lib/audio.js';
import { Helmet } from 'react-helmet-async';

interface CallData {
  id: string;
  caller_name: string;
  caller_number: string;
  avatar_color: string;
  ringtone: string;
  ui_style: string;
  scheduled_for: number;
  ring_seconds: number;
  status: string;
}

export const FakeCallStandbyPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [call, setCall] = useState<CallData | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const tapTimes = useRef<number[]>([]);

  useEffect(() => {
    // Clock tick every second
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Fetch call details
    let isMounted = true;
    const fetchCall = async () => {
      try {
        const res = await apiFetch<any>('/api/fake-calls');
        const found = res.calls.find((c: any) => c.id === id);
        if (found && isMounted) {
          setCall(found);
        }
      } catch (err) {
        console.error('Failed to load call in standby:', err);
      }
    };
    fetchCall();
    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (!call) return;

    const timer = setInterval(() => {
      const now = Date.now();
      const scheduledAt = typeof call.scheduled_for === 'number'
        ? call.scheduled_for
        : new Date(call.scheduled_for).getTime();
      const diff = Math.max(0, Math.ceil((scheduledAt - now) / 1000));
      setSecondsRemaining(diff);

      if (diff <= 0) {
        clearInterval(timer);
        // Time to ring! Unlock audio and navigate to incoming
        audioSynthesizer.unlock();
        navigate(`/app/fake-call/incoming/${id}`);
      }
    }, 500);

    return () => clearInterval(timer);
  }, [call, id, navigate]);

  // Triple tap anywhere to cancel standby
  const handleScreenClick = () => {
    const now = Date.now();
    tapTimes.current.push(now);
    // Keep only taps in last 1.2s
    tapTimes.current = tapTimes.current.filter((t) => now - t <= 1200);
    if (tapTimes.current.length >= 3) {
      handleCancel();
    }
  };

  const handleCancel = async () => {
    try {
      await apiFetch(`/api/fake-calls/${id}/cancel`, { method: 'POST' });
    } catch (err) {
      console.error(err);
    }
    navigate('/app/fake-call');
  };

  const handleTriggerNow = () => {
    audioSynthesizer.unlock();
    navigate(`/app/fake-call/incoming/${id}`);
  };

  const hours = currentTime.getHours().toString().padStart(2, '0');
  const minutes = currentTime.getMinutes().toString().padStart(2, '0');
  const dateStr = currentTime.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <>
      <Helmet>
        <title>Standby — Raksha</title>
      </Helmet>

      <div
        onClick={handleScreenClick}
        className="fixed inset-0 z-50 bg-black text-white flex flex-col justify-between p-6 select-none cursor-default font-sans overflow-hidden"
      >
        {/* Top Status Bar Simulator */}
        <div className="flex items-center justify-between text-xs text-neutral-400 pt-2 px-2">
          <div className="flex items-center gap-1.5 font-medium">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Standby Active</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono">
              {secondsRemaining > 0 ? `Ring in ${secondsRemaining}s` : 'Ready'}
            </span>
            <div className="w-6 h-3 border border-neutral-400 rounded-sm p-0.5 flex items-center">
              <div className="bg-neutral-300 w-3/4 h-full rounded-xs"></div>
            </div>
          </div>
        </div>

        {/* Lock Screen Clock Display */}
        <div className="flex flex-col items-center justify-center my-auto space-y-2 text-center">
          <div className="text-neutral-400 text-sm tracking-wide font-medium">{dateStr}</div>
          <div className="text-7xl sm:text-8xl font-light tracking-tighter text-white font-mono">
            {hours}:{minutes}
          </div>

          {call && (
            <div className="mt-8 px-4 py-2 bg-neutral-900/80 border border-neutral-800 rounded-2xl flex items-center gap-3 shadow-lg">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm"
                style={{ backgroundColor: call.avatar_color }}
              >
                {call.caller_name[0]}
              </div>
              <div className="text-left">
                <div className="text-xs font-semibold text-neutral-200">
                  Armed: {call.caller_name}
                </div>
                <div className="text-[10px] text-neutral-400">
                  Rings in ~{secondsRemaining}s • Tap screen stays on
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Standby Actions & Cancel Guidance */}
        <div className="space-y-4 pb-4">
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleTriggerNow();
              }}
              className="px-4 py-2 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Trigger Now</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleCancel();
              }}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel Standby</span>
            </button>
          </div>

          <p className="text-[11px] text-neutral-500 text-center tracking-tight">
            Discreet trigger: triple-tap anywhere on the screen to abort standby.
          </p>
        </div>
      </div>
    </>
  );
};
