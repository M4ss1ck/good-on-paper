import { create } from "zustand";
import { generateId } from "../lib/id";

export type SaveStatus = "idle" | "saving" | "saved";
export type ToastTone = "success" | "warning" | "error";

export interface ToastAction {
  label: string;
  run: () => void;
}

export interface DiffRequest {
  baseId: string;
  againstId: string;
}

export interface AdaptationDraft {
  jobOffer: string;
  additionalContext: string;
}

export interface Toast {
  id: string;
  message: string;
  tone: ToastTone;
  action?: ToastAction;
}
export type MobilePanel = "editor" | "preview";

interface UIStore {
  activeSection: string | null;
  pdfModalOpen: boolean;
  saveStatus: SaveStatus;
  storageError: string | null;
  mobilePanel: MobilePanel;
  toasts: Toast[];
  /** Job offer + extra context per CV, for the current session only. Never persisted. */
  adaptationDrafts: Record<string, AdaptationDraft>;
  /** Set to open the comparison view on a specific pair of CVs. */
  diffRequest: DiffRequest | null;
  setActiveSection: (id: string | null) => void;
  setPdfModalOpen: (open: boolean) => void;
  setSaveStatus: (status: SaveStatus) => void;
  setStorageError: (error: string | null) => void;
  setMobilePanel: (panel: MobilePanel) => void;
  setAdaptationDraft: (cvId: string, draft: Partial<AdaptationDraft>) => void;
  setDiffRequest: (request: DiffRequest | null) => void;
  pushToast: (toast: Omit<Toast, "id">) => void;
  dismissToast: (id: string) => void;
}

export const useUIStore = create<UIStore>()((set) => ({
  activeSection: null,
  pdfModalOpen: false,
  saveStatus: "idle" as SaveStatus,
  storageError: null,
  mobilePanel: "editor" as MobilePanel,
  toasts: [],
  adaptationDrafts: {},
  diffRequest: null,
  setActiveSection: (id) => set({ activeSection: id }),
  setPdfModalOpen: (open) => set({ pdfModalOpen: open }),
  setSaveStatus: (status) => set({ saveStatus: status }),
  setStorageError: (error) => set({ storageError: error }),
  setMobilePanel: (panel) => set({ mobilePanel: panel }),
  setAdaptationDraft: (cvId, draft) =>
    set((state) => ({
      adaptationDrafts: {
        ...state.adaptationDrafts,
        [cvId]: {
          ...(state.adaptationDrafts[cvId] ?? {
            jobOffer: "",
            additionalContext: "",
          }),
          ...draft,
        },
      },
    })),
  setDiffRequest: (request) => set({ diffRequest: request }),
  pushToast: (toast) =>
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id: generateId() }],
    })),
  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
