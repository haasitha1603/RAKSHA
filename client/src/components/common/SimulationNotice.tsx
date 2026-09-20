import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { APPROVED_HONEST_COPY } from '@raksha/shared';

export const SimulationNotice: React.FC<{ forceShow?: boolean }> = ({ forceShow = false }) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed && !forceShow) return null;

  return (
    <div
      role="status"
      className="bg-caution-bg border border-caution/40 text-caution text-xs px-3 py-2 rounded-lg flex items-center justify-between gap-2 shadow-sm"
    >
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 flex-shrink-0 text-caution" aria-hidden="true" />
        <span className="font-medium">{APPROVED_HONEST_COPY.simulationNotice}</span>
      </div>
      {!forceShow && (
        <button
          onClick={() => setDismissed(true)}
          className="text-caution/80 hover:text-caution p-1"
          aria-label="Dismiss disclaimer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
