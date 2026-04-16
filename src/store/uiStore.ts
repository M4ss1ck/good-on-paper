import { create } from "zustand";

export type SaveStatus = "idle" | "saving" | "saved";

interface UIStore {
  activeSection: string | null;
  pdfModalOpen: boolean;
  saveStatus: SaveStatus;
  setActiveSection: (id: string | null) => void;
  setPdfModalOpen: (open: boolean) => void;
  setSaveStatus: (status: SaveStatus) => void;
}

export const useUIStore = create<UIStore>()((set) => ({
  activeSection: null,
  pdfModalOpen: false,
  saveStatus: "idle" as SaveStatus,
  setActiveSection: (id) => set({ activeSection: id }),
  setPdfModalOpen: (open) => set({ pdfModalOpen: open }),
  setSaveStatus: (status) => set({ saveStatus: status }),
}));
