import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type {
  CV,
  CVMeta,
  SectionType,
  SectionItem,
  ExperienceItem,
} from "../types/cv";
import { createDefaultCV } from "../lib/defaults";
import { generateId } from "../lib/id";
import { loadCV, createDebouncedSave } from "../lib/storage";

const defaultTitles: Record<SectionType, string> = {
  summary: "Summary",
  skills: "Technical Skills",
  experience: "Professional Experience",
  education: "Education",
  languages: "Languages",
  custom: "Custom Section",
};

function createEmptyItem(type: SectionType): SectionItem {
  const id = generateId();
  switch (type) {
    case "summary":
      return { id, content: "" };
    case "skills":
      return { id, category: "", items: [] };
    case "experience":
      return {
        id,
        role: "",
        company: "",
        location: "",
        startDate: "",
        endDate: "",
        bullets: [],
      };
    case "education":
      return { id, degree: "", institution: "", dates: "" };
    case "languages":
      return { id, language: "", level: "" };
    case "custom":
      return { id, content: "" };
  }
}

interface CVStore {
  cv: CV;

  // Meta
  updateMeta: (meta: Partial<CVMeta>) => void;

  // Sections
  addSection: (type: SectionType) => void;
  removeSection: (sectionId: string) => void;
  moveSection: (fromIndex: number, toIndex: number) => void;
  updateSectionTitle: (sectionId: string, title: string) => void;
  toggleSectionVisibility: (sectionId: string) => void;

  // Items
  addItem: (sectionId: string) => void;
  removeItem: (sectionId: string, itemId: string) => void;
  updateItem: (
    sectionId: string,
    itemId: string,
    data: Partial<SectionItem>,
  ) => void;

  // Experience-specific (bullets)
  addBullet: (sectionId: string, itemId: string) => void;
  removeBullet: (
    sectionId: string,
    itemId: string,
    bulletIndex: number,
  ) => void;
  updateBullet: (
    sectionId: string,
    itemId: string,
    bulletIndex: number,
    text: string,
  ) => void;

  // Persistence
  loadFromStorage: () => void;
  exportJson: () => string;
  importJson: (json: string) => void;
}

const debouncedSave = createDebouncedSave(500);

export const useCVStore = create<CVStore>()(
  immer((set, get) => ({
    cv: createDefaultCV(),

    updateMeta: (meta) =>
      set((state) => {
        Object.assign(state.cv.meta, meta);
      }),

    addSection: (type) =>
      set((state) => {
        state.cv.sections.push({
          id: generateId(),
          type,
          title: defaultTitles[type],
          visible: true,
          items: [],
        });
      }),

    removeSection: (sectionId) =>
      set((state) => {
        state.cv.sections = state.cv.sections.filter(
          (s) => s.id !== sectionId,
        );
      }),

    moveSection: (fromIndex, toIndex) =>
      set((state) => {
        const [section] = state.cv.sections.splice(fromIndex, 1);
        state.cv.sections.splice(toIndex, 0, section);
      }),

    updateSectionTitle: (sectionId, title) =>
      set((state) => {
        const section = state.cv.sections.find((s) => s.id === sectionId);
        if (section) section.title = title;
      }),

    toggleSectionVisibility: (sectionId) =>
      set((state) => {
        const section = state.cv.sections.find((s) => s.id === sectionId);
        if (section) section.visible = !section.visible;
      }),

    addItem: (sectionId) =>
      set((state) => {
        const section = state.cv.sections.find((s) => s.id === sectionId);
        if (section) {
          section.items.push(createEmptyItem(section.type));
        }
      }),

    removeItem: (sectionId, itemId) =>
      set((state) => {
        const section = state.cv.sections.find((s) => s.id === sectionId);
        if (section) {
          section.items = section.items.filter(
            (item) => !("id" in item) || item.id !== itemId,
          );
        }
      }),

    updateItem: (sectionId, itemId, data) =>
      set((state) => {
        const section = state.cv.sections.find((s) => s.id === sectionId);
        if (section) {
          const item = section.items.find(
            (i) => "id" in i && i.id === itemId,
          );
          if (item) Object.assign(item, data);
        }
      }),

    addBullet: (sectionId, itemId) =>
      set((state) => {
        const section = state.cv.sections.find((s) => s.id === sectionId);
        if (section) {
          const item = section.items.find(
            (i) => "id" in i && i.id === itemId,
          ) as ExperienceItem | undefined;
          if (item?.bullets) {
            item.bullets.push("");
          }
        }
      }),

    removeBullet: (sectionId, itemId, bulletIndex) =>
      set((state) => {
        const section = state.cv.sections.find((s) => s.id === sectionId);
        if (section) {
          const item = section.items.find(
            (i) => "id" in i && i.id === itemId,
          ) as ExperienceItem | undefined;
          if (item?.bullets) {
            item.bullets.splice(bulletIndex, 1);
          }
        }
      }),

    updateBullet: (sectionId, itemId, bulletIndex, text) =>
      set((state) => {
        const section = state.cv.sections.find((s) => s.id === sectionId);
        if (section) {
          const item = section.items.find(
            (i) => "id" in i && i.id === itemId,
          ) as ExperienceItem | undefined;
          if (item?.bullets) {
            item.bullets[bulletIndex] = text;
          }
        }
      }),

    loadFromStorage: () => {
      const saved = loadCV();
      if (saved) {
        set({ cv: saved });
      }
    },

    exportJson: () => JSON.stringify(get().cv, null, 2),

    importJson: (json) => {
      try {
        const cv = JSON.parse(json) as CV;
        set({ cv });
      } catch {
        console.error("Failed to import CV from JSON");
      }
    },
  })),
);

// Auto-save to localStorage on every change (debounced 500ms)
useCVStore.subscribe((state) => {
  debouncedSave(state.cv);
});
