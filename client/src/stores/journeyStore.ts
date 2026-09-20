import { create } from 'zustand';
import {
  JourneyRow,
  RiskLevel,
  RiskExplanationItem,
  PositionBatchItem,
} from '@raksha/shared';
import { apiFetch } from '../lib/api.js';
import { enqueueOfflinePositions, getOfflinePositions, clearOfflinePositions } from '../lib/db.js';
import { getSocket } from '../lib/socket.js';

interface JourneyStore {
  activeJourney: JourneyRow | null;
  currentLocation: {
    lat: number;
    lng: number;
    acc: number;
    speed: number | null;
    heading: number | null;
    ts: string;
  } | null;
  battery: number | null;
  isOnline: boolean;
  riskLevel: RiskLevel;
  riskScore: number;
  riskExplanations: RiskExplanationItem[];
  activeSafetyCheck: { id: string; dueAt: string; message?: string } | null;
  shakeEnabled: boolean;
  voiceEnabled: boolean;

  setActiveJourney: (j: JourneyRow | null) => void;
  setCurrentLocation: (loc: any) => void;
  setBattery: (b: number | null) => void;
  setOnline: (o: boolean) => void;
  setRiskState: (level: RiskLevel, score: number, explanations?: RiskExplanationItem[]) => void;
  setActiveSafetyCheck: (check: { id: string; dueAt: string; message?: string } | null) => void;
  toggleShake: (enabled: boolean) => void;
  toggleVoice: (enabled: boolean) => void;

  ingestPosition: (pos: PositionBatchItem) => Promise<void>;
  respondSafetyCheck: (response: 'safe' | 'help') => Promise<void>;
}

let batchQueue: PositionBatchItem[] = [];
let batchTimeout: number | null = null;

export const useJourneyStore = create<JourneyStore>((set, get) => ({
  activeJourney: null,
  currentLocation: null,
  battery: null,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  riskLevel: 0,
  riskScore: 0,
  riskExplanations: [],
  activeSafetyCheck: null,
  shakeEnabled: true,
  voiceEnabled: false,

  setActiveJourney: (activeJourney) => {
    set({
      activeJourney,
      riskLevel: activeJourney?.level ?? 0,
      riskScore: activeJourney?.risk_score ?? 0,
    });
    if (activeJourney) {
      const socket = getSocket();
      socket.emit('join', { room: `journey:${activeJourney.id}` });
    }
  },

  setCurrentLocation: (currentLocation) => set({ currentLocation }),
  setBattery: (battery) => set({ battery }),
  setOnline: (isOnline) => set({ isOnline }),
  setRiskState: (riskLevel, riskScore, riskExplanations = []) =>
    set({ riskLevel, riskScore, riskExplanations }),
  setActiveSafetyCheck: (activeSafetyCheck) => set({ activeSafetyCheck }),
  toggleShake: (shakeEnabled) => set({ shakeEnabled }),
  toggleVoice: (voiceEnabled) => set({ voiceEnabled }),

  ingestPosition: async (pos) => {
    set({
      currentLocation: {
        lat: pos.lat,
        lng: pos.lng,
        acc: pos.acc,
        speed: pos.speed,
        heading: pos.heading,
        ts: pos.ts,
      },
    });

    const journey = get().activeJourney;
    if (!journey) return;

    batchQueue.push(pos);

    // Debounce / batch ingest every 2-3 positions
    if (!batchTimeout) {
      batchTimeout = window.setTimeout(async () => {
        batchTimeout = null;
        const currentBatch = [...batchQueue];
        batchQueue = [];

        if (navigator.onLine) {
          try {
            // Also flush any pending offline positions
            const offlinePts = await getOfflinePositions();
            const toSend = [...offlinePts, ...currentBatch];
            if (offlinePts.length > 0) {
              await clearOfflinePositions();
            }

            const res = await apiFetch<any>(`/api/journeys/${journey.id}/positions`, {
              method: 'POST',
              body: JSON.stringify({ positions: toSend }),
            });

            set({
              riskLevel: res.level,
              riskScore: res.riskScore,
              riskExplanations: res.explanations || [],
            });

            if (res.prompts && res.prompts.length > 0) {
              const checkPrompt = res.prompts.find((p: any) => p.type === 'safety_check');
              if (checkPrompt) {
                set({ activeSafetyCheck: checkPrompt });
              }
            }
          } catch (err) {
            console.warn('Position sync failed, queuing to IndexedDB:', err);
            await enqueueOfflinePositions(currentBatch);
          }
        } else {
          await enqueueOfflinePositions(currentBatch);
        }
      }, 2500);
    }
  },

  respondSafetyCheck: async (response) => {
    const { activeJourney, activeSafetyCheck } = get();
    if (!activeJourney || !activeSafetyCheck) return;

    try {
      await apiFetch(`/api/journeys/${activeJourney.id}/safety-check/${activeSafetyCheck.id}/respond`, {
        method: 'POST',
        body: JSON.stringify({ response }),
      });
      set({ activeSafetyCheck: null });
    } catch (err) {
      console.error('Failed to respond to safety check:', err);
    }
  },
}));
