import React, { useState, useEffect } from 'react';
import { WifiOff, PhoneCall, MessageSquare } from 'lucide-react';
import { useJourneyStore } from '../../stores/journeyStore.js';

export const OfflineBanner: React.FC = () => {
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const { currentLocation } = useJourneyStore();

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (online) return null;

  const lat = currentLocation?.lat || 28.6139;
  const lng = currentLocation?.lng || 77.2090;
  const smsBody = encodeURIComponent(
    `[EMERGENCY SMS] I need help! My location: https://maps.google.com/?q=${lat},${lng}. (Sent offline via Raksha)`
  );

  return (
    <div
      role="alert"
      className="bg-emergency-bg border-b border-emergency text-emergency-text px-4 py-2.5 text-xs z-50 flex flex-wrap items-center justify-between gap-3 shadow-md"
    >
      <div className="flex items-center gap-2">
        <WifiOff className="w-4 h-4 flex-shrink-0 text-emergency" aria-hidden="true" />
        <span className="font-semibold">
          No internet connection. Journey points are recorded locally.
        </span>
      </div>

      <div className="flex items-center gap-2">
        <a
          href={`sms:?body=${smsBody}`}
          className="inline-flex items-center gap-1 px-2.5 py-1 bg-surface border border-border rounded font-semibold text-text hover:bg-surface-raised transition-colors"
        >
          <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
          Send SMS Now
        </a>
        <a
          href="tel:112"
          className="inline-flex items-center gap-1 px-2.5 py-1 bg-emergency text-white rounded font-bold hover:bg-red-700 transition-colors"
        >
          <PhoneCall className="w-3.5 h-3.5" aria-hidden="true" />
          Call 112
        </a>
      </div>
    </div>
  );
};
