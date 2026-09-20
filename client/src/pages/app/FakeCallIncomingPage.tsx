import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Grid,
  Shield,
  MessageSquare,
  AlertTriangle,
} from 'lucide-react';
import { apiFetch } from '../../lib/api.js';
import { audioSynthesizer } from '../../lib/audio.js';
import { speechEngine } from '../../lib/speech.js';
import { Helmet } from 'react-helmet-async';
import { useSosStore } from '../../stores/sosStore.js';

interface ScriptLine {
  line: string;
  pauseSeconds: number;
}

interface CallData {
  id: string;
  caller_name: string;
  caller_number: string;
  avatar_color: string;
  ringtone: string;
  ui_style: string;
  script_json: string;
  ring_seconds: number;
}

export const FakeCallIncomingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const triggerSos = useSosStore((s) => s.triggerSos);

  const [call, setCall] = useState<CallData | null>(null);
  const [callState, setCallState] = useState<'ringing' | 'connected' | 'ended'>('ringing');
  const [callSeconds, setCallSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);
  const [showKeypad, setShowKeypad] = useState(false);
  const [keypadBuffer, setKeypadBuffer] = useState('');
  const [currentScriptTurn, setCurrentScriptTurn] = useState<number>(-1);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [duressTriggered, setDuressTriggered] = useState(false);

  const ringtoneStopRef = useRef<(() => void) | null>(null);
  const vibrateIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const res = await apiFetch<any>('/api/fake-calls');
        const found = res.calls.find((c: any) => c.id === id);
        if (found && isMounted) {
          setCall(found);

          // Start ringing
          audioSynthesizer.unlock();
          const stopAudio = audioSynthesizer.startRingtone((found.ringtone as any) || 'classic');
          ringtoneStopRef.current = stopAudio;

          // Vibration pattern
          if ('vibrate' in navigator) {
            navigator.vibrate([500, 300, 500, 300, 800]);
            vibrateIntervalRef.current = window.setInterval(() => {
              navigator.vibrate([500, 300, 500, 300, 800]);
            }, 3000);
          }
        }
      } catch (err) {
        console.error('Failed to load incoming call:', err);
      }
    };

    load();

    return () => {
      isMounted = false;
      if (ringtoneStopRef.current) ringtoneStopRef.current();
      if (vibrateIntervalRef.current) clearInterval(vibrateIntervalRef.current);
      speechEngine.stop();
    };
  }, [id]);

  // Call timer when connected
  useEffect(() => {
    if (callState !== 'connected') return;

    const timer = setInterval(() => {
      setCallSeconds((s) => s + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [callState]);

  // Handle Answer
  const handleAnswer = () => {
    if (ringtoneStopRef.current) {
      ringtoneStopRef.current();
      ringtoneStopRef.current = null;
    }
    if (vibrateIntervalRef.current) {
      clearInterval(vibrateIntervalRef.current);
      vibrateIntervalRef.current = null;
    }
    if ('vibrate' in navigator) {
      navigator.vibrate(0);
    }

    setCallState('connected');

    // Parse script & play speech synthesis
    if (call?.script_json) {
      try {
        const script: ScriptLine[] = JSON.parse(call.script_json);
        if (Array.isArray(script) && script.length > 0) {
          speechEngine.speakScript(
            script,
            (turnIdx: number) => {
              setCurrentScriptTurn(turnIdx);
              setIsSpeaking(true);
            },
            () => {
              setIsSpeaking(false);
            }
          );
        }
      } catch (err) {
        console.error('Failed to parse scriptJson:', err);
      }
    }
  };

  // Handle Decline
  const handleDecline = async () => {
    if (ringtoneStopRef.current) ringtoneStopRef.current();
    if (vibrateIntervalRef.current) clearInterval(vibrateIntervalRef.current);
    if ('vibrate' in navigator) navigator.vibrate(0);
    speechEngine.stop();

    try {
      await apiFetch(`/api/fake-calls/${id}/cancel`, { method: 'POST' });
    } catch (err) {
      console.error(err);
    }
    navigate('/app/fake-call');
  };

  // Handle Hangup
  const handleHangup = async () => {
    speechEngine.stop();
    setCallState('ended');

    try {
      await apiFetch(`/api/fake-calls/${id}/complete`, { method: 'POST' });
    } catch (err) {
      console.error(err);
    }
    setTimeout(() => {
      navigate('/app/fake-call');
    }, 800);
  };

  // Keypad touch tones & secret Duress SOS detection
  const handleKeypadPress = async (digit: string) => {
    audioSynthesizer.playTouchTone(digit);
    const newBuf = keypadBuffer + digit;
    setKeypadBuffer(newBuf);

    // If buffer ends with duress PIN '4321', trigger stealth duress SOS
    if (newBuf.endsWith('4321')) {
      setDuressTriggered(true);
      try {
        await triggerSos({
          trigger: 'fake_call_duress',
          discreet: true,
          location: { lat: 12.9716, lng: 77.5946 },
        });
      } catch (err) {
        console.error('Duress trigger failed:', err);
      }
    }
  };

  const formatDuration = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, '0');
    const secs = (totalSeconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const callerName = call?.caller_name || 'Incoming Call';
  const callerNumber = call?.caller_number || '+91 98765 43210';
  const avatarColor = call?.avatar_color || '#4338CA';

  return (
    <>
      <Helmet>
        <title>{callState === 'ringing' ? `Incoming: ${callerName}` : `Call with ${callerName}`}</title>
      </Helmet>

      <div className="fixed inset-0 z-50 bg-gradient-to-b from-neutral-900 via-neutral-950 to-black text-white flex flex-col justify-between p-6 select-none font-sans overflow-hidden">
        {/* Top bar info */}
        <div className="flex items-center justify-between text-xs text-neutral-400 pt-2">
          <div className="flex items-center gap-1.5 font-medium">
            <Shield className="w-3.5 h-3.5 text-primary" />
            <span>Raksha Guard</span>
          </div>
          {duressTriggered && (
            <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>Duress Alert Dispatched</span>
            </div>
          )}
        </div>

        {/* Caller Avatar & Name Header */}
        <div className="flex flex-col items-center justify-center my-auto space-y-4 text-center">
          <div className="relative">
            <div
              className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full flex items-center justify-center text-4xl sm:text-5xl font-bold text-white shadow-2xl transition-transform ${
                callState === 'ringing' ? 'animate-pulse scale-105' : ''
              }`}
              style={{ backgroundColor: avatarColor }}
            >
              {callerName[0] || 'C'}
            </div>

            {callState === 'connected' && isSpeaking && (
              <div className="absolute -bottom-2 inset-x-0 flex items-center justify-center gap-1">
                <span className="w-1.5 h-4 bg-emerald-400 rounded-full animate-bounce"></span>
                <span
                  className="w-1.5 h-6 bg-emerald-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0.15s' }}
                ></span>
                <span
                  className="w-1.5 h-3 bg-emerald-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0.3s' }}
                ></span>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <h1 className="text-3xl sm:text-4xl font-heading font-bold text-white tracking-tight">
              {callerName}
            </h1>
            <p className="text-neutral-400 text-sm font-mono">{callerNumber}</p>
            <p className="text-neutral-500 text-xs uppercase tracking-wider font-semibold">
              {callState === 'ringing'
                ? 'Incoming Call...'
                : callState === 'connected'
                ? formatDuration(callSeconds)
                : 'Call Ended'}
            </p>
          </div>
        </div>

        {/* IN-CALL KEYPAD MODAL / OVERLAY */}
        {showKeypad && callState === 'connected' && (
          <div className="absolute inset-x-6 bottom-32 max-w-xs mx-auto bg-neutral-900/95 border border-neutral-800 rounded-3xl p-4 shadow-2xl backdrop-blur-md space-y-3">
            <div className="text-center font-mono text-lg text-white tracking-widest h-7 overflow-hidden">
              {keypadBuffer || '—'}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => handleKeypadPress(k)}
                  className="h-12 rounded-full bg-neutral-800/80 hover:bg-neutral-700 active:bg-neutral-600 text-white font-heading font-semibold text-lg flex items-center justify-center transition-colors"
                >
                  {k}
                </button>
              ))}
            </div>
            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowKeypad(false)}
                className="text-xs text-neutral-400 hover:text-white py-1"
              >
                Hide Keypad
              </button>
            </div>
          </div>
        )}

        {/* BOTTOM CONTROLS BASED ON STATE */}
        {callState === 'ringing' ? (
          <div className="pb-8 flex items-center justify-around max-w-sm mx-auto w-full">
            {/* Decline */}
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={handleDecline}
                className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 text-white flex items-center justify-center shadow-lg transition-transform"
                aria-label="Decline Call"
              >
                <PhoneOff className="w-8 h-8" />
              </button>
              <span className="text-xs text-neutral-400 font-medium">Decline</span>
            </div>

            {/* Answer */}
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={handleAnswer}
                className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white flex items-center justify-center shadow-lg transition-transform animate-bounce"
                aria-label="Answer Call"
              >
                <Phone className="w-8 h-8" />
              </button>
              <span className="text-xs text-neutral-400 font-medium">Answer</span>
            </div>
          </div>
        ) : callState === 'connected' ? (
          <div className="pb-8 space-y-6 max-w-sm mx-auto w-full">
            {/* Connected in-call 3x2 action grid */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-colors ${
                  isMuted ? 'bg-white text-black border-white' : 'bg-neutral-800/80 border-neutral-700 text-white'
                }`}
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                <span className="text-[11px]">Mute</span>
              </button>

              <button
                type="button"
                onClick={() => setShowKeypad(!showKeypad)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-colors ${
                  showKeypad ? 'bg-white text-black border-white' : 'bg-neutral-800/80 border-neutral-700 text-white'
                }`}
              >
                <Grid className="w-6 h-6" />
                <span className="text-[11px]">Keypad</span>
              </button>

              <button
                type="button"
                onClick={() => setIsSpeaker(!isSpeaker)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-colors ${
                  isSpeaker ? 'bg-white text-black border-white' : 'bg-neutral-800/80 border-neutral-700 text-white'
                }`}
              >
                {isSpeaker ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
                <span className="text-[11px]">Speaker</span>
              </button>
            </div>

            {/* End Call Button */}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleHangup}
                className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 text-white flex items-center justify-center shadow-xl transition-transform"
                aria-label="End Call"
              >
                <PhoneOff className="w-8 h-8" />
              </button>
            </div>
          </div>
        ) : (
          <div className="pb-8 text-center text-neutral-400 text-sm">Returning to app...</div>
        )}
      </div>
    </>
  );
};
