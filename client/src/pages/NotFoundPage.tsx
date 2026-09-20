import React from 'react';
import { ShieldAlert, Home, Phone } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

export const NotFoundPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>404 — Page Not Found — Raksha</title>
      </Helmet>

      <div className="min-h-screen bg-bg text-text flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-surface border border-border rounded-3xl p-8 text-center space-y-6 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-primary-soft text-primary mx-auto flex items-center justify-center">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="font-heading font-bold text-3xl text-text">404</h1>
            <h2 className="font-heading font-bold text-lg text-text">Route Not Found</h2>
            <p className="text-xs text-text-muted leading-relaxed">
              The safety page or checkpoint you are looking for does not exist or has been moved.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              to="/"
              className="flex-1 py-3 px-4 bg-primary text-primary-foreground font-semibold text-xs rounded-xl hover:bg-primary-hover shadow-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <Home className="w-4 h-4" />
              <span>Return Home</span>
            </Link>

            <a
              href="tel:112"
              className="flex-1 py-3 px-4 bg-emergency text-emergency-foreground font-semibold text-xs rounded-xl hover:bg-emergency/90 shadow-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <Phone className="w-4 h-4" />
              <span>Call 112</span>
            </a>
          </div>

          <p className="text-[11px] text-text-muted">
            Emergency hotline 112 is always active across India.
          </p>
        </div>
      </div>
    </>
  );
};
