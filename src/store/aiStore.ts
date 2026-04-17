import { create } from "zustand";
import type { AIProvider, AISettings } from "../types/ai";
import { isProviderId } from "../lib/ai/providers";

const STORAGE_KEY = "gop-ai-settings";

function loadSettings(): AISettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { provider: null };
    const parsed = JSON.parse(raw) as AISettings;
    if (parsed.provider && !isProviderId(parsed.provider.id)) {
      return { provider: null };
    }
    return parsed;
  } catch {
    return { provider: null };
  }
}

function saveSettings(settings: AISettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

interface AIStore {
  settings: AISettings;
  settingsOpen: boolean;
  setProvider: (provider: AIProvider) => void;
  clearProvider: () => void;
  setSettingsOpen: (open: boolean) => void;
}

export const useAIStore = create<AIStore>()((set) => ({
  settings: loadSettings(),
  settingsOpen: false,

  setProvider: (provider) =>
    set((state) => {
      const settings = { ...state.settings, provider };
      saveSettings(settings);
      return { settings };
    }),

  clearProvider: () =>
    set((state) => {
      const settings = { ...state.settings, provider: null };
      saveSettings(settings);
      return { settings };
    }),

  setSettingsOpen: (open) => set({ settingsOpen: open }),
}));
