import { create } from 'zustand';

export type ThemeMode = 'auto' | 'light' | 'dark';
export type TextSize = 'normal' | 'large' | 'xl';
export type SosStyle = 'hold' | 'triple_tap' | 'confirm';

interface SettingsStore {
  theme: ThemeMode;
  textSize: TextSize;
  highContrast: boolean;
  hapticFeedback: boolean;
  storageNoticeDismissed: boolean;
  timingProfile: 'production' | 'demo';
  sosStyle: SosStyle;
  discreetDefault: boolean;

  setTheme: (theme: ThemeMode) => void;
  setTextSize: (size: TextSize) => void;
  setHighContrast: (hc: boolean) => void;
  setHapticFeedback: (hf: boolean) => void;
  dismissStorageNotice: () => void;
  setTimingProfile: (profile: 'production' | 'demo') => void;
  setSosStyle: (style: SosStyle) => void;
  setDiscreetDefault: (discreet: boolean) => void;
  applyDomSettings: () => void;
}

const STORAGE_THEME_KEY = 'raksha_theme';
const STORAGE_TEXT_SIZE_KEY = 'raksha_text_size';
const STORAGE_NOTICE_KEY = 'raksha_storage_notice_ack';
const STORAGE_HC_KEY = 'raksha_high_contrast';
const STORAGE_HAPTIC_KEY = 'raksha_haptic';

export const useSettingsStore = create<SettingsStore>((set, get) => {
  const initialTheme = (typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_THEME_KEY) : 'auto') as ThemeMode || 'auto';
  const initialTextSize = (typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_TEXT_SIZE_KEY) : 'normal') as TextSize || 'normal';
  const initialNotice = typeof localStorage !== 'undefined' ? Boolean(localStorage.getItem(STORAGE_NOTICE_KEY)) : false;
  const initialHC = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_HC_KEY) === 'true' : false;
  const initialHaptic = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_HAPTIC_KEY) !== 'false' : true;

  return {
    theme: initialTheme,
    textSize: initialTextSize,
    highContrast: initialHC,
    hapticFeedback: initialHaptic,
    storageNoticeDismissed: initialNotice,
    timingProfile: 'production',
    sosStyle: 'hold',
    discreetDefault: false,

    setTheme: (theme) => {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_THEME_KEY, theme);
      }
      set({ theme });
      get().applyDomSettings();
    },

    setTextSize: (textSize) => {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_TEXT_SIZE_KEY, textSize);
      }
      set({ textSize });
      get().applyDomSettings();
    },

    setHighContrast: (highContrast) => {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_HC_KEY, String(highContrast));
      }
      set({ highContrast });
      get().applyDomSettings();
    },

    setHapticFeedback: (hapticFeedback) => {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_HAPTIC_KEY, String(hapticFeedback));
      }
      set({ hapticFeedback });
    },

    dismissStorageNotice: () => {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_NOTICE_KEY, 'true');
      }
      set({ storageNoticeDismissed: true });
    },

    setTimingProfile: (timingProfile) => set({ timingProfile }),
    setSosStyle: (sosStyle) => set({ sosStyle }),
    setDiscreetDefault: (discreetDefault) => set({ discreetDefault }),

    applyDomSettings: () => {
      if (typeof document === 'undefined') return;
      const { theme, textSize, highContrast } = get();
      const html = document.documentElement;

      // Apply theme
      if (theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        html.classList.add('dark');
      } else {
        html.classList.remove('dark');
      }

      // Apply text size
      html.classList.remove('text-size-large', 'text-size-xl');
      if (textSize === 'large') {
        html.classList.add('text-size-large');
      } else if (textSize === 'xl') {
        html.classList.add('text-size-xl');
      }

      // Apply high contrast
      if (highContrast) {
        html.classList.add('high-contrast');
      } else {
        html.classList.remove('high-contrast');
      }
    },
  };
});
