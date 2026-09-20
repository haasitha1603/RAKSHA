import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  Navigation,
  Shield,
  Sliders,
  Clock,
  Car,
  Footprints,
  Bike,
  AlertTriangle,
  Users,
  ChevronDown,
  ArrowRight,
  Sparkles,
  MapPin,
} from 'lucide-react';
import { SafetyMap } from '../../components/map/SafetyMap.js';
import { apiFetch } from '../../lib/api.js';
import { useJourneyStore } from '../../stores/journeyStore.js';
import { RouteOption, TravelMode, GuardianRow } from '@raksha/shared';
import { Helmet } from 'react-helmet-async';

export const PlanPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentLocation, setActiveJourney } = useJourneyStore();

  const [originLabel, setOriginLabel] = useState('My Location');
  const [originCoords, setOriginCoords] = useState<{ lat: number; lng: number }>({
    lat: currentLocation?.lat || 28.6139,
    lng: currentLocation?.lng || 77.2090,
  });

  const [destQuery, setDestQuery] = useState(searchParams.get('destLabel') || '');
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number } | null>(
    searchParams.get('destLat') && searchParams.get('destLng')
      ? { lat: parseFloat(searchParams.get('destLat')!), lng: parseFloat(searchParams.get('destLng')!) }
      : null
  );

  const [autocompleteResults, setAutocompleteResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [mode, setMode] = useState<TravelMode>('walk');
  const [safetyPriority, setSafetyPriority] = useState<number>(60);
  const [departTime, setDepartTime] = useState<'now' | 'custom'>('now');

  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RouteOption | null>(null);
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false);

  const [guardians, setGuardians] = useState<GuardianRow[]>([]);
  const [selectedGuardians, setSelectedGuardians] = useState<string[]>([]);
  const [guardianShareAgreed, setGuardianShareAgreed] = useState(true);

  // Cab details
  const [showCab, setShowCab] = useState(false);
  const [cabDetails, setCabDetails] = useState({ vehicleNumber: '', driverName: '', company: 'Uber' });

  // Fetch Guardians
  useEffect(() => {
    apiFetch<{ guardians: GuardianRow[] }>('/api/guardians')
      .then((res) => {
        setGuardians(res.guardians || []);
        // Pre-select accepted guardians
        setSelectedGuardians(res.guardians.filter((g) => g.status === 'accepted').map((g) => g.id));
      })
      .catch(() => {});
  }, []);

  // Sync origin with current location
  useEffect(() => {
    if (currentLocation) {
      setOriginCoords({ lat: currentLocation.lat, lng: currentLocation.lng });
    }
  }, [currentLocation]);

  // Autocomplete debounced search
  useEffect(() => {
    if (destQuery.trim().length < 3) {
      setAutocompleteResults([]);
      return;
    }

    const timer = setTimeout(() => {
      setIsSearching(true);
      apiFetch<any>(`/api/geocode?q=${encodeURIComponent(destQuery)}`)
        .then((res) => {
          setAutocompleteResults(res.results || []);
          setIsSearching(false);
        })
        .catch(() => setIsSearching(false));
    }, 500);

    return () => clearTimeout(timer);
  }, [destQuery]);

  // Request routes when both origin and destination are set
  useEffect(() => {
    if (!originCoords || !destCoords) return;

    setIsLoadingRoutes(true);
    apiFetch<{ routes: RouteOption[] }>('/api/routes/plan', {
      method: 'POST',
      body: JSON.stringify({
        origin: { lat: originCoords.lat, lng: originCoords.lng, label: originLabel },
        destination: { lat: destCoords.lat, lng: destCoords.lng, label: destQuery || 'Destination' },
        mode,
        safetyPriority,
      }),
    })
      .then((res) => {
        setRoutes(res.routes || []);
        if (res.routes && res.routes.length > 0) {
          // Select Recommended or first route
          const rec = res.routes.find((r) => r.badges.includes('Recommended')) || res.routes[0];
          setSelectedRoute(rec);
        }
        setIsLoadingRoutes(false);
      })
      .catch((err) => {
        console.error('Failed to plan routes:', err);
        setIsLoadingRoutes(false);
      });
  }, [originCoords, destCoords, mode, safetyPriority]);

  const handleSelectAutocomplete = (item: any) => {
    setDestCoords({ lat: item.lat, lng: item.lng });
    setDestQuery(item.label.split(',')[0]);
    setAutocompleteResults([]);
  };

  const handleStartJourney = async () => {
    if (!selectedRoute || !destCoords) return;

    const plannedEta = new Date(Date.now() + selectedRoute.durationS * 1000).toISOString();

    try {
      const res = await apiFetch<{ journeyId: string }>('/api/journeys', {
        method: 'POST',
        body: JSON.stringify({
          mode,
          origin: { lat: originCoords.lat, lng: originCoords.lng, label: originLabel },
          destination: { lat: destCoords.lat, lng: destCoords.lng, label: destQuery },
          selectedRoute: selectedRoute,
          plannedEta,
          guardianIds: guardianShareAgreed ? selectedGuardians : [],
          cab: showCab ? cabDetails : undefined,
          timingProfile: 'production',
        }),
      });

      // Start journey
      await apiFetch(`/api/journeys/${res.journeyId}/start`, { method: 'POST' });

      // Fetch active journey and store
      const activeRes = await apiFetch<any>(`/api/journeys/${res.journeyId}`);
      setActiveJourney(activeRes.journey);

      navigate(`/app/journey/${res.journeyId}`);
    } catch (err) {
      console.error('Failed to start journey:', err);
    }
  };

  return (
    <>
      <Helmet>
        <title>Plan Safe Route — Raksha</title>
      </Helmet>

      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 pb-24 md:pb-10 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left / Top Controls Panel */}
        <div className="lg:col-span-6 space-y-5">
          <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm space-y-4">
            <h1 className="font-heading font-bold text-xl text-text">Plan a Safer Journey</h1>

            {/* Inputs */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1">Starting Point</label>
                <div className="flex items-center gap-2 p-2.5 bg-input-bg border border-border rounded-xl text-sm">
                  <div className="w-2.5 h-2.5 rounded-full bg-safe ml-1" />
                  <span className="text-text font-medium flex-1">{originLabel}</span>
                </div>
              </div>

              <div className="relative">
                <label className="block text-xs font-semibold text-text-muted mb-1">Destination</label>
                <div className="flex items-center gap-2 p-2.5 bg-input-bg border border-border rounded-xl text-sm focus-within:ring-2 focus-within:ring-primary">
                  <MapPin className="w-4 h-4 text-emergency ml-1 flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="Search destination (min 3 chars)..."
                    value={destQuery}
                    onChange={(e) => setDestQuery(e.target.value)}
                    className="w-full bg-transparent text-text text-sm focus:outline-none"
                  />
                  {isSearching && <span className="text-xs text-text-muted">...</span>}
                </div>

                {/* Autocomplete Dropdown */}
                {autocompleteResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-30 bg-surface border border-border rounded-xl shadow-xl mt-1 overflow-hidden">
                    {autocompleteResults.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectAutocomplete(item)}
                        className="w-full text-left px-3.5 py-2.5 hover:bg-surface-raised border-b border-border last:border-0 text-xs text-text flex items-center gap-2"
                      >
                        <MapPin className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Mode Selector */}
            <div className="grid grid-cols-4 gap-2 pt-1">
              {[
                { id: 'walk', label: 'Walk', icon: Footprints },
                { id: 'two-wheeler', label: 'Bike', icon: Bike },
                { id: 'car', label: 'Cab/Car', icon: Car },
                { id: 'transit', label: 'Transit', icon: Navigation },
              ].map((m) => {
                const Icon = m.icon;
                const isSelected = mode === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id as TravelMode)}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-colors ${
                      isSelected
                        ? 'border-primary bg-primary-soft text-primary'
                        : 'border-border bg-surface text-text-muted hover:text-text'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Safety Priority Slider (§2.1 N3) */}
            <div className="pt-2 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-text flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-primary" />
                  <span>Safety Priority vs Speed</span>
                </span>
                <span className="text-primary font-mono">{safetyPriority}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={safetyPriority}
                onChange={(e) => setSafetyPriority(parseInt(e.target.value))}
                className="w-full accent-primary h-2 bg-border rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-text-muted">
                <span>Fastest route</span>
                <span>Balanced (60%)</span>
                <span>Safest path</span>
              </div>
            </div>
          </div>

          {/* Route Alternatives Cards */}
          {isLoadingRoutes ? (
            <div className="p-8 text-center bg-surface border border-border rounded-2xl text-xs text-text-muted animate-pulse">
              Computing safety factors &amp; lighting scores...
            </div>
          ) : routes.length > 0 ? (
            <div className="space-y-3">
              <h3 className="font-heading font-bold text-sm text-text">Route Options</h3>

              {routes.map((route) => {
                const isSelected = selectedRoute?.id === route.id;
                const minutes = Math.round(route.durationS / 60);
                const km = (route.distanceM / 1000).toFixed(1);

                return (
                  <div
                    key={route.id}
                    onClick={() => setSelectedRoute(route)}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all bg-surface space-y-3 ${
                      isSelected
                        ? 'border-primary shadow-md'
                        : 'border-border hover:border-primary/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-heading font-bold text-base text-text">
                            {route.name}
                          </span>
                          {route.badges.map((b) => (
                            <span
                              key={b}
                              className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                                b === 'Recommended'
                                  ? 'bg-primary text-white'
                                  : b === 'Safest'
                                  ? 'bg-safe text-white'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {b}
                            </span>
                          ))}
                        </div>
                        <div className="text-xs text-text-muted mt-0.5">
                          {km} km &bull; ~{minutes} mins
                        </div>
                      </div>

                      {/* Safety Score Ring */}
                      <div className="text-right">
                        <div
                          className={`text-xl font-heading font-extrabold ${
                            route.safetyScore >= 75
                              ? 'text-safe'
                              : route.safetyScore >= 50
                              ? 'text-caution'
                              : 'text-emergency'
                          }`}
                        >
                          {route.safetyScore}
                          <span className="text-xs text-text-muted font-normal">/100</span>
                        </div>
                        <span className="text-[10px] text-text-muted block">Safety Score</span>
                      </div>
                    </div>

                    {/* Risky Stretches in Plain Words */}
                    {route.riskySegments.length > 0 && (
                      <div className="p-2.5 rounded-xl bg-caution-bg/40 border border-caution/30 text-xs space-y-1">
                        <div className="font-semibold text-caution flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Identified Risky Stretches:</span>
                        </div>
                        <ul className="list-disc list-inside text-text-muted space-y-0.5 text-[11px]">
                          {route.riskySegments.map((rs, idx) => (
                            <li key={idx}>{rs.description}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* "Why this route?" Factor Breakdown Bars (§2.1 N5) */}
                    {isSelected && (
                      <div className="pt-2 border-t border-border space-y-2 text-xs">
                        <span className="font-semibold text-text block">Safety Factors Analysis</span>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                          <div>
                            <div className="flex justify-between text-text-muted">
                              <span>Lighting</span>
                              <span>{Math.round((1 - route.factors.lightingRisk) * 100)}%</span>
                            </div>
                            <div className="w-full bg-border h-1.5 rounded-full overflow-hidden mt-0.5">
                              <div
                                className="bg-amber-500 h-full"
                                style={{ width: `${(1 - route.factors.lightingRisk) * 100}%` }}
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-text-muted">
                              <span>Population / Activity</span>
                              <span>{Math.round((1 - route.factors.isolationRisk) * 100)}%</span>
                            </div>
                            <div className="w-full bg-border h-1.5 rounded-full overflow-hidden mt-0.5">
                              <div
                                className="bg-blue-500 h-full"
                                style={{ width: `${(1 - route.factors.isolationRisk) * 100}%` }}
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-text-muted">
                              <span>Incident History</span>
                              <span>{Math.round((1 - route.factors.incidentRisk) * 100)}% clean</span>
                            </div>
                            <div className="w-full bg-border h-1.5 rounded-full overflow-hidden mt-0.5">
                              <div
                                className="bg-safe h-full"
                                style={{ width: `${(1 - route.factors.incidentRisk) * 100}%` }}
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-text-muted">
                              <span>Emergency Coverage</span>
                              <span>{Math.round(route.factors.coverage * 100)}%</span>
                            </div>
                            <div className="w-full bg-border h-1.5 rounded-full overflow-hidden mt-0.5">
                              <div
                                className="bg-purple-500 h-full"
                                style={{ width: `${route.factors.coverage * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : null}

          {/* Cab Details Toggle */}
          <div className="bg-surface border border-border rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text flex items-center gap-2">
                <Car className="w-4 h-4 text-primary" />
                <span>Taking a Cab / Auto?</span>
              </span>
              <button
                type="button"
                onClick={() => setShowCab(!showCab)}
                className="text-xs text-primary font-semibold hover:underline"
              >
                {showCab ? 'Hide Details' : '+ Add Cab Details'}
              </button>
            </div>

            {showCab && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                <input
                  type="text"
                  placeholder="Vehicle No (e.g. DL-01-1234)"
                  value={cabDetails.vehicleNumber}
                  onChange={(e) => setCabDetails({ ...cabDetails, vehicleNumber: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-border bg-input-bg text-xs"
                />
                <input
                  type="text"
                  placeholder="Driver Name"
                  value={cabDetails.driverName}
                  onChange={(e) => setCabDetails({ ...cabDetails, driverName: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-border bg-input-bg text-xs"
                />
                <select
                  value={cabDetails.company}
                  onChange={(e) => setCabDetails({ ...cabDetails, company: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-border bg-input-bg text-xs"
                >
                  <option value="Uber">Uber</option>
                  <option value="Ola">Ola</option>
                  <option value="Rapido">Rapido</option>
                  <option value="Auto">Auto Rickshaw</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            )}
          </div>

          {/* Guardian Sharing Consent & Selection (§7.5) */}
          <div className="bg-surface border border-border rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-text">
              <Users className="w-4 h-4 text-primary" />
              <span>Share Live Telemetry with Guardians</span>
            </div>

            {guardians.length > 0 ? (
              <div className="space-y-2">
                {guardians.map((g) => (
                  <label key={g.id} className="flex items-center justify-between text-xs cursor-pointer">
                    <span className="text-text font-medium">
                      {g.name} ({g.relation})
                    </span>
                    <input
                      type="checkbox"
                      checked={selectedGuardians.includes(g.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedGuardians([...selectedGuardians, g.id]);
                        } else {
                          setSelectedGuardians(selectedGuardians.filter((id) => id !== g.id));
                        }
                      }}
                      className="rounded accent-primary"
                    />
                  </label>
                ))}

                <label className="flex items-start gap-2 pt-2 border-t border-border cursor-pointer">
                  <input
                    type="checkbox"
                    checked={guardianShareAgreed}
                    onChange={(e) => setGuardianShareAgreed(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded accent-primary"
                  />
                  <span className="text-[11px] text-text-muted leading-tight">
                    I agree to share my live location and cab details with the selected guardians until I safely arrive.
                  </span>
                </label>
              </div>
            ) : (
              <p className="text-xs text-text-muted">
                No guardians added yet.{' '}
                <button onClick={() => navigate('/app/guardians')} className="text-primary underline">
                  Add a guardian
                </button>
              </p>
            )}
          </div>

          {/* Start Journey CTA */}
          <button
            onClick={handleStartJourney}
            disabled={!selectedRoute}
            className="w-full py-4 bg-primary hover:bg-primary-hover text-primary-foreground font-heading font-bold text-base rounded-2xl shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <span>Start Monitored Journey</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        {/* Right Map Preview */}
        <div className="lg:col-span-6 bg-surface border border-border rounded-2xl overflow-hidden shadow-sm h-[50vh] lg:h-auto min-h-[450px]">
          <SafetyMap
            center={[originCoords.lat, originCoords.lng]}
            zoom={13}
            selectedRoute={selectedRoute}
            routes={routes}
            onSelectRoute={(r) => setSelectedRoute(r)}
            className="w-full h-full"
          />
        </div>
      </div>
    </>
  );
};
