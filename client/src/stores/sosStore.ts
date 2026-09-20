import { create } from 'zustand';
import { EmergencyContextPacket } from '@raksha/shared';
import { apiFetch } from '../lib/api.js';

interface SosStore {
  pendingSos: {
    id: string;
    cancelUntil: string;
    windowMs: number;
  } | null;
  activeIncident: {
    id: string;
    packet: EmergencyContextPacket;
    status: string;
    duress?: boolean;
    discreet?: boolean;
  } | null;
  discreetMode: boolean;

  setPendingSos: (sos: { id: string; cancelUntil: string; windowMs: number } | null) => void;
  setActiveIncident: (inc: any) => void;
  setDiscreetMode: (d: boolean) => void;

  triggerSos: (params: {
    journeyId?: string;
    trigger?: string;
    discreet?: boolean;
    location: { lat: number; lng: number; acc?: number };
  }) => Promise<void>;

  cancelSos: (pin?: string) => Promise<boolean>;
  confirmSos: () => Promise<void>;
  resolveIncident: (pin: string, falseAlarm?: boolean) => Promise<void>;
}

export const useSosStore = create<SosStore>((set, get) => ({
  pendingSos: null,
  activeIncident: null,
  discreetMode: false,

  setPendingSos: (pendingSos) => set({ pendingSos }),
  setActiveIncident: (activeIncident) => set({ activeIncident }),
  setDiscreetMode: (discreetMode) => set({ discreetMode }),

  triggerSos: async (params) => {
    try {
      const res = await apiFetch<any>('/api/sos', {
        method: 'POST',
        body: JSON.stringify({
          journeyId: params.journeyId,
          trigger: params.trigger || 'button',
          discreet: params.discreet || false,
          location: params.location,
        }),
      });

      set({
        pendingSos: {
          id: res.sosId,
          cancelUntil: res.cancelUntil,
          windowMs: res.windowMs || 10000,
        },
        discreetMode: params.discreet || false,
      });
    } catch (err) {
      console.error('Failed to trigger SOS:', err);
      throw err;
    }
  },

  cancelSos: async (pin) => {
    const { pendingSos } = get();
    if (!pendingSos) return true;

    try {
      await apiFetch(`/api/sos/${pendingSos.id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ pin }),
      });
      set({ pendingSos: null });
      return true;
    } catch (err) {
      console.error('Failed to cancel SOS:', err);
      throw err;
    }
  },

  confirmSos: async () => {
    const { pendingSos } = get();
    if (!pendingSos) return;

    try {
      const res = await apiFetch<any>(`/api/sos/${pendingSos.id}/confirm`, {
        method: 'POST',
      });
      set({ pendingSos: null });

      // Fetch incident
      if (res.incidentId) {
        const incData = await apiFetch<any>(`/api/incidents/${res.incidentId}`);
        set({
          activeIncident: {
            id: res.incidentId,
            packet: JSON.parse(incData.incident.packet_json || '{}'),
            status: incData.incident.status,
            duress: Boolean(incData.incident.duress),
            discreet: Boolean(incData.incident.discreet),
          },
        });
      }
    } catch (err) {
      console.error('Failed to confirm SOS:', err);
    }
  },

  resolveIncident: async (pin, falseAlarm = false) => {
    const { activeIncident } = get();
    if (!activeIncident) return;

    try {
      await apiFetch(`/api/incidents/${activeIncident.id}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ pin, falseAlarm }),
      });
      set({ activeIncident: null });
    } catch (err) {
      console.error('Failed to resolve incident:', err);
      throw err;
    }
  },
}));
