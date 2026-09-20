import React from 'react';
import { ShieldCheck, AlertTriangle, AlertCircle, AlertOctagon } from 'lucide-react';
import { RiskLevel } from '@raksha/shared';

interface StatusChipProps {
  level: RiskLevel;
  score?: number;
  className?: string;
  showScore?: boolean;
}

export const StatusChip: React.FC<StatusChipProps> = ({
  level,
  score,
  className = '',
  showScore = true,
}) => {
  switch (level) {
    case 0:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-safe-bg text-safe border border-safe/30 ${className}`}
        >
          <ShieldCheck className="w-4 h-4 text-safe" aria-hidden="true" />
          <span>Normal</span>
          {showScore && score != null && <span className="opacity-80">({score})</span>}
        </span>
      );
    case 1:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-caution-bg text-caution border border-caution/40 ${className}`}
        >
          <AlertTriangle className="w-4 h-4 text-caution" aria-hidden="true" />
          <span>Caution</span>
          {showScore && score != null && <span className="opacity-80">({score})</span>}
        </span>
      );
    case 2:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-check-bg text-check border border-check/40 ${className}`}
        >
          <AlertCircle className="w-4 h-4 text-check animate-pulse" aria-hidden="true" />
          <span>Safety Check</span>
          {showScore && score != null && <span className="opacity-80">({score})</span>}
        </span>
      );
    case 3:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emergency-bg text-emergency-text border border-emergency ${className}`}
        >
          <AlertOctagon className="w-4 h-4 text-emergency animate-bounce" aria-hidden="true" />
          <span>Emergency</span>
          {showScore && score != null && <span className="opacity-80">({score})</span>}
        </span>
      );
    default:
      return null;
  }
};
