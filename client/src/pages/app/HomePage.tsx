import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Search,
  Shield,
  PhoneCall,
  Navigation,
  Share2,
  AlertTriangle,
  MapPin,
  ArrowRight,
  Battery,
  WifiOff,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { SafetyMap } from '../../components/map/SafetyMap.js';
import { SpotlightCard } from '../../components/ui/SpotlightCard.js';
import { HoldButton } from '../../components/ui/HoldButton.js';
import { useJourneyStore } from '../../stores/journeyStore.js';
import { useAuthStore } from '../../stores/authStore.js';
import { useSosStore } from '../../stores/sosStore.js';
import { apiFetch } from '../../lib/api.js';
import { FacilityRow, RiskZoneRow, ReportRow, GuardianRow } from '@raksha/shared';
import { Helmet } from 'react-helmet-async';

interface RecentDestination {
  label: string;
  lat: number;
  lng: number;
}

interface SafetyPointData {
  score: number;
  label: 'High' | 'Moderate' | 'Low';
  summary: string;
  lightingDesc?: string;
  openFacilitiesCount?: number;
}

interface ScheduledFakeCall {
  id: string;
  callerName: string;
  scheduledFor: string;
}

const DEFAULT_RECENTS: RecentDestination[] = [
  { label: 'Connaught Place, New Delhi', lat: 28.6315, lng: 77.2167 },
  { label: 'Hauz Khas Village, New Delhi', lat: 28.5494, lng: 77.1932 },
  { label: 'India Gate, New Delhi', lat: 28.6129, lng: 77.2295 },
];

