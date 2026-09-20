import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Shield,
  ShieldAlert,
  Battery,
  MapPin,
  Clock,
  Phone,
  Car,
  Bell,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { apiFetch } from '../../lib/api.js';
import { getSocket } from '../../lib/socket.js';
import { Helmet } from 'react-helmet-async';
import { SafetyMap } from '../../components/map/SafetyMap.js';
import { SimulationNotice } from '../../components/common/SimulationNotice.js';

interface GuardianViewData {
  user: {
    name: string;
    phone: string;
  };
  journey: {
    id: string;
    status: string;
    origin_label: string;
    destination_label: string;
    mode: string;
    vehicle_plate?: string;
    driver_name?: string;
    driver_phone?: string;
    route_geometry_json?: string;
    current_lat: number;
    current_lng: number;
    speed_mps: number;
    battery_level: number;
    eta_timestamp?: number;
    deviation_detected: number;
    last_ping_at: number;
  } | null;
  activeSos: {
    id: string;
    trigger_type: string;
    latitude: number;
    longitude: number;
    created_at: number;
    duress: number;
  } | null;
}

export const GuardianViewPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<GuardianViewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkPingSent, setCheckPingSent] = useState(false);

  const fetchData = async () => {
    try {
      const res = await apiFetch<GuardianViewData>(`/api/guardians/view/${token}`);
      setData(res);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Invalid or expired guardian tracking link.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Socket.io live tracking
    const socket = getSocket();
    socket.emit('join:guardian', { token });

    const handleUpdate = (updated: GuardianViewData) => {
      setData(updated);
    };

    socket.on('journey:update', handleUpdate);
    socket.on('sos:triggered', handleUpdate);

    // Fallback polling every 5 seconds
    const interval = setInterval(fetchData, 5000);

    return () => {
      socket.off('journey:update', handleUpdate);
      socket.off('sos:triggered', handleUpdate);
      clearInterval(interval);
    };
  }, [token]);

  const handleRequestCheckIn = async () => {
    try {
      await apiFetch(`/api/guardians/view/${token}/request-checkin`, { method: 'POST' });
      setCheckPingSent(true);
      setTimeout(() => setCheckPingSent(false), 4000);
    } catch (err) {
      console.error('Failed to send checkin request:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-text-muted">Loading secure guardian stream...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-surface border border-border rounded-3xl p-6 text-center space-y-4 shadow-xl">
          <ShieldAlert className="w-12 h-12 text-emergency mx-auto" />
          <h1 className="font-heading font-bold text-xl text-text">Guardian Link Unavailable</h1>
          <p className="text-xs text-text-muted leading-relaxed">
            {error || 'This emergency tracking link is invalid, expired, or has been revoked by the traveller.'}
          </p>
          <a
            href="/"
            className="inline-block px-5 py-2.5 bg-primary text-primary-foreground text-xs font-semibold rounded-xl hover:bg-primary-hover shadow-xs"
          >
            Go to Raksha Home
          </a>
        </div>
      </div>
    );
  }

  const { user, journey, activeSos } = data;
  const isSos = !!activeSos;

  let routeCoords: [number, number][] = [];
  try {
    if (journey?.route_geometry_json) {
      routeCoords = JSON.parse(journey.route_geometry_json);
    }
  } catch (e) {
    // ignore
  }

  const travellerCoords: [number, number] = journey
    ? [journey.current_lat, journey.current_lng]
    : [12.9716, 77.5946];

  return (
    <>
      <Helmet>
        <title>{isSos ? `EMERGENCY ALERT: ${user.name}` : `Live Tracking: ${user.name}`} — Raksha Guardian</title>
      </Helmet>

      <div className="min-h-screen bg-bg text-text pb-12 flex flex-col justify-between">
        {/* Top Disclaimer */}
        <SimulationNotice />

        {/* SOS BANNER IF EMERGENCY ACTIVE */}
        {isSos && (
          <div className="bg-red-600 text-white px-4 py-3 shadow-lg animate-pulse sticky top-0 z-50">
            <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 font-semibold">
                <ShieldAlert className="w-5 h-5 shrink-0" />
                <span>
                  EMERGENCY ALERT: {user.name} triggered SOS! Emergency responders (Police &amp; Hospital) have been dispatched.
                </span>
              </div>
              <a
                href="tel:112"
                className="px-4 py-1.5 bg-white text-red-700 font-bold rounded-lg shadow hover:bg-red-50 text-xs shrink-0"
              >
                Call Police (112)
              </a>
            </div>
          </div>
        )}

        <div className="max-w-4xl mx-auto w-full px-4 py-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-surface border border-border rounded-2xl shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary-soft text-primary font-bold text-lg flex items-center justify-center shrink-0">
                {user.name[0]}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-heading font-bold text-lg text-text">{user.name}</h1>
                  <span
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                      isSos
                        ? 'bg-red-100 text-red-800 animate-pulse'
                        : journey
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-neutral-100 text-neutral-800'
                    }`}
                  >
                    {isSos ? 'SOS Active' : journey ? 'In Transit' : 'At Rest'}
                  </span>
                </div>
                <div className="text-xs text-text-muted mt-0.5 font-mono">
                  Emergency Contact Channel • {user.phone}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={`tel:${user.phone}`}
                className="px-3.5 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow hover:bg-primary-hover"
              >
                <Phone className="w-4 h-4" />
                <span>Call {user.name.split(' ')[0]}</span>
              </a>
              <a
                href="tel:112"
                className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Emergency 112</span>
              </a>
            </div>
          </div>

          {/* Map View */}
          <div className="h-[400px] sm:h-[460px] rounded-3xl overflow-hidden border border-border shadow-md">
            <SafetyMap
              center={travellerCoords}
              zoom={14}
              showIncidentZones={true}
              showLightingZones={true}
              customPolylines={
                routeCoords.length > 0
                  ? [
                      {
                        id: journey?.id || 'live',
                        coordinates: routeCoords,
                        color: isSos ? '#EF4444' : '#4338CA',
                      },
                    ]
                  : undefined
              }
              markers={[
                {
                  id: 'traveller',
                  lat: travellerCoords[0],
                  lng: travellerCoords[1],
                  label: isSos ? `⚠️ SOS: ${user.name}` : `📍 ${user.name}`,
                  type: isSos ? 'danger' : 'safe',
                },
              ]}
            />
          </div>

          {/* Telemetry and Controls */}
          {journey ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 bg-surface border border-border rounded-2xl shadow-xs">
                <div className="text-text-muted flex items-center gap-1 mb-1">
                  <Battery className="w-4 h-4 text-emerald-500" />
                  <span>Battery</span>
                </div>
                <div className="font-heading font-bold text-base text-text">
                  {journey.battery_level}%
                </div>
                {journey.battery_level < 15 && (
                  <div className="text-[10px] text-amber-500 font-semibold mt-0.5">Low Battery Alert</div>
                )}
              </div>

              <div className="p-3.5 bg-surface border border-border rounded-2xl shadow-xs">
                <div className="text-text-muted flex items-center gap-1 mb-1">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span>Live Speed</span>
                </div>
                <div className="font-heading font-bold text-base text-text font-mono">
                  {(journey.speed_mps * 3.6).toFixed(1)} km/h
                </div>
                <div className="text-[10px] text-text-muted capitalize">{journey.mode} mode</div>
              </div>

              <div className="p-3.5 bg-surface border border-border rounded-2xl shadow-xs">
                <div className="text-text-muted flex items-center gap-1 mb-1">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span>Route Deviation</span>
                </div>
                <div className="font-heading font-bold text-base text-text">
                  {journey.deviation_detected ? (
                    <span className="text-emergency">Off Route</span>
                  ) : (
                    <span className="text-emerald-500">On Safe Route</span>
                  )}
                </div>
                <div className="text-[10px] text-text-muted">Corridor tracking active</div>
              </div>

              <div className="p-3.5 bg-surface border border-border rounded-2xl shadow-xs flex flex-col justify-between">
                <div>
                  <div className="text-text-muted flex items-center gap-1 mb-1">
                    <Bell className="w-4 h-4 text-purple-500" />
                    <span>Safety Check</span>
                  </div>
                  <div className="text-[11px] text-text-muted">
                    {checkPingSent ? 'Ping Dispatched' : 'Request Traveller Check-in'}
                  </div>
                </div>
                <button
                  onClick={handleRequestCheckIn}
                  disabled={checkPingSent}
                  className="mt-2 w-full py-1.5 bg-surface-raised hover:bg-surface border border-border rounded-lg font-semibold text-xs text-text transition-colors disabled:opacity-50"
                >
                  {checkPingSent ? 'Sent' : 'Ping User'}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 bg-surface border border-border rounded-2xl text-center space-y-2">
              <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto" />
              <h3 className="font-heading font-bold text-sm text-text">No Active Journey Right Now</h3>
              <p className="text-xs text-text-muted max-w-md mx-auto">
                {user.name} is currently stationary or has completed their monitored trip. You will receive an instant push notification or SMS if an emergency is triggered.
              </p>
            </div>
          )}

          {/* Vehicle / Cab details if available */}
          {journey?.vehicle_plate && (
            <div className="p-4 bg-surface border border-border rounded-2xl shadow-xs flex items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                  <Car className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold text-text">Vehicle Registration: {journey.vehicle_plate}</div>
                  <div className="text-text-muted text-[11px]">
                    Driver: {journey.driver_name || 'Verified Driver'} {journey.driver_phone ? `(${journey.driver_phone})` : ''}
                  </div>
                </div>
              </div>
              {journey.driver_phone && (
                <a
                  href={`tel:${journey.driver_phone}`}
                  className="px-3 py-1.5 bg-surface-raised border border-border rounded-lg font-semibold text-text hover:bg-surface"
                >
                  Call Driver
                </a>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-text-muted pt-8 pb-4">
          Raksha Guardian Stream • Secure token-authorized monitoring
        </div>
      </div>
    </>
  );
};
