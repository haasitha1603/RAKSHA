import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Search,
  Shield,
  PhoneCall,
  Navigation,
  Share2,
  AlertCircle,
  MapPin,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { SafetyMap } from '../../components/map/SafetyMap.js';
import { useJourneyStore } from '../../stores/journeyStore.js';
import { apiFetch } from '../../lib/api.js';
import { FacilityRow, RiskZoneRow, ReportRow } from '@raksha/shared';
import { Helmet } from 'react-helmet-async';
import { PrototypeDisclaimer } from '../../components/common/PrototypeDisclaimer.js';

export const HomePage: React.FC = () => {
  const [layersData, setLayersData] = useState<{
    riskZones: RiskZoneRow[];
    reports: ReportRow[];
    facilities: FacilityRow[];
  }>({ riskZones: [], reports: [], facilities: [] });
  const [nearestSafePlace, setNearestSafePlace] = useState<FacilityRow | null>(null);

  const { activeJourney, setActiveJourney, currentLocation, setCurrentLocation } = useJourneyStore();
  const navigate = useNavigate();

  useEffect(() => {
    // Check active journey on server
    apiFetch<{ journey: any }>('/api/journeys/active')
      .then((res) => {
        if (res.journey) {
          setActiveJourney(res.journey);
        }
      })
      .catch(() => {});

    // Fetch safety layers
    apiFetch<any>('/api/safety/layers')
      .then((res) => {
        setLayersData({
          riskZones: res.riskZones || [],
          reports: res.reports || [],
          facilities: res.facilities || [],
        });
      })
      .catch(() => {});

    // Request GPS location
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            acc: pos.coords.accuracy,
            speed: pos.coords.speed,
            heading: pos.coords.heading,
            ts: new Date().toISOString(),
          };
          setCurrentLocation(loc);

          // Find nearest safe place
          apiFetch<any>(`/api/facilities/nearby?lat=${loc.lat}&lng=${loc.lng}&types=safe_place&radius=5000`)
            .then((res) => {
              if (res.facilities && res.facilities.length > 0) {
                setNearestSafePlace(res.facilities[0]);
              }
            })
            .catch(() => {});
        },
        () => {
          // Default Delhi coords if GPS denied
          setCurrentLocation({
            lat: 28.6139,
            lng: 77.2090,
            acc: 15,
            speed: 0,
            heading: 0,
            ts: new Date().toISOString(),
          });
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, [setActiveJourney, setCurrentLocation]);

  const userCoords: [number, number] = currentLocation
    ? [currentLocation.lat, currentLocation.lng]
    : [28.6139, 77.2090];

  const handleQuickFakeCall = async () => {
    try {
      const res = await apiFetch<any>('/api/fake-calls', {
        method: 'POST',
        body: JSON.stringify({
          callerName: 'Mom',
          callerNumber: '+91 98765 43210',
          ringtone: 'classic',
          uiStyle: 'classic',
          scriptJson: JSON.stringify([
            { line: 'Beta, where have you reached? Please come home soon.', pauseSeconds: 3 },
            { line: 'Your brother is waiting downstairs. Call me as soon as you are near.', pauseSeconds: 2 },
          ]),
          scheduledFor: new Date(Date.now() + 5000).toISOString(),
          ringSeconds: 30,
        }),
      });
      // Arm call and route to standby
      await apiFetch(`/api/fake-calls/${res.call.id}/arm`, { method: 'POST' });
      navigate(`/app/fake-call/standby/${res.call.id}`);
    } catch {
      navigate('/app/fake-call');
    }
  };

  return (
    <>
      <Helmet>
        <title>Safety Map &amp; Navigation — Raksha</title>
      </Helmet>

      <div className="space-y-4 max-w-5xl mx-auto px-3 sm:px-6 pb-20 md:pb-8 pt-3">
        <PrototypeDisclaimer />

        {/* Active Journey Resume Card */}
        {activeJourney && (
          <div className="bg-primary text-white p-4 rounded-2xl shadow-lg flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-ping" />
                <span className="text-xs font-bold uppercase tracking-wider">Journey in Progress</span>
              </div>
              <p className="text-sm font-semibold">
                Traveling to {JSON.parse(activeJourney.dest_json || '{}').label || 'Destination'}
              </p>
            </div>
            <button
              onClick={() => navigate(`/app/journey/${activeJourney.id}`)}
              className="px-4 py-2 bg-white text-primary text-xs font-bold rounded-xl shadow hover:bg-white/90 transition-colors flex items-center gap-1.5 flex-shrink-0"
            >
              <span>Resume</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* "Where to?" Search Bar CTA */}
        <div
          onClick={() => navigate('/app/plan')}
          className="bg-surface border border-border p-3.5 rounded-2xl shadow-sm hover:border-primary cursor-pointer transition-colors flex items-center gap-3 group"
        >
          <div className="w-10 h-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
            <Search className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-bold text-text">Where are you heading?</div>
            <div className="text-xs text-text-muted">Find routes ranked by safety &amp; lighting</div>
          </div>
          <div className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg">
            Plan Route
          </div>
        </div>

        {/* Safety Map with Layers */}
        <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
          <SafetyMap
            center={userCoords}
            zoom={14}
            userLocation={currentLocation}
            riskZones={layersData.riskZones}
            reports={layersData.reports}
            facilities={layersData.facilities}
            className="w-full h-[50vh] md:h-[55vh]"
          />
        </div>

        {/* Quick Safety Actions Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => navigate('/app/sos')}
            className="p-3.5 rounded-xl border border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors text-left flex flex-col justify-between group"
          >
            <Shield className="w-6 h-6 text-emergency mb-2 group-hover:scale-110 transition-transform" />
            <div>
              <span className="font-heading font-bold text-sm text-text block">Instant SOS</span>
              <span className="text-[11px] text-text-muted">Direct emergency trigger</span>
            </div>
          </button>

          <button
            onClick={handleQuickFakeCall}
            className="p-3.5 rounded-xl border border-border bg-surface hover:border-primary transition-colors text-left flex flex-col justify-between group"
          >
            <PhoneCall className="w-6 h-6 text-primary mb-2 group-hover:scale-110 transition-transform" />
            <div>
              <span className="font-heading font-bold text-sm text-text block">Fake Call (5s)</span>
              <span className="text-[11px] text-text-muted">Quick spoken exit call</span>
            </div>
          </button>

          <button
            onClick={() => {
              if (nearestSafePlace) {
                navigate(`/app/plan?destLat=${nearestSafePlace.lat}&destLng=${nearestSafePlace.lng}&destLabel=${encodeURIComponent(nearestSafePlace.name)}`);
              } else {
                navigate('/app/plan');
              }
            }}
            className="p-3.5 rounded-xl border border-border bg-surface hover:border-primary transition-colors text-left flex flex-col justify-between group"
          >
            <Navigation className="w-6 h-6 text-emerald-600 mb-2 group-hover:scale-110 transition-transform" />
            <div>
              <span className="font-heading font-bold text-sm text-text block">Nearest Safe Place</span>
              <span className="text-[11px] text-text-muted truncate block">
                {nearestSafePlace ? nearestSafePlace.name : 'Police / 24x7 Store'}
              </span>
            </div>
          </button>

          <button
            onClick={() => navigate('/app/guardians')}
            className="p-3.5 rounded-xl border border-border bg-surface hover:border-primary transition-colors text-left flex flex-col justify-between group"
          >
            <Share2 className="w-6 h-6 text-purple-600 mb-2 group-hover:scale-110 transition-transform" />
            <div>
              <span className="font-heading font-bold text-sm text-text block">Guardians</span>
              <span className="text-[11px] text-text-muted">Manage trusted contacts</span>
            </div>
          </button>
        </div>
      </div>
    </>
  );
};
