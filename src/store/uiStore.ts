import { create } from "zustand";

export type SaveStatus = "idle" | "saving" | "saved";
export type MobilePanel = "editor" | "preview";

interface UIStore {
  activeSection: string | null;
  pdfModalOpen: boolean;
  saveStatus: SaveStatus;
  storageError: string | null;
  mobilePanel: MobilePanel;
  setActiveSection: (id: string | null) => void;
  setPdfModalOpen: (open: boolean) => void;
  setSaveStatus: (status: SaveStatus) => void;
  setStorageError: (error: string | null) => void;
  setMobilePanel: (panel: MobilePanel) => void;
}

export const useUIStore = create<UIStore>()((set) => ({
  activeSection: null,
  pdfModalOpen: false,
  saveStatus: "idle" as SaveStatus,
  storageError: null,
  mobilePanel: "editor" as MobilePanel,
  setActiveSection: (id) => set({ activeSection: id }),
  setPdfModalOpen: (open) => set({ pdfModalOpen: open }),
  setSaveStatus: (status) => set({ saveStatus: status }),
  setStorageError: (error) => set({ storageError: error }),
  setMobilePanel: (panel) => set({ mobilePanel: panel }),
}));
