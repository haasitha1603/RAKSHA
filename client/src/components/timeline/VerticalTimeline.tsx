import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle,
  Clock,
  AlertTriangle,
  Radio,
  MapPin,
  Car,
  Bell,
} from 'lucide-react';
import { format } from 'date-fns';

export interface TimelineItem {
  id: string;
  ts: string;
  type: string;
  title: string;
  description?: string;
  badge?: string;
}

export const VerticalTimeline: React.FC<{ items: TimelineItem[] }> = ({ items }) => {
  if (items.length === 0) {
    return <p className="text-xs text-text-muted italic py-3">No recorded timeline events yet.</p>;
  }

  const getIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'emergency_sos':
      case 'sos_triggered':
        return <ShieldAlert className="w-4 h-4 text-emergency" />;
      case 'safety_check_confirmed_safe':
      case 'arrived_safe':
        return <CheckCircle className="w-4 h-4 text-safe" />;
      case 'journey_started':
        return <MapPin className="w-4 h-4 text-primary" />;
      case 'guardian_on_my_way':
        return <Car className="w-4 h-4 text-primary" />;
      case 'responder_dispatched':
        return <Radio className="w-4 h-4 text-primary" />;
      case 'unacknowledged_alert':
        return <AlertTriangle className="w-4 h-4 text-caution" />;
      default:
        return <Bell className="w-4 h-4 text-text-muted" />;
    }
  };

  return (
    <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
      {items.map((item) => {
        let parsedDate = 'Just now';
        try {
          parsedDate = format(new Date(item.ts), 'HH:mm:ss');
        } catch {}

        let parsedDesc = item.description;
        try {
          if (item.description && item.description.startsWith('{')) {
            const obj = JSON.parse(item.description);
            parsedDesc = obj.message || obj.reason || obj.trigger || JSON.stringify(obj);
          }
        } catch {}

        return (
          <div key={item.id} className="relative group text-left">
            <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-surface border border-border flex items-center justify-center shadow-xs">
              {getIcon(item.type)}
            </div>

            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-semibold text-text">{item.title}</h4>
              <time className="text-[11px] text-text-muted flex items-center gap-1 font-mono">
                <Clock className="w-3 h-3" />
                {parsedDate}
              </time>
            </div>

            {parsedDesc && (
              <p className="mt-0.5 text-xs text-text-muted leading-relaxed">{parsedDesc}</p>
            )}
          </div>
        );
      })}
    </div>
  );
};
