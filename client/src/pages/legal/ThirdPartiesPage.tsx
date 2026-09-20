import React from 'react';
import { ExternalLink, Database, Globe } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { Navbar } from '../../components/layout/Navbar.js';
import { Footer } from '../../components/layout/Footer.js';

export const ThirdPartiesPage: React.FC = () => {
  const providers = [
    {
      name: 'OpenStreetMap (OSM) & CartoDB',
      purpose: 'Map cartography, baseline tiles, and road geometries.',
      privacyLink: 'https://wiki.osmfoundation.org/wiki/Privacy_Policy',
      dataSent: 'IP address during raster tile fetching.',
    },
    {
      name: 'Open Source Routing Machine (OSRM) / Overpass API',
      purpose: 'Road graph routing and street lighting attribute queries.',
      privacyLink: 'https://overpass-api.de/',
      dataSent: 'Route origin and destination coordinates (no user identity attached).',
    },
    {
      name: 'Nominatim (OpenStreetMap)',
      purpose: 'Geocoding and reverse geocoding of place names.',
      privacyLink: 'https://operations.osmfoundation.org/policies/nominatim/',
      dataSent: 'Searched query strings and GPS pins.',
    },
  ];

  return (
    <>
      <Helmet>
        <title>Third-Party Services &amp; Subprocessors — Raksha</title>
      </Helmet>

      <div className="min-h-screen bg-bg text-text flex flex-col justify-between">
        <Navbar />

        <main className="max-w-3xl mx-auto px-4 py-10 space-y-8 flex-1">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-soft text-primary font-bold text-xs rounded-full">
              <Globe className="w-3.5 h-3.5" />
              <span>Transparency Registry</span>
            </div>
            <h1 className="font-heading font-bold text-3xl sm:text-4xl text-text">
              Third-Party Services &amp; Subprocessors
            </h1>
            <p className="text-xs text-text-muted">
              Raksha maintains an open inventory of all external infrastructure components.
            </p>
          </div>

          <div className="space-y-4">
            {providers.map((p) => (
              <div
                key={p.name}
                className="p-5 bg-surface border border-border rounded-2xl shadow-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-heading font-bold text-sm text-text">{p.name}</h2>
                  <a
                    href={p.privacyLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                  >
                    <span>Privacy Notice</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  <strong>Role:</strong> {p.purpose}
                </p>
                <p className="text-xs text-text-muted leading-relaxed font-mono text-[11px] bg-surface-raised p-2 rounded-lg border border-border">
                  Data Shared: {p.dataSent}
                </p>
              </div>
            ))}
          </div>

          <div className="p-4 bg-surface border border-border rounded-2xl text-xs text-text-muted leading-relaxed">
            <strong className="block text-text mb-1">Zero Advertising Partners</strong>
            Raksha does not partner with, sell telemetry to, or transmit user data to ad brokers, analytics corporations, or data aggregators.
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};
