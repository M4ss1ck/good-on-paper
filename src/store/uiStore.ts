import { create } from "zustand";

interface UIStore {
  activeSection: string | null;
  pdfModalOpen: boolean;
  setActiveSection: (id: string | null) => void;
  setPdfModalOpen: (open: boolean) => void;
}

export const useUIStore = create<UIStore>()((set) => ({
  activeSection: null,
  pdfModalOpen: false,
  setActiveSection: (id) => set({ activeSection: id }),
  setPdfModalOpen: (open) => set({ pdfModalOpen: open }),
}));
