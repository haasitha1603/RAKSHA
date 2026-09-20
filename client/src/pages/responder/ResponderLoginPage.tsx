import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Cross, ArrowRight, Building2, Phone, MapPin } from 'lucide-react';
import { apiFetch } from '../../lib/api.js';
import { Helmet } from 'react-helmet-async';
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

export const ResponderLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFacilities = async () => {
      try {
        const res = await apiFetch<{ facilities: Facility[] }>('/api/responder/facilities');
        setFacilities(res.facilities || []);
      } catch (err) {
        console.error('Failed to load facilities:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFacilities();
  }, []);

  const policeStations = facilities.filter((f) => f.type === 'police');
  const hospitals = facilities.filter((f) => f.type === 'hospital');

  return (
    <>
      <Helmet>
        <title>Responder Console Portal — Raksha</title>
      </Helmet>

      <div className="min-h-screen bg-bg text-text pb-12 flex flex-col justify-between">
        <SimulationNotice />

        <div className="max-w-4xl mx-auto w-full px-4 py-8 space-y-8">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-soft text-primary font-bold text-xs rounded-full">
              <Shield className="w-3.5 h-3.5" />
              <span>Simulated PulseRouteAI Emergency Bridge</span>
            </div>
            <h1 className="font-heading font-bold text-3xl text-text">Responder Dispatch Consoles</h1>
            <p className="text-xs text-text-muted max-w-xl mx-auto leading-relaxed">
              Select a simulated police control room or hospital casualty desk below to inspect real-time incoming SOS packets and parallel dispatch telemetry.
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-surface-raised rounded-2xl animate-pulse border border-border" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Police Consoles */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-1 border-b border-border">
                  <Shield className="w-4 h-4 text-blue-500" />
                  <h2 className="font-heading font-bold text-sm text-text uppercase tracking-wider">
                    Police Control Rooms ({policeStations.length})
                  </h2>
                </div>

                <div className="space-y-2.5">
                  {policeStations.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => navigate(`/responder/${f.id}`)}
                      className="w-full text-left p-4 bg-surface border border-border rounded-2xl hover:border-primary hover:shadow-md transition-all group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="font-heading font-bold text-sm text-text group-hover:text-primary transition-colors">
                            {f.name}
                          </div>
                          <div className="text-xs text-text-muted flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-text-muted shrink-0" />
                            <span className="truncate max-w-[240px]">{f.address}</span>
                          </div>
                          <div className="text-[11px] text-text-muted font-mono flex items-center gap-1">
                            <Phone className="w-3 h-3 text-text-muted shrink-0" />
                            <span>{f.phone}</span>
                          </div>
                        </div>
                        <ArrowRight className="w-5 h-5 text-text-muted group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0 mt-1" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Hospital Consoles */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-1 border-b border-border">
                  <Cross className="w-4 h-4 text-red-500" />
                  <h2 className="font-heading font-bold text-sm text-text uppercase tracking-wider">
                    Hospital Casualty Desks ({hospitals.length})
                  </h2>
                </div>

                <div className="space-y-2.5">
                  {hospitals.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => navigate(`/responder/${f.id}`)}
                      className="w-full text-left p-4 bg-surface border border-border rounded-2xl hover:border-emergency hover:shadow-md transition-all group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="font-heading font-bold text-sm text-text group-hover:text-emergency transition-colors">
                            {f.name}
                          </div>
                          <div className="text-xs text-text-muted flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-text-muted shrink-0" />
                            <span className="truncate max-w-[240px]">{f.address}</span>
                          </div>
                          <div className="text-[11px] text-text-muted font-mono flex items-center gap-1">
                            <Phone className="w-3 h-3 text-text-muted shrink-0" />
                            <span>{f.phone}</span>
                          </div>
                        </div>
                        <ArrowRight className="w-5 h-5 text-text-muted group-hover:text-emergency group-hover:translate-x-1 transition-all shrink-0 mt-1" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="text-center text-xs text-text-muted pt-8 pb-4">
          Raksha Emergency Infrastructure • Simulated Dispatch Terminal
        </div>
      </div>
    </>
  );
};
