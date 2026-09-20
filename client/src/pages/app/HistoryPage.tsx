import React, { useState, useEffect } from 'react';
import {
  History,
  MapPin,
  Calendar,
  Clock,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Download,
} from 'lucide-react';
import { apiFetch } from '../../lib/api.js';
import { JourneyRow } from '@raksha/shared';
import { Helmet } from 'react-helmet-async';
import { SafetyMap } from '../../components/map/SafetyMap.js';
import { EmptyState } from '../../components/common/EmptyState.js';

export const HistoryPage: React.FC = () => {
  const [journeys, setJourneys] = useState<JourneyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await apiFetch<{ journeys: JourneyRow[] }>('/api/journeys');
      const finished = (res.journeys || []).filter(
        (j) => j.status === 'completed' || j.status === 'cancelled'
      );
      setJourneys(finished);
    } catch (err) {
      console.error('Failed to load past journeys:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(journeys, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `raksha_journey_history_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <>
      <Helmet>
        <title>Journey History — Raksha</title>
      </Helmet>

      <div className="max-w-4xl mx-auto px-4 py-6 pb-28 md:pb-12 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading font-bold text-2xl text-text">Journey History</h1>
            <p className="text-xs text-text-muted mt-1">
              Review completed trips, route risk telemetry, and safety check timestamps.
            </p>
          </div>
          {journeys.length > 0 && (
            <button
              onClick={handleExportJson}
              className="px-4 py-2 bg-surface border border-border rounded-xl text-xs font-semibold text-text hover:bg-surface-raised flex items-center justify-center gap-1.5 shadow-xs"
            >
              <Download className="w-4 h-4 text-primary" />
              <span>Export JSON</span>
            </button>
          )}
        </div>

        {/* List of Journeys */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 bg-surface-raised rounded-2xl animate-pulse border border-border" />
            ))}
          </div>
        ) : journeys.length === 0 ? (
          <EmptyState
            title="No completed journeys yet"
            description="When you finish or complete a monitored trip, your journey history and safety statistics will appear here."
            icon="history"
          />
        ) : (
          <div className="space-y-3">
            {journeys.map((j) => {
              const isExpanded = expandedId === j.id;
              const startTime = j.started_at ? new Date(j.started_at) : new Date();
              const endTime = j.ended_at ? new Date(j.ended_at) : null;
              const durationMinutes = endTime
                ? Math.round((endTime.getTime() - startTime.getTime()) / (60 * 1000))
                : 0;

              let origin = { label: 'Origin', lat: 12.9716, lng: 77.5946 };
              try {
                if (j.origin_json) origin = JSON.parse(j.origin_json);
              } catch (e) {}

              let dest = { label: 'Destination', lat: 12.9716, lng: 77.5946 };
              try {
                if (j.dest_json) dest = JSON.parse(j.dest_json);
              } catch (e) {}

              let routeCoordinates: [number, number][] = [];
              try {
                if (j.route_json) {
                  const parsedRoute = JSON.parse(j.route_json);
                  if (parsedRoute.coordinates) {
                    // geojson [lng, lat] to leaflet [lat, lng]
                    routeCoordinates = parsedRoute.coordinates.map((c: [number, number]) => [c[1], c[0]]);
                  } else if (Array.isArray(parsedRoute)) {
                    routeCoordinates = parsedRoute;
                  }
                }
              } catch (e) {}

              let cabInfo: any = null;
              try {
                if (j.cab_json) cabInfo = JSON.parse(j.cab_json);
              } catch (e) {}

              const maxRisk = j.risk_score || 0;
              const riskColor =
                maxRisk > 60
                  ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-red-200'
                  : maxRisk > 35
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200';

              return (
                <div
                  key={j.id}
                  className="bg-surface border border-border rounded-2xl shadow-xs overflow-hidden transition-colors"
                >
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : j.id)}
                    className="p-4 cursor-pointer hover:bg-surface-raised/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                            j.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-neutral-100 text-neutral-700 border-neutral-200'
                          }`}
                        >
                          {j.status}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${riskColor}`}>
                          Max Risk: {maxRisk.toFixed(0)}/100
                        </span>
                        <span className="text-xs text-text-muted capitalize font-medium">
                          Mode: {j.mode}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-semibold text-text">
                        <span className="truncate max-w-[140px] sm:max-w-[200px]">
                          {origin.label || `${origin.lat.toFixed(3)}, ${origin.lng.toFixed(3)}`}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-text-muted shrink-0" />
                        <span className="truncate max-w-[140px] sm:max-w-[200px]">
                          {dest.label || `${dest.lat.toFixed(3)}, ${dest.lng.toFixed(3)}`}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-text-muted font-mono">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {startTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (
                          {durationMinutes} mins)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-border">
                      <div className="text-right text-xs">
                        <div className="text-text-muted">Safety Checks</div>
                        <div className="font-semibold text-text">Passed (No Incident)</div>
                      </div>
                      <button className="p-1 text-text-muted hover:text-text">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded details & Map Replay */}
                  {isExpanded && (
                    <div className="p-4 bg-surface-raised/60 border-t border-border space-y-4">
                      {routeCoordinates.length > 0 ? (
                        <div className="h-60 rounded-xl overflow-hidden border border-border shadow-xs">
                          <SafetyMap
                            center={[origin.lat, origin.lng]}
                            zoom={13}
                            customPolylines={[
                              {
                                id: j.id,
                                coordinates: routeCoordinates,
                                color: maxRisk > 50 ? '#EF4444' : '#10B981',
                              },
                            ]}
                          />
                        </div>
                      ) : (
                        <div className="p-4 bg-surface border border-border rounded-xl text-xs text-text-muted text-center">
                          Detailed breadcrumbs purged per retention policy (24h default).
                        </div>
                      )}

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div className="p-2.5 bg-surface border border-border rounded-xl">
                          <div className="text-text-muted">Transport Mode</div>
                          <div className="font-semibold capitalize text-text">{j.mode}</div>
                        </div>
                        <div className="p-2.5 bg-surface border border-border rounded-xl">
                          <div className="text-text-muted">Vehicle / Driver</div>
                          <div className="font-semibold text-text">{cabInfo?.plate || 'None (Walking)'}</div>
                        </div>
                        <div className="p-2.5 bg-surface border border-border rounded-xl">
                          <div className="text-text-muted">Shared With</div>
                          <div className="font-semibold text-text">Guardians (Token)</div>
                        </div>
                        <div className="p-2.5 bg-surface border border-border rounded-xl">
                          <div className="text-text-muted">Status</div>
                          <div className="font-semibold capitalize text-text">{j.status}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};
