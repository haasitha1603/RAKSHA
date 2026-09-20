import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  MapPin,
  ThumbsUp,
  Plus,
  Filter,
  Sparkles,
  ShieldAlert,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { apiFetch } from '../../lib/api.js';
import { ReportRow } from '@raksha/shared';
import { Helmet } from 'react-helmet-async';
import { SafetyMap } from '../../components/map/SafetyMap.js';
import { EmptyState } from '../../components/common/EmptyState.js';

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  lighting: { label: 'Poor Lighting', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
  suspicious: { label: 'Suspicious Activity', color: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300' },
  harassment: { label: 'Harassment / Eve Teasing', color: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300' },
  unsafe_road: { label: 'Road Hazard / Deserted', color: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' },
  other: { label: 'Safety Concern', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' },
};

// NLP helper for real-time category suggestion
const suggestCategory = (text: string): string | null => {
  const lower = text.toLowerCase();
  if (/(light|dark|pitch|bulb|streetlamp|shadow|dim)/i.test(lower)) return 'lighting';
  if (/(follow|stalk|stare|pass comment|catcall|grope|teas|whisper)/i.test(lower)) return 'harassment';
  if (/(drunk|gang|weapon|loiter|suspicious|shady|drug)/i.test(lower)) return 'suspicious';
  if (/(pothole|block|deserted|isolated|construction|no one)/i.test(lower)) return 'unsafe_road';
  return null;
};

export const ReportsPage: React.FC = () => {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [showAddModal, setShowAddModal] = useState(false);

  // New report form
  const [category, setCategory] = useState('poor_lighting');
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState(12.9716);
  const [longitude, setLongitude] = useState(77.5946);
  const [locationName, setLocationName] = useState('Current Location (Bengaluru)');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [suggestedCat, setSuggestedCat] = useState<string | null>(null);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const url =
        selectedCategory === 'all'
          ? '/api/reports'
          : `/api/reports?category=${selectedCategory}`;
      const res = await apiFetch<{ reports: ReportRow[] }>(url);
      setReports(res.reports || []);
    } catch (err) {
      console.error('Failed to fetch community reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [selectedCategory]);

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setDescription(val);
    const suggested = suggestCategory(val);
    setSuggestedCat(suggested);
  };

  const handleAcceptSuggestion = () => {
    if (suggestedCat) {
      setCategory(suggestedCat);
      setSuggestedCat(null);
    }
  };

  const handleUseCurrentLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(pos.coords.latitude);
          setLongitude(pos.coords.longitude);
          setLocationName(
            `GPS Coordinates (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`
          );
        },
        () => {
          // Fallback to Bengaluru default
          setLatitude(12.9716);
          setLongitude(77.5946);
        }
      );
    }
  };

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch('/api/reports', {
        method: 'POST',
        body: JSON.stringify({
          category,
          description,
          latitude,
          longitude,
          isAnonymous,
        }),
      });

      setShowAddModal(false);
      setDescription('');
      fetchReports();
    } catch (err) {
      console.error('Failed to submit report:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmReport = async (id: string) => {
    try {
      await apiFetch(`/api/reports/${id}/confirm`, { method: 'POST' });
      fetchReports();
    } catch (err) {
      console.error('Failed to confirm report:', err);
    }
  };

  const filteredReports = reports;

  return (
    <>
      <Helmet>
        <title>Community Safety Reports — Raksha</title>
      </Helmet>

      <div className="max-w-4xl mx-auto px-4 py-6 pb-28 md:pb-12 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading font-bold text-2xl text-text">Community Safety Reports</h1>
            <p className="text-xs text-text-muted mt-1">
              Crowdsourced ground-truth alerts with half-life decay. Confirmed reports dynamically increase hazard scores for route planning.
            </p>
          </div>
          <button
            onClick={() => {
              setShowAddModal(true);
              handleUseCurrentLocation();
            }}
            className="px-4 py-2.5 bg-primary text-primary-foreground font-semibold text-xs rounded-xl shadow hover:bg-primary-hover transition-colors flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Report Safety Hazard</span>
          </button>
        </div>

        {/* Filters and View Switcher */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-border">
          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-surface border border-border text-text hover:bg-surface-raised'
              }`}
            >
              All Reports
            </button>
            {Object.entries(CATEGORY_LABELS).map(([catKey, { label }]) => (
              <button
                key={catKey}
                onClick={() => setSelectedCategory(catKey)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === catKey
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-surface border border-border text-text hover:bg-surface-raised'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-1 bg-surface-raised border border-border p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-surface text-text shadow-xs' : 'text-text-muted hover:text-text'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                viewMode === 'map' ? 'bg-surface text-text shadow-xs' : 'text-text-muted hover:text-text'
              }`}
            >
              Map View
            </button>
          </div>
        </div>

        {/* Content View */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 bg-surface-raised rounded-2xl animate-pulse border border-border" />
            ))}
          </div>
        ) : viewMode === 'map' ? (
          <div className="h-[500px] rounded-2xl overflow-hidden border border-border shadow-xs">
            <SafetyMap
              center={[12.9716, 77.5946]}
              zoom={13}
              showIncidentZones={true}
              showLightingZones={true}
              markers={reports.map((r) => ({
                id: r.id,
                lat: r.lat,
                lng: r.lng,
                label: CATEGORY_LABELS[r.category]?.label || r.category,
                type: 'danger',
              }))}
            />
          </div>
        ) : filteredReports.length === 0 ? (
          <EmptyState
            title="No reports in this category"
            description="Be the first to report an unlit street, harassment hotspot, or deserted road in this area."
            icon="reports"
            actionLabel="Submit a Report"
            onAction={() => setShowAddModal(true)}
          />
        ) : (
          <div className="space-y-3">
            {filteredReports.map((r) => {
              const catMeta = CATEGORY_LABELS[r.category] || CATEGORY_LABELS.other;
              const dateStr = new Date(r.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={r.id}
                  className="p-4 bg-surface border border-border rounded-2xl shadow-xs space-y-3 transition-colors hover:border-border-strong"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full ${catMeta.color}`}>
                        {catMeta.label}
                      </span>
                      <span className="text-xs text-text-muted flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {dateStr}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleConfirmReport(r.id)}
                        className="px-2.5 py-1 bg-surface-raised hover:bg-surface border border-border rounded-lg text-xs font-semibold text-text flex items-center gap-1.5 transition-colors"
                        title="Confirm you witnessed this hazard"
                      >
                        <ThumbsUp className="w-3.5 h-3.5 text-primary" />
                        <span>{r.confirmations}</span>
                      </button>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-text leading-relaxed font-sans">
                    {r.text}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-text-muted pt-1 border-t border-border/60">
                    <div className="flex items-center gap-1 font-mono">
                      <MapPin className="w-3 h-3 text-text-muted" />
                      <span>
                        {r.lat.toFixed(4)}, {r.lng.toFixed(4)}
                      </span>
                    </div>
                    <div>
                      Confidence weight: <strong>{r.confidence?.toFixed(1) || '1.0'}</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* NEW REPORT MODAL */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-surface border border-border rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto p-6 max-w-lg w-full space-y-5 shadow-2xl">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <h3 className="font-heading font-bold text-lg text-text">Report Safety Hazard</h3>
                <button onClick={() => setShowAddModal(false)} className="text-text-muted hover:text-text">
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateReport} className="space-y-4">
                {/* Description with NLP suggestion */}
                <div>
                  <label className="block text-xs font-semibold text-text mb-1">
                    What did you notice? (Auto-categorized)
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={description}
                    onChange={handleDescriptionChange}
                    placeholder="e.g. Streetlights completely broken near metro station gate 2. Pitch dark and groups loitering."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-input-bg text-xs text-text focus:outline-hidden focus:ring-2 focus:ring-primary"
                  />

                  {suggestedCat && suggestedCat !== category && (
                    <div className="mt-2 p-2.5 bg-primary-soft/50 border border-primary/30 rounded-xl text-xs flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-primary">
                        <Sparkles className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          Suggested: <strong>{CATEGORY_LABELS[suggestedCat]?.label}</strong>
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleAcceptSuggestion}
                        className="px-2.5 py-1 bg-primary text-primary-foreground text-[11px] font-semibold rounded-lg"
                      >
                        Apply
                      </button>
                    </div>
                  )}
                </div>

                {/* Category Select */}
                <div>
                  <label className="block text-xs font-semibold text-text mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-input-bg text-xs text-text focus:outline-hidden focus:ring-2 focus:ring-primary"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([k, { label }]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Location */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-text">Incident Location</label>
                    <button
                      type="button"
                      onClick={handleUseCurrentLocation}
                      className="text-[11px] text-primary hover:underline flex items-center gap-1 font-medium"
                    >
                      <MapPin className="w-3 h-3" />
                      <span>GPS Pin</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    readOnly
                    value={locationName}
                    className="w-full px-3.5 py-2 rounded-xl border border-border bg-surface-raised text-xs text-text-muted"
                  />
                </div>

                {/* Privacy Toggle */}
                <div className="flex items-center gap-2 p-3 bg-surface-raised rounded-xl border border-border">
                  <input
                    type="checkbox"
                    id="anon"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="w-4 h-4 text-primary rounded"
                  />
                  <label htmlFor="anon" className="text-xs text-text cursor-pointer select-none">
                    Submit anonymously (protect identity from public feed)
                  </label>
                </div>

                {/* Buttons */}
                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-3 bg-surface border border-border rounded-xl text-xs font-semibold text-text hover:bg-surface-raised"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-3 bg-primary text-primary-foreground font-semibold text-xs rounded-xl hover:bg-primary-hover shadow-md disabled:opacity-50"
                  >
                    {submitting ? 'Submitting...' : 'Submit Report'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
