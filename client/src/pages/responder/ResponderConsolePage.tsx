import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Shield,
  Cross,
  ArrowLeft,
  Phone,
  MapPin,
  Clock,
  Battery,
  AlertTriangle,
  CheckCircle2,
  Car,
  Radio,
  Zap,
} from 'lucide-react';
import { apiFetch } from '../../lib/api.js';
import { getSocket } from '../../lib/socket.js';
import { Helmet } from 'react-helmet-async';
import { SafetyMap } from '../../components/map/SafetyMap.js';
import { SimulationNotice } from '../../components/common/SimulationNotice.js';

interface Facility {
  id: string;
  name: string;
  type: 'police' | 'hospital';
  address: string;
  phone: string;
  latitude: number;
  longitude: number;
}

interface Dispatch {
  id: string;
  sos_id: string;
  facility_id: string;
  status: 'dispatched' | 'en_route' | 'arrived' | 'resolved';
  eta_seconds: number;
  packet_json: string;
  created_at: number;
  updated_at: number;
}

export const ResponderConsolePage: React.FC = () => {
  const { facilityId } = useParams<{ facilityId: string }>();
  const navigate = useNavigate();
  const [facility, setFacility] = useState<Facility | null>(null);
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDispatchId, setActiveDispatchId] = useState<string | null>(null);

  const fetchConsole = async () => {
    try {
      const res = await apiFetch<{
        facility: Facility;
        dispatches: Dispatch[];
      }>(`/api/responder/facilities/${facilityId}/dispatches`);
      setFacility(res.facility);
      setDispatches(res.dispatches || []);
      if (!activeDispatchId && res.dispatches?.length > 0) {
        setActiveDispatchId(res.dispatches[0].id);
      }
    } catch (err) {
      console.error('Failed to load facility console:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConsole();

    // Socket join room
    const socket = getSocket();
    socket.emit('join:facility', { facilityId });

    const handleNewDispatch = (newDispatch: Dispatch) => {
      setDispatches((prev) => [newDispatch, ...prev.filter((d) => d.id !== newDispatch.id)]);
      setActiveDispatchId(newDispatch.id);
    };

    socket.on('dispatch:new', handleNewDispatch);
    socket.on('dispatch:update', handleNewDispatch);

    const interval = setInterval(fetchConsole, 4000);

    return () => {
      socket.off('dispatch:new', handleNewDispatch);
      socket.off('dispatch:update', handleNewDispatch);
      clearInterval(interval);
    };
  }, [facilityId]);

  const handleUpdateStatus = async (dispatchId: string, nextStatus: string) => {
    try {
      await apiFetch(`/api/responder/dispatches/${dispatchId}/status`, {
        method: 'POST',
        body: JSON.stringify({ status: nextStatus }),
      });
      fetchConsole();
    } catch (err) {
      console.error('Failed to update dispatch status:', err);
    }
  };

  const selectedDispatch = dispatches.find((d) => d.id === activeDispatchId) || dispatches[0];

  let parsedPacket: any = null;
  if (selectedDispatch?.packet_json) {
    try {
      parsedPacket = JSON.parse(selectedDispatch.packet_json);
    } catch (e) {
      // ignore
    }
  }

  const facilityIcon =
    facility?.type === 'police' ? (
      <Shield className="w-5 h-5 text-blue-500" />
    ) : (
      <Cross className="w-5 h-5 text-red-500" />
    );

  return (
    <>
      <Helmet>
        <title>{facility ? `${facility.name} Console` : 'Responder Console'} — Raksha</title>
      </Helmet>

      <div className="min-h-screen bg-bg text-text pb-12 flex flex-col justify-between">
        <SimulationNotice />

        <div className="max-w-6xl mx-auto w-full px-4 py-6 space-y-6">
          {/* Top Bar Navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-surface border border-border rounded-2xl shadow-xs">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/responder')}
                className="p-2 bg-surface-raised hover:bg-surface border border-border rounded-xl text-text-muted hover:text-text transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-surface-raised flex items-center justify-center border border-border shrink-0">
                  {facilityIcon}
                </div>
                <div>
                  <h1 className="font-heading font-bold text-base text-text">{facility?.name || 'Responder Desk'}</h1>
                  <div className="text-xs text-text-muted flex items-center gap-2">
                    <span className="font-mono">{facility?.phone}</span>
                    <span>•</span>
                    <span className="truncate max-w-[260px]">{facility?.address}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-semibold">
                <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-500" />
                <span>Radio Bridge Online</span>
              </div>
            </div>
          </div>

          {/* PULSEROUTE-AI PARALLEL BRIDGE COMPARISON CALLOUT */}
          <div className="p-4 bg-gradient-to-r from-primary-soft/80 via-surface to-primary-soft/40 border border-primary/30 rounded-2xl shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-primary font-heading font-bold text-xs uppercase tracking-wider">
              <Zap className="w-4 h-4" />
              <span>PulseRouteAI Architecture: Parallel Emergency Bridge vs Sequential Call Trees</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-surface/80 rounded-xl border border-border/80 space-y-1.5">
                <span className="font-semibold text-text-muted block">Conventional Sequential Bottleneck</span>
                <p className="text-text-muted leading-relaxed">
                  Traveller triggers SOS ➔ Only 1 guardian gets an SMS ➔ Guardian is asleep or delays 15m ➔ Guardian dials 112 ➔ Police dispatcher manually questions location ➔ Police radios hospital ambulance = <strong>25–45 minutes</strong> total response latency.
                </p>
              </div>
              <div className="p-3 bg-surface/80 rounded-xl border border-primary/30 space-y-1.5">
                <span className="font-bold text-primary block">Raksha Parallel Bridge (0.8s)</span>
                <p className="text-text leading-relaxed">
                  Traveller triggers SOS (shake/duress/check-in fail) ➔ Structured Emergency Packet simultaneously dispatched to <strong>Guardians + Nearest Police Station + Nearest Trauma Hospital</strong> with exact GPS, speed, battery, and vehicle registration.
                </p>
              </div>
            </div>
          </div>

          {/* Main Grid: Dispatches List & Detail View */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Dispatches List */}
            <div className="space-y-3">
              <h2 className="font-heading font-bold text-sm text-text flex items-center justify-between">
                <span>Incoming Dispatches</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-surface-raised font-mono">
                  {dispatches.length}
                </span>
              </h2>

              {dispatches.length === 0 ? (
                <div className="p-8 bg-surface border border-border rounded-2xl text-center space-y-2 text-xs text-text-muted">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p className="font-semibold text-text">No active emergencies in your sector.</p>
                  <p>Trigger an SOS in the user app or simulator to test live dispatch.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {dispatches.map((d) => {
                    const isSelected = d.id === selectedDispatch?.id;
                    let p: any = {};
                    try {
                      p = JSON.parse(d.packet_json);
                    } catch (e) {}

                    return (
                      <button
                        key={d.id}
                        onClick={() => setActiveDispatchId(d.id)}
                        className={`w-full text-left p-3.5 rounded-2xl border transition-all ${
                          isSelected
                            ? 'bg-surface-raised border-primary shadow-sm'
                            : 'bg-surface border-border hover:border-border-strong'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-heading font-bold text-sm text-text">
                            {p.user?.name || 'Traveller'}
                          </span>
                          <span
                            className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                              d.status === 'dispatched'
                                ? 'bg-red-100 text-red-800 animate-pulse'
                                : d.status === 'en_route'
                                ? 'bg-amber-100 text-amber-800'
                                : d.status === 'arrived'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-neutral-100 text-neutral-800'
                            }`}
                          >
                            {d.status}
                          </span>
                        </div>
                        <div className="text-xs text-text-muted mt-1 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-emergency" />
                          <span className="capitalize">{p.triggerType || 'SOS Triggered'}</span>
                        </div>
                        <div className="text-[11px] text-text-muted mt-1 font-mono flex items-center justify-between">
                          <span>ETA ~{d.eta_seconds ? Math.round(d.eta_seconds / 60) : 4} mins</span>
                          <span>{new Date(d.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right: Selected Dispatch Incident Details & Map */}
            <div className="lg:col-span-2 space-y-4">
              {selectedDispatch && parsedPacket ? (
                <div className="bg-surface border border-border rounded-2xl p-5 shadow-xs space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-heading font-bold text-xl text-text">
                          {parsedPacket.user?.name || 'Traveller SOS'}
                        </h3>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-surface-raised border border-border text-text-muted">
                          ID: {selectedDispatch.id.slice(0, 8)}
                        </span>
                      </div>
                      <div className="text-xs text-text-muted mt-1 flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-text-muted" />
                          {parsedPacket.user?.phone}
                        </span>
                        <span className="flex items-center gap-1">
                          <Battery className="w-3 h-3 text-emerald-500" />
                          {parsedPacket.batteryLevel}% Battery
                        </span>
                      </div>
                    </div>

                    {/* Status Action Workflow Buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                      {selectedDispatch.status === 'dispatched' && (
                        <button
                          onClick={() => handleUpdateStatus(selectedDispatch.id, 'en_route')}
                          className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-xl shadow-xs"
                        >
                          Mark Unit En Route
                        </button>
                      )}
                      {selectedDispatch.status === 'en_route' && (
                        <button
                          onClick={() => handleUpdateStatus(selectedDispatch.id, 'arrived')}
                          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs"
                        >
                          Mark Unit Arrived
                        </button>
                      )}
                      {selectedDispatch.status !== 'resolved' && (
                        <button
                          onClick={() => handleUpdateStatus(selectedDispatch.id, 'resolved')}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs"
                        >
                          Resolve Incident
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Incident Map */}
                  <div className="h-64 sm:h-72 rounded-xl overflow-hidden border border-border shadow-xs">
                    <SafetyMap
                      center={[parsedPacket.location?.latitude || 12.9716, parsedPacket.location?.longitude || 77.5946]}
                      zoom={14}
                      markers={[
                        {
                          id: 'incident',
                          lat: parsedPacket.location?.latitude || 12.9716,
                          lng: parsedPacket.location?.longitude || 77.5946,
                          label: `🚨 SOS: ${parsedPacket.user?.name}`,
                          type: 'danger',
                        },
                        ...(facility
                          ? [
                              {
                                id: 'facility',
                                lat: facility.latitude,
                                lng: facility.longitude,
                                label: `🏢 ${facility.name}`,
                                type: 'safe' as const,
                              },
                            ]
                          : []),
                      ]}
                    />
                  </div>

                  {/* Emergency Context Details */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-surface-raised rounded-xl border border-border">
                      <div className="text-text-muted">Trigger Reason</div>
                      <div className="font-semibold text-text capitalize mt-0.5">
                        {parsedPacket.triggerType}
                      </div>
                    </div>

                    <div className="p-3 bg-surface-raised rounded-xl border border-border">
                      <div className="text-text-muted">Duress Signal</div>
                      <div className="font-semibold mt-0.5">
                        {parsedPacket.duress ? (
                          <span className="text-red-500 font-bold">YES (Stealth Duress)</span>
                        ) : (
                          <span className="text-emerald-500 font-medium">Standard Alarm</span>
                        )}
                      </div>
                    </div>

                    <div className="p-3 bg-surface-raised rounded-xl border border-border">
                      <div className="text-text-muted">Live Speed</div>
                      <div className="font-semibold text-text font-mono mt-0.5">
                        {((parsedPacket.speedMps || 0) * 3.6).toFixed(1)} km/h
                      </div>
                    </div>

                    <div className="p-3 bg-surface-raised rounded-xl border border-border">
                      <div className="text-text-muted">Vehicle Registration</div>
                      <div className="font-semibold text-text font-mono mt-0.5">
                        {parsedPacket.vehicle?.plate || 'None (Walking)'}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-12 bg-surface border border-border rounded-2xl text-center text-xs text-text-muted">
                  Select an incident from the queue to view full context telemetry and dispatch control.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-text-muted pt-8 pb-4">
          Raksha Emergency Bridge • Simulated Control Terminal
        </div>
      </div>
    </>
  );
};
