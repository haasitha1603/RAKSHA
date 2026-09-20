import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Shield,
  PhoneCall,
  Clock,
  Battery,
  Wifi,
  Navigation,
  CheckCircle,
  AlertOctagon,
  Smartphone,
  Mic,
  Coffee,
  X,
  Lock,
} from 'lucide-react';
import { SafetyMap } from '../../components/map/SafetyMap.js';
import { StatusChip } from '../../components/common/StatusChip.js';
import { apiFetch } from '../../lib/api.js';
import { useJourneyStore } from '../../stores/journeyStore.js';
import { useSosStore } from '../../stores/sosStore.js';
import { voiceSosListener } from '../../lib/speech.js';
import { audioSynthesizer } from '../../lib/audio.js';
import { Helmet } from 'react-helmet-async';
import { format } from 'date-fns';

export const ActiveJourneyPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    activeJourney,
    setActiveJourney,
    currentLocation,
    battery,
    isOnline,
    riskLevel,
    riskScore,
    riskExplanations,
    activeSafetyCheck,
    setActiveSafetyCheck,
    ingestPosition,
    respondSafetyCheck,
    shakeEnabled,
    voiceEnabled,
    toggleVoice,
  } = useJourneyStore();

  const { triggerSos } = useSosStore();

  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [plannedStopOpen, setPlannedStopOpen] = useState(false);
  const [stopMinutes, setStopMinutes] = useState(10);
  const [stopLabel, setStopLabel] = useState('Coffee / Rest break');
  const [checkCountdown, setCheckCountdown] = useState(20);

  const wakeLockRef = useRef<any>(null);

  // Load journey details
  useEffect(() => {
    if (!id) return;
    apiFetch<any>(`/api/journeys/${id}`)
      .then((res) => {
        setActiveJourney(res.journey);
      })
      .catch(() => navigate('/app'));
  }, [id, setActiveJourney, navigate]);

  // Request Screen Wake Lock
  useEffect(() => {
    const acquireWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
          setWakeLockActive(true);
        }
      } catch {}
    };
    acquireWakeLock();

    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, []);

  // Geolocation watchPosition tracking
  useEffect(() => {
    if (!('geolocation' in navigator)) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        ingestPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          acc: pos.coords.accuracy,
          speed: pos.coords.speed,
          heading: pos.coords.heading,
          ts: new Date().toISOString(),
          battery,
          online: navigator.onLine,
        });
      },
      (err) => console.warn('GPS error:', err),
      { enableHighAccuracy: true, maximumAge: 3000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [ingestPosition, battery]);

  // Shake-to-SOS listener (3 strong shakes in 1.5s: acc > 15 m/s²)
  useEffect(() => {
    if (!shakeEnabled || typeof window === 'undefined' || !window.DeviceMotionEvent) return;

    let shakeCount = 0;
    let lastShakeTime = 0;

    const handleMotion = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity;
      if (!acc || acc.x == null || acc.y == null || acc.z == null) return;

      const magnitude = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);
      if (magnitude > 15) {
        const now = Date.now();
        if (now - lastShakeTime > 250) {
          shakeCount++;
          lastShakeTime = now;

          if (shakeCount >= 3) {
            shakeCount = 0;
            console.log('Shake-to-SOS triggered');
            triggerSos({
              journeyId: id,
              trigger: 'shake',
              discreet: false,
              location: currentLocation || { lat: 28.6139, lng: 77.2090 },
            }).then(() => navigate('/app/sos'));
          }
        }
      }
    };

    window.addEventListener('devicemotion', handleMotion);
    return () => window.removeEventListener('devicemotion', handleMotion);
  }, [shakeEnabled, id, currentLocation, triggerSos, navigate]);

  // Voice SOS Listener
  useEffect(() => {
    if (voiceEnabled) {
      voiceSosListener.start(() => {
        triggerSos({
          journeyId: id,
          trigger: 'voice',
          discreet: false,
          location: currentLocation || { lat: 28.6139, lng: 77.2090 },
        }).then(() => navigate('/app/sos'));
      });
    } else {
      voiceSosListener.stop();
    }
    return () => voiceSosListener.stop();
  }, [voiceEnabled, id, currentLocation, triggerSos, navigate]);

  // Safety Check countdown sound & vibration
  useEffect(() => {
    if (activeSafetyCheck) {
      audioSynthesizer.playConnectedTone();
      if ('vibrate' in navigator) navigator.vibrate([300, 100, 300]);

      setCheckCountdown(20);
      const timer = setInterval(() => {
        setCheckCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [activeSafetyCheck]);

  const handleArrive = async () => {
    if (!id) return;
    await apiFetch(`/api/journeys/${id}/arrive`, { method: 'POST' });
    navigate('/app/history');
  };

  const handleAddPlannedStop = async () => {
    if (!id || !currentLocation) return;
    const untilTs = new Date(Date.now() + stopMinutes * 60000).toISOString();
    await apiFetch(`/api/journeys/${id}/planned-stops`, {
      method: 'POST',
      body: JSON.stringify({
        label: stopLabel,
        lat: currentLocation.lat,
        lng: currentLocation.lng,
        radiusM: 150,
        untilTs,
      }),
    });
    setPlannedStopOpen(false);
  };

  const handleFakeCallNow = async () => {
    try {
      const res = await apiFetch<any>('/api/fake-calls', {
        method: 'POST',
        body: JSON.stringify({
          callerName: 'Mom',
          callerNumber: '+91 98765 43210',
          ringtone: 'classic',
          uiStyle: 'classic',
          scriptJson: JSON.stringify([
            { line: 'Where are you right now? I am waiting downstairs.', pauseSeconds: 3 },
            { line: 'Okay, reach home quickly, it is already late.', pauseSeconds: 2 },
          ]),
          scheduledFor: new Date(Date.now() + 5000).toISOString(),
          ringSeconds: 30,
        }),
      });
      await apiFetch(`/api/fake-calls/${res.call.id}/arm`, { method: 'POST' });
      navigate(`/app/fake-call/standby/${res.call.id}`);
    } catch {
      navigate('/app/fake-call');
    }
  };

  if (!activeJourney) {
    return <div className="p-8 text-center text-sm text-text-muted">Loading journey telemetry...</div>;
  }

  const selectedRouteObj = activeJourney.route_json ? JSON.parse(activeJourney.route_json) : null;
  const destObj = activeJourney.dest_json ? JSON.parse(activeJourney.dest_json) : {};
  const userCoords: [number, number] = currentLocation
    ? [currentLocation.lat, currentLocation.lng]
    : [activeJourney.last_lat || 28.6139, activeJourney.last_lng || 77.2090];

  return (
    <>
      <Helmet>
        <title>Active Journey — Raksha</title>
      </Helmet>

      <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 pb-28 md:pb-12 space-y-4">
        {/* Header Telemetry Strip */}
        <div className="bg-surface border border-border rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider block">
              Heading to
            </span>
            <h2 className="font-heading font-bold text-base text-text">{destObj.label || 'Destination'}</h2>
          </div>

          <div className="flex items-center gap-2">
            <StatusChip level={riskLevel} score={riskScore} />

            <div className="flex items-center gap-1 text-xs text-text-muted px-2.5 py-1 bg-surface-raised rounded-lg border border-border">
              <Clock className="w-3.5 h-3.5" />
              <span>ETA: {activeJourney.planned_eta_ts ? format(new Date(activeJourney.planned_eta_ts), 'HH:mm') : '--:--'}</span>
            </div>
          </div>
        </div>

        {/* Live Journey Map */}
        <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm h-[45vh] md:h-[50vh]">
          <SafetyMap
            center={userCoords}
            zoom={15}
            userLocation={currentLocation}
            selectedRoute={selectedRouteObj}
            className="w-full h-full"
          />
        </div>

        {/* Sensor & Telemetry Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="p-2.5 bg-surface border border-border rounded-xl flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-primary" />
            <div>
              <span className="text-text font-semibold block">Shake SOS</span>
              <span className="text-[10px] text-safe font-medium">Active (3 shakes)</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => toggleVoice(!voiceEnabled)}
            className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-colors ${
              voiceEnabled ? 'bg-primary-soft border-primary' : 'bg-surface border-border'
            }`}
          >
            <Mic className={`w-4 h-4 ${voiceEnabled ? 'text-primary' : 'text-text-muted'}`} />
            <div>
              <span className="text-text font-semibold block">Voice SOS</span>
              <span className="text-[10px] text-text-muted">
                {voiceEnabled ? 'Listening ("help help")' : 'Tap to enable'}
              </span>
            </div>
          </button>

          <div className="p-2.5 bg-surface border border-border rounded-xl flex items-center gap-2">
            <Navigation className="w-4 h-4 text-emerald-600" />
            <div>
              <span className="text-text font-semibold block">GPS Confidence</span>
              <span className="text-[10px] font-medium text-safe">
                {(currentLocation?.acc || 10) > 100 ? 'Low' : (currentLocation?.acc || 10) > 30 ? 'Medium' : 'High (±10m)'}
              </span>
            </div>
          </div>

          <div className="p-2.5 bg-surface border border-border rounded-xl flex items-center gap-2">
            <Wifi className={`w-4 h-4 ${isOnline ? 'text-safe' : 'text-emergency'}`} />
            <div>
              <span className="text-text font-semibold block">Heartbeat</span>
              <span className={`text-[10px] font-medium ${isOnline ? 'text-safe' : 'text-emergency'}`}>
                {isOnline ? 'Synced' : 'Offline'}
              </span>
            </div>
          </div>
        </div>

        {/* Risk Explanations Panel */}
        {riskExplanations.length > 0 && (
          <div className="bg-surface border border-border rounded-2xl p-4 space-y-2">
            <span className="font-heading font-bold text-xs text-text block">Risk Engine Explanations</span>
            <div className="space-y-1.5">
              {riskExplanations.map((exp, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs text-text-muted">
                  <span>{exp.plainText}</span>
                  <span className="font-mono font-semibold text-caution">+{exp.points} pts</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Journey Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            onClick={() => navigate('/app/sos')}
            className="p-3 rounded-xl bg-emergency text-white font-bold text-xs flex items-center justify-center gap-2 shadow hover:bg-red-700 transition-colors"
          >
            <Shield className="w-4 h-4" />
            <span>EMERGENCY SOS</span>
          </button>

          <button
            onClick={handleFakeCallNow}
            className="p-3 rounded-xl bg-surface border border-border hover:border-primary text-text font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
          >
            <PhoneCall className="w-4 h-4 text-primary" />
            <span>Fake Call (5s)</span>
          </button>

          <button
            onClick={() => setPlannedStopOpen(true)}
            className="p-3 rounded-xl bg-surface border border-border hover:border-primary text-text font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
          >
            <Coffee className="w-4 h-4 text-amber-600" />
            <span>Planned Stop</span>
          </button>

          <button
            onClick={handleArrive}
            className="p-3 rounded-xl bg-safe text-white font-bold text-xs flex items-center justify-center gap-2 shadow hover:bg-emerald-700 transition-colors"
          >
            <CheckCircle className="w-4 h-4" />
            <span>I've Arrived</span>
          </button>
        </div>

        {/* PLANNED STOP MODAL */}
        {plannedStopOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-surface border border-border rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <h3 className="font-heading font-bold text-sm text-text">Pause Stop Alerts</h3>
                <button onClick={() => setPlannedStopOpen(false)}>
                  <X className="w-5 h-5 text-text-muted" />
                </button>
              </div>
              <p className="text-xs text-text-muted leading-relaxed">
                Taking a break? Registering a planned stop suppresses false unexpected stop alerts.
              </p>
              <div>
                <label className="block text-xs font-semibold text-text mb-1">Stop Reason</label>
                <input
                  type="text"
                  value={stopLabel}
                  onChange={(e) => setStopLabel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-input-bg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text mb-1">Duration (minutes)</label>
                <input
                  type="number"
                  min={5}
                  max={60}
                  value={stopMinutes}
                  onChange={(e) => setStopMinutes(parseInt(e.target.value) || 10)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-input-bg text-xs font-mono"
                />
              </div>
              <button
                onClick={handleAddPlannedStop}
                className="w-full py-2.5 bg-primary text-primary-foreground font-semibold text-xs rounded-xl"
              >
                Confirm Planned Stop
              </button>
            </div>
          </div>
        )}

        {/* SAFETY CHECK MODAL (§2.2 J7, WCAG alertdialog) */}
        {activeSafetyCheck && (
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="safety-check-title"
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <div className="bg-surface border-2 border-check rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 text-center animate-in zoom-in-95">
              <div className="w-16 h-16 rounded-full bg-check-bg text-check flex items-center justify-center mx-auto shadow-inner">
                <AlertOctagon className="w-10 h-10 animate-pulse" />
              </div>

              <div className="space-y-2">
                <h2 id="safety-check-title" className="font-heading font-extrabold text-2xl text-text">
                  Are you safe?
                </h2>
                <p className="text-xs text-text-muted leading-relaxed">
                  We noticed an unexpected stop or sustained route deviation. Please confirm you are okay. If you do not respond, emergency assistance will be coordinated.
                </p>
              </div>

              <div className="text-2xl font-heading font-black text-check font-mono">
                00:{checkCountdown < 10 ? `0${checkCountdown}` : checkCountdown}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => respondSafetyCheck('safe')}
                  className="py-3.5 bg-safe text-white font-heading font-bold text-sm rounded-xl shadow-md hover:bg-emerald-700 transition-colors"
                >
                  🟢 I'm Safe
                </button>

                <button
                  onClick={() => respondSafetyCheck('help')}
                  className="py-3.5 bg-emergency text-white font-heading font-bold text-sm rounded-xl shadow-md hover:bg-red-700 transition-colors"
                >
                  🔴 Need Help
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
