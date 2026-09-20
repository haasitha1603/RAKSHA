import React, { useEffect, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  Circle,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import {
  RiskZoneRow,
  LightingZoneRow,
  ActivityZoneRow,
  ReportRow,
  FacilityRow,
  RouteOption,
} from '@raksha/shared';
import { Layers, Shield, Cross, MapPin } from 'lucide-react';

// Fix default Leaflet icon paths in bundler
delete (Object.getPrototypeOf(new L.Icon.Default()) as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom SVG Icons for facilities and reports
const createSvgIcon = (color: string, label: string) => {
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `<div style="background-color: ${color}; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 11px; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">${label}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

const policeIcon = createSvgIcon('#1E40AF', 'P');
const hospitalIcon = createSvgIcon('#DC2626', 'H');
const safePlaceIcon = createSvgIcon('#059669', 'S');
const reportIcon = createSvgIcon('#D97706', '!');

function ChangeMapView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

interface SafetyMapProps {
  center?: [number, number];
  zoom?: number;
  selectedRoute?: RouteOption | null;
  routes?: RouteOption[];
  userLocation?: { lat: number; lng: number; acc?: number } | null;
  riskZones?: RiskZoneRow[];
  lightingZones?: LightingZoneRow[];
  activityZones?: ActivityZoneRow[];
  reports?: ReportRow[];
  facilities?: FacilityRow[];
  markers?: { id: string; lat: number; lng: number; label: string; type?: 'safe' | 'danger' | 'caution' }[];
  customPolylines?: { id: string; coordinates: [number, number][]; color?: string; weight?: number }[];
  showIncidentZones?: boolean;
  showLightingZones?: boolean;
  onSelectRoute?: (route: RouteOption) => void;
  className?: string;
}

export const SafetyMap: React.FC<SafetyMapProps> = ({
  center = [28.6139, 77.2090],
  zoom = 14,
  selectedRoute,
  routes = [],
  userLocation,
  riskZones = [],
  lightingZones = [],
  activityZones = [],
  reports = [],
  facilities = [],
  markers = [],
  customPolylines = [],
  showIncidentZones = true,
  showLightingZones = true,
  onSelectRoute,
  className = 'w-full h-[55vh] md:h-full rounded-2xl overflow-hidden',
}) => {
  const [layersOpen, setLayersOpen] = useState(false);
  const [showIncidents, setShowIncidents] = useState(showIncidentZones);
  const [showLighting, setShowLighting] = useState(showLightingZones);
  const [showReports, setShowReports] = useState(true);
  const [showFacilities, setShowFacilities] = useState(true);

  return (
    <div className={`relative ${className}`}>
      {/* Map Container */}
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
      >
        <ChangeMapView center={center} zoom={zoom} />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {/* User Location Marker & Accuracy Halo */}
        {userLocation && (
          <>
            <Marker
              position={[userLocation.lat, userLocation.lng]}
              icon={createSvgIcon('#4338CA', '●')}
            >
              <Popup>
                <div className="text-xs p-1">
                  <strong>You are here</strong>
                  <br />
                  Accuracy: ±{Math.round(userLocation.acc || 10)} m
                </div>
              </Popup>
            </Marker>
            <Circle
              center={[userLocation.lat, userLocation.lng]}
              radius={userLocation.acc || 15}
              pathOptions={{ fillColor: '#4338CA', fillOpacity: 0.15, stroke: false }}
            />
          </>
        )}

        {/* Incident Zones */}
        {showIncidents &&
          riskZones.map((rz) => (
            <Circle
              key={rz.id}
              center={[rz.lat, rz.lng]}
              radius={rz.radius_m}
              pathOptions={{
                color: rz.severity >= 4 ? '#DC2626' : '#EA580C',
                fillColor: rz.severity >= 4 ? '#DC2626' : '#EA580C',
                fillOpacity: 0.22,
                weight: 1.5,
              }}
            >
              <Popup>
                <div className="text-xs">
                  <strong className="text-red-700 capitalize">
                    {rz.category} Hotspot (Demo Data)
                  </strong>
                  <br />
                  Severity: {rz.severity}/5
                  <br />
                  Radius: ~{rz.radius_m} m
                </div>
              </Popup>
            </Circle>
          ))}

        {/* Lighting Zones */}
        {showLighting &&
          lightingZones.map((lz) => {
            const isDark = lz.level < 0.4;
            return (
              <Circle
                key={lz.id}
                center={[lz.lat, lz.lng]}
                radius={lz.radius_m}
                pathOptions={{
                  color: isDark ? '#78350F' : '#FBBF24',
                  fillColor: isDark ? '#78350F' : '#FEF08A',
                  fillOpacity: isDark ? 0.35 : 0.15,
                  weight: 1,
                  dashArray: isDark ? '4, 4' : undefined,
                }}
              >
                <Popup>
                  <div className="text-xs">
                    <strong>{isDark ? 'Poorly Lit Stretch' : 'Well Lit Area'}</strong>
                    <br />
                    Lighting Index: {Math.round(lz.level * 100)}%
                  </div>
                </Popup>
              </Circle>
            );
          })}

        {/* Facilities */}
        {showFacilities &&
          facilities.map((fac) => {
            const icon =
              fac.type === 'police'
                ? policeIcon
                : fac.type === 'hospital'
                ? hospitalIcon
                : safePlaceIcon;

            return (
              <Marker key={fac.id} position={[fac.lat, fac.lng]} icon={icon}>
                <Popup>
                  <div className="text-xs space-y-1">
                    <strong className="text-text block">{fac.name}</strong>
                    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-gray-100 text-gray-700">
                      {fac.type.replace('_', ' ')}
                    </span>
                    {fac.phone && (
                      <div className="mt-1">
                        <a
                          href={`tel:${fac.phone}`}
                          className="text-primary font-semibold underline text-xs"
                        >
                          Call: {fac.phone}
                        </a>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {/* Community Reports */}
        {showReports &&
          reports.map((rep) => (
            <Marker key={rep.id} position={[rep.lat, rep.lng]} icon={reportIcon}>
              <Popup>
                <div className="text-xs space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <strong className="capitalize text-text">{rep.category}</strong>
                    <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-1 rounded">
                      {rep.status}
                    </span>
                  </div>
                  <p className="text-text-muted">{rep.text || 'Community reported caution spot'}</p>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Unselected Alternate Routes */}
        {routes
          .filter((r) => r.id !== selectedRoute?.id)
          .map((r) => {
            const positions: [number, number][] = r.geometry.coordinates.map((c) => [c[1], c[0]]);
            return (
              <Polyline
                key={r.id}
                positions={positions}
                pathOptions={{
                  color: '#94A3B8',
                  weight: 4,
                  opacity: 0.6,
                  dashArray: '6, 6',
                }}
                eventHandlers={{
                  click: () => onSelectRoute?.(r),
                }}
              />
            );
          })}

        {/* Selected Route with Segment Risk Colors */}
        {selectedRoute && (
          <>
            {selectedRoute.segmentRisks && selectedRoute.segmentRisks.length > 0 ? (
              selectedRoute.segmentRisks.map((seg, idx) => {
                const subCoords = selectedRoute.geometry.coordinates.slice(
                  seg.startIdx,
                  seg.endIdx + 1
                );
                const positions: [number, number][] = subCoords.map((c) => [c[1], c[0]]);
                const segColor =
                  seg.riskLevel === 'danger'
                    ? '#DC2626'
                    : seg.riskLevel === 'caution'
                    ? '#F59E0B'
                    : '#059669';

                return (
                  <Polyline
                    key={`seg_${idx}`}
                    positions={positions}
                    pathOptions={{
                      color: segColor,
                      weight: 6,
                      opacity: 0.9,
                    }}
                  />
                );
              })
            ) : (
              <Polyline
                positions={selectedRoute.geometry.coordinates.map((c) => [c[1], c[0]])}
                pathOptions={{ color: '#4338CA', weight: 6, opacity: 0.9 }}
              />
            )}
          </>
        )}
        {/* Custom Polylines */}
        {customPolylines.map((cp) => (
          <Polyline
            key={cp.id}
            positions={cp.coordinates}
            pathOptions={{
              color: cp.color || '#4338CA',
              weight: cp.weight || 5,
              opacity: 0.85,
            }}
          />
        ))}

        {/* Custom Markers */}
        {markers.map((m) => {
          const color =
            m.type === 'danger'
              ? '#DC2626'
              : m.type === 'caution'
              ? '#D97706'
              : '#059669';
          return (
            <Marker key={m.id} position={[m.lat, m.lng]} icon={createSvgIcon(color, '●')}>
              <Popup>
                <div className="text-xs font-semibold text-text">{m.label}</div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Layer Toggle Floating Button & Panel */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={() => setLayersOpen(!layersOpen)}
          aria-label="Toggle map safety layers"
          className="p-2.5 bg-surface/95 backdrop-blur-md rounded-xl shadow-md border border-border text-text hover:bg-surface-raised transition-colors flex items-center gap-1.5 text-xs font-semibold"
        >
          <Layers className="w-4 h-4 text-primary" />
          <span className="hidden sm:inline">Layers</span>
        </button>

        {layersOpen && (
          <div className="mt-2 w-48 bg-surface/95 backdrop-blur-md border border-border rounded-xl p-3 shadow-xl space-y-2 text-xs font-medium text-text">
            <label className="flex items-center justify-between cursor-pointer">
              <span>Past Incidents</span>
              <input
                type="checkbox"
                checked={showIncidents}
                onChange={(e) => setShowIncidents(e.target.checked)}
                className="rounded accent-primary"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span>Lighting Zones</span>
              <input
                type="checkbox"
                checked={showLighting}
                onChange={(e) => setShowLighting(e.target.checked)}
                className="rounded accent-primary"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span>Community Reports</span>
              <input
                type="checkbox"
                checked={showReports}
                onChange={(e) => setShowReports(e.target.checked)}
                className="rounded accent-primary"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span>Emergency Facilities</span>
              <input
                type="checkbox"
                checked={showFacilities}
                onChange={(e) => setShowFacilities(e.target.checked)}
                className="rounded accent-primary"
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
};