export const HomePage: React.FC = () => {
  const { user } = useAuthStore();
  const { activeJourney, setActiveJourney, currentLocation, setCurrentLocation } = useJourneyStore();
  const { triggerSos } = useSosStore();
  const navigate = useNavigate();

  // 1. Greeting & status states
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [geoPermission, setGeoPermission] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');

  // 2. Search & Recents states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recentDestinations, setRecentDestinations] = useState<RecentDestination[]>(() => {
    try {
      const stored = localStorage.getItem('raksha_recent_destinations');
      return stored ? JSON.parse(stored) : DEFAULT_RECENTS;
    } catch {
      return DEFAULT_RECENTS;
    }
  });

  // 3 & 4. Map & Safety Point states
  const [layersData, setLayersData] = useState<{
    riskZones: RiskZoneRow[];
    reports: ReportRow[];
    facilities: FacilityRow[];
  }>({ riskZones: [], reports: [], facilities: [] });
  const [safetyPoint, setSafetyPoint] = useState<SafetyPointData | null>(null);

  // 7. Guardians state
  const [guardians, setGuardians] = useState<GuardianRow[]>([]);

  // 8. Next Scheduled Fake Call state
  const [nextFakeCall, setNextFakeCall] = useState<ScheduledFakeCall | null>(null);
  const [fakeCallRemaining, setFakeCallRemaining] = useState<string | null>(null);

  // Online / Offline listener
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Battery status observer
  useEffect(() => {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(Math.round(battery.level * 100));
        const onLevelChange = () => setBatteryLevel(Math.round(battery.level * 100));
        battery.addEventListener('levelchange', onLevelChange);
        return () => battery.removeEventListener('levelchange', onLevelChange);
      }).catch(() => {});
    }
  }, []);

  // Data loading (Journey, Layers, Safety Point, Guardians, Fake Calls)
  useEffect(() => {
    // Check active journey
    apiFetch<{ journey: any }>('/api/journeys/active')
      .then((res) => {
        if (res.journey) setActiveJourney(res.journey);
      })
      .catch(() => {});

    // Fetch layers
    apiFetch<any>('/api/safety/layers')
      .then((res) => {
        setLayersData({
          riskZones: res.riskZones || [],
          reports: res.reports || [],
          facilities: res.facilities || [],
        });
      })
      .catch(() => {});

    // Fetch guardians
    apiFetch<{ guardians: GuardianRow[] }>('/api/guardians')
      .then((res) => {
        setGuardians(res.guardians || []);
      })
      .catch(() => {});

    // Fetch fake calls for scheduled countdown
    apiFetch<{ calls: any[] }>('/api/fake-calls')
      .then((res) => {
        const scheduled = (res.calls || []).find(
          (c) => c.status === 'scheduled' && new Date(c.scheduled_for).getTime() > Date.now()
        );
        if (scheduled) {
          setNextFakeCall({
            id: scheduled.id,
            callerName: scheduled.caller_name,
            scheduledFor: scheduled.scheduled_for,
          });
        }
      })
      .catch(() => {});

    // Check geolocation permission query
    if ('permissions' in navigator) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((status) => {
          setGeoPermission(status.state as any);
          status.onchange = () => setGeoPermission(status.state as any);
        })
        .catch(() => {});
    }

    // Request GPS location
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGeoPermission('granted');
          const loc = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            acc: pos.coords.accuracy,
            speed: pos.coords.speed,
            heading: pos.coords.heading,
            ts: new Date().toISOString(),
          };
          setCurrentLocation(loc);

          // Fetch area safety point
          apiFetch<SafetyPointData>(`/api/safety/point?lat=${loc.lat}&lng=${loc.lng}`)
            .then(setSafetyPoint)
            .catch(() => {});
        },
        () => {
          setGeoPermission('denied');
          // Fallback to Delhi default
          const fallback = {
            lat: 28.6139,
            lng: 77.2090,
            acc: 15,
            speed: 0,
            heading: 0,
            ts: new Date().toISOString(),
          };
          setCurrentLocation(fallback);
          apiFetch<SafetyPointData>(`/api/safety/point?lat=${fallback.lat}&lng=${fallback.lng}`)
            .then(setSafetyPoint)
            .catch(() => {});
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, [setActiveJourney, setCurrentLocation]);

  // Scheduled fake call live countdown
  useEffect(() => {
    if (!nextFakeCall) return;

    const interval = window.setInterval(() => {
      const diffMs = new Date(nextFakeCall.scheduledFor).getTime() - Date.now();
      if (diffMs <= 0) {
        setFakeCallRemaining('Now');
        clearInterval(interval);
      } else {
        const mins = Math.floor(diffMs / 60000);
        const secs = Math.floor((diffMs % 60000) / 1000);
        setFakeCallRemaining(`${mins}m ${secs.toString().padStart(2, '0')}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [nextFakeCall]);

  const handleCancelFakeCall = async () => {
    if (!nextFakeCall) return;
    try {
      await apiFetch(`/api/fake-calls/${nextFakeCall.id}`, { method: 'DELETE' });
      setNextFakeCall(null);
    } catch {}
  };

  // Search geocoding
  const searchTimeoutRef = useRef<number | null>(null);
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (val.trim().length >= 3) {
      setIsSearching(true);
      searchTimeoutRef.current = window.setTimeout(async () => {
        try {
          const res = await apiFetch<{ results: any[] }>(`/api/geocode?q=${encodeURIComponent(val)}`);
          setSearchResults(res.results || []);
        } catch {
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      }, 400);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  };

  const selectDestination = (dest: { label: string; lat: number; lng: number }) => {
    // Save to recents (max 3, unique)
    const updated = [dest, ...recentDestinations.filter((r) => r.label !== dest.label)].slice(0, 3);
    setRecentDestinations(updated);
    try {
      localStorage.setItem('raksha_recent_destinations', JSON.stringify(updated));
    } catch {}

    navigate(
      `/app/plan?destLat=${dest.lat}&destLng=${dest.lng}&destLabel=${encodeURIComponent(dest.label)}`
    );
  };

  // Greeting helper
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getStatusSubtitle = () => {
    const readyGuardians = guardians.filter((g) => g.status === 'accepted').length;
    if (geoPermission === 'denied') {
      return 'Location is off — turn it on to start a journey';
    }
    if (guardians.length === 0 || readyGuardians === 0) {
      return 'No guardian added yet — add one before you travel';
    }
    return `Location is on · ${readyGuardians} guardian${readyGuardians > 1 ? 's' : ''} ready`;
  };

  const userCoords: [number, number] = currentLocation
    ? [currentLocation.lat, currentLocation.lng]
    : [28.6139, 77.2090];

  const handleQuickSos = async () => {
    const loc = currentLocation || { lat: 28.6139, lng: 77.2090, acc: 15 };
    try {
      await triggerSos({
        journeyId: activeJourney?.id,
        trigger: 'hold',
        discreet: false,
        location: loc,
      });
      navigate('/app/sos');
    } catch {
      navigate('/app/sos');
    }
  };

  const handleQuickFakeCall = async () => {
    try {
      const res = await apiFetch<any>('/api/fake-calls', {
        method: 'POST',
        body: JSON.stringify({
          callerName: 'Home',
          callerNumber: '+91 98765 43210',
          ringtone: 'classic',
          uiStyle: 'classic',
          scriptJson: JSON.stringify([
            { line: 'Where are you right now? It is late.', pauseSeconds: 3 },
            { line: 'I am waiting by the gate. Call me as soon as you reach.', pauseSeconds: 2 },
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

  return (
    <>
      <Helmet>
        <title>Dashboard — Raksha Safe Route &amp; Emergency</title>
      </Helmet>

      <div className="space-y-4 max-w-5xl mx-auto px-3 sm:px-6 pb-24 md:pb-12 pt-3">
        {/* 1. GREETING HEADER */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-surface border border-border p-4 rounded-2xl shadow-sm min-w-0 [overflow-wrap:anywhere]">
          <div>
            <h1 className="font-heading font-extrabold text-xl sm:text-2xl text-text">
              {getGreeting()}, {user?.displayName || 'Traveller'}
            </h1>
            <p className="text-xs text-text-muted mt-0.5">
              {getStatusSubtitle()}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {batteryLevel !== null && (
              <div
                className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border ${
                  batteryLevel < 20
                    ? 'bg-red-500/10 text-red-500 border-red-500/30'
                    : 'bg-surface-raised text-text border-border'
                }`}
              >
                <Battery className="w-3.5 h-3.5" />
                <span>{batteryLevel}%</span>
              </div>
            )}

            {isOffline && (
              <div className="px-2.5 py-1 rounded-full bg-caution/15 text-caution border border-caution/30 text-xs font-semibold flex items-center gap-1.5">
                <WifiOff className="w-3.5 h-3.5" />
                <span>Offline</span>
              </div>
            )}
          </div>
        </div>

        {/* 8. NEXT SCHEDULED FAKE CALL CHIP (if scheduled) */}
        {nextFakeCall && (
          <div className="p-3 bg-primary-soft/80 border border-primary/30 rounded-xl flex items-center justify-between gap-3 shadow-sm animate-pulse min-w-0 [overflow-wrap:anywhere]">
            <div className="flex items-center gap-2.5 text-xs text-text">
              <Clock className="w-4 h-4 text-primary shrink-0" />
              <span>
                Fake call from <strong>{nextFakeCall.callerName}</strong> in{' '}
                <span className="font-mono font-bold text-primary">{fakeCallRemaining || '...'}</span>
              </span>
            </div>
            <button
              onClick={handleCancelFakeCall}
              className="text-xs px-2.5 py-1 bg-surface border border-border hover:border-emergency hover:text-emergency rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {/* 6. ACTIVE JOURNEY CARD (only when journey active) */}
        {activeJourney && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-primary to-[#8B5CF6] text-white shadow-lg space-y-3 min-w-0 [overflow-wrap:anywhere]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-300 animate-ping" />
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-100">
                  Active Journey
                </span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 font-medium">
                Level {activeJourney.level || 0} Normal
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold truncate max-w-md">
                  Heading to {JSON.parse(activeJourney.dest_json || '{}').label || 'Destination'}
                </p>
                <p className="text-xs text-white/80 mt-0.5">
                  Planned ETA:{' '}
                  {activeJourney.planned_eta_ts
                    ? new Date(activeJourney.planned_eta_ts).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'En Route'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate(`/app/journey/${activeJourney.id}`)}
                  className="px-3.5 py-2 bg-white text-primary text-xs font-bold rounded-xl shadow hover:bg-white/90 transition-colors flex items-center gap-1.5"
                >
                  <span>Open Live Map</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. "WHERE TO?" SEARCH INPUT & RECENTS */}
        <div className="bg-surface border border-border p-4 rounded-2xl shadow-sm space-y-3 min-w-0 [overflow-wrap:anywhere]">
          <div className="relative">
            <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Where to? Search destination..."
              className="w-full pl-10 pr-4 py-2.5 bg-input-bg border border-border rounded-xl text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-[#B727F5]"
            />
            {isSearching && (
              <div className="absolute right-3.5 top-3.5 w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            )}
          </div>

          {/* Autocomplete Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="divide-y divide-border border border-border rounded-xl bg-surface overflow-hidden">
              {searchResults.map((result, idx) => (
                <button
                  key={idx}
                  onClick={() =>
                    selectDestination({
                      label: result.label,
                      lat: result.lat,
                      lng: result.lng,
                    })
                  }
                  className="w-full text-left p-3 hover:bg-surface-raised flex items-center gap-2.5 transition-colors text-xs"
                >
                  <MapPin className="w-4 h-4 text-primary shrink-0" />
                  <span className="truncate text-text font-medium">{result.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Recent Destinations (max 3) */}
          {searchResults.length === 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs text-text-muted font-medium">Recent:</span>
              {recentDestinations.slice(0, 3).map((dest, idx) => (
                <button
                  key={idx}
                  onClick={() => selectDestination(dest)}
                  className="px-2.5 py-1 bg-surface-raised hover:bg-primary-soft hover:text-primary border border-border rounded-lg text-xs text-text truncate max-w-[200px] transition-colors"
                >
                  {dest.label.split(',')[0]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 3. LIVE MAP (Leaflet, clamped 260px to 520px) & 4. AREA SAFETY CHIP */}
        <div className="space-y-2">
          {/* Area Safety Summary Chip */}
          {safetyPoint && (
            <div className="flex items-center justify-between p-3 bg-surface border border-border rounded-xl text-xs shadow-sm min-w-0 [overflow-wrap:anywhere]">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    safetyPoint.score >= 75
                      ? 'bg-emerald-500'
                      : safetyPoint.score >= 50
                      ? 'bg-amber-500'
                      : 'bg-red-500'
                  }`}
                />
                <span className="font-bold text-text">
                  Area safety: {safetyPoint.label} ({safetyPoint.score}/100)
                </span>
                <span className="hidden sm:inline text-text-muted">— {safetyPoint.summary}</span>
              </div>
              <button
                onClick={() => navigate('/app/plan')}
                className="text-primary hover:underline font-semibold text-xs shrink-0"
              >
                Inspect
              </button>
            </div>
          )}

          <div
            className="relative bg-surface border border-border rounded-2xl overflow-hidden shadow-sm min-w-0 [overflow-wrap:anywhere]"
            style={{ height: 'clamp(260px, 42dvh, 520px)' }}
          >
            <SafetyMap
              center={userCoords}
              zoom={14}
              userLocation={currentLocation}
              riskZones={layersData.riskZones}
              reports={layersData.reports}
              facilities={layersData.facilities}
              className="w-full h-full"
            />

            {/* Bottom-right corner safety score badge */}
            <div className="absolute bottom-4 right-4 z-20 bg-surface/90 backdrop-blur-md border border-border px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#B727F5]" />
              <div className="text-right">
                <div className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Safety Score</div>
                <div className="text-sm font-extrabold text-text font-mono">
                  {safetyPoint ? `${safetyPoint.score}/100` : '80/100'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 5. QUICK ACTIONS (2x2 Grid with Kokonut Spotlight & Red SOS) */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <SpotlightCard
            onClick={() => navigate('/app/plan')}
            className="cursor-pointer flex flex-col justify-between h-32 group min-w-0 [overflow-wrap:anywhere]"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <div className="font-heading font-bold text-sm sm:text-base text-text">Plan Safer Route</div>
              <div className="text-xs text-text-muted mt-0.5">Ranked by street lighting &amp; safety</div>
            </div>
          </SpotlightCard>

          <SpotlightCard
            onClick={handleQuickFakeCall}
            className="cursor-pointer flex flex-col justify-between h-32 group min-w-0 [overflow-wrap:anywhere]"
          >
            <div className="w-10 h-10 rounded-xl bg-[#B727F5]/10 text-[#B727F5] flex items-center justify-center group-hover:scale-105 transition-transform">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <div className="font-heading font-bold text-sm sm:text-base text-text">Discreet Fake Call</div>
              <div className="text-xs text-text-muted mt-0.5">Realistic spoken conversational exit</div>
            </div>
          </SpotlightCard>

          <SpotlightCard
            onClick={() => navigate('/app/reports')}
            className="cursor-pointer flex flex-col justify-between h-32 group min-w-0 [overflow-wrap:anywhere]"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-105 transition-transform">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="font-heading font-bold text-sm sm:text-base text-text">Community Report</div>
              <div className="text-xs text-text-muted mt-0.5">Crowdsourced hazards &amp; dark spots</div>
            </div>
          </SpotlightCard>

          {/* SOS Hold Button */}
          <HoldButton
            onTrigger={handleQuickSos}
            holdDurationMs={3000}
            label="EMERGENCY SOS"
            sublabel="HOLD 3s"
            className="h-32 min-w-0 [overflow-wrap:anywhere]"
          />
        </div>

        {/* 7. GUARDIANS STRIP */}
        <div className="bg-surface border border-border p-4 rounded-2xl shadow-sm space-y-3 min-w-0 [overflow-wrap:anywhere]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Share2 className="w-4 h-4 text-primary" />
              <h2 className="font-heading font-bold text-sm text-text">Guardians</h2>
            </div>
            <Link
              to="/app/guardians"
              className="text-xs text-primary font-semibold hover:underline"
            >
              Manage
            </Link>
          </div>

          <div className="flex items-center gap-3 overflow-x-auto py-1">
            {guardians.map((g) => (
              <div
                key={g.id}
                className="flex items-center gap-2 px-3 py-2 bg-surface-raised border border-border rounded-xl shrink-0"
              >
                <div className="relative">
                  <div className="w-7 h-7 rounded-full bg-primary-soft text-primary font-bold text-xs flex items-center justify-center">
                    {g.name[0]?.toUpperCase() || 'G'}
                  </div>
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-surface ${
                      g.status === 'accepted' ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                    title={g.status === 'accepted' ? 'Active & verified' : 'Pending acceptance'}
                  />
                </div>
                <div className="text-xs">
                  <span className="font-semibold text-text block">{g.name}</span>
                  <span className="text-[10px] text-text-muted">{g.relation}</span>
                </div>
              </div>
            ))}

            {guardians.length < 3 && (
              <button
                onClick={() => navigate('/app/guardians')}
                className="flex items-center gap-1.5 px-3 py-2 border border-dashed border-border hover:border-primary rounded-xl text-xs font-semibold text-text-muted hover:text-primary transition-colors shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Guardian</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
