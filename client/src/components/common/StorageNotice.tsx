import React from 'react';
import { useSettingsStore } from '../../stores/settingsStore.js';
import { Link } from 'react-router-dom';
import { ShieldCheck, X } from 'lucide-react';

export const StorageNotice: React.FC = () => {
  const { storageNoticeDismissed, dismissStorageNotice } = useSettingsStore();

  if (storageNoticeDismissed) return null;

  return (
    <div
      role="region"
      aria-label="Storage and Privacy Notice"
      className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-40 bg-surface border border-border rounded-card p-4 shadow-xl text-sm"
    >
      <div className="flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1">
          <p className="font-semibold text-text">Privacy by Design</p>
          <p className="text-text-muted mt-1 text-xs leading-relaxed">
            Raksha only uses strictly necessary local storage and session tokens to monitor journeys and secure emergency responses. Zero analytics, no ad tracking, and no third-party scripts.{' '}
            <Link to="/legal/cookies" className="text-primary underline hover:text-primary-hover">
              Learn about our storage
            </Link>.
          </p>
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              onClick={dismissStorageNotice}
              className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-md hover:bg-primary-hover transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
        <button
          onClick={dismissStorageNotice}
          aria-label="Dismiss storage notice"
          className="text-text-muted hover:text-text p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
