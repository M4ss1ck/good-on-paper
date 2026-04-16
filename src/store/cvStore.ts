import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type {
  CV,
  CVMeta,
  CVSettings,
  CVWorkspace,
  SectionType,
  SectionItem,
  ExperienceItem,
} from "../types/cv";
import { createDefaultCV, createDefaultWorkspace } from "../lib/defaults";
import { generateId } from "../lib/id";
import { loadWorkspace, createDebouncedSave } from "../lib/storage";
import { useUIStore } from "./uiStore";

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

/** Helper: get the active CV from a workspace (mutable for immer) */
function getActive(workspace: CVWorkspace): CV | null {
  if (!workspace.activeCvId) return null;
  return workspace.cvs[workspace.activeCvId] ?? null;
}

interface CVStore {
  workspace: CVWorkspace;

  // Computed
  activeCv: () => CV | null;

  // Workspace actions
  createCV: (name: string) => string;
  duplicateCV: (sourceId: string, newName: string) => string;
  forkCV: (sourceId: string, newName: string) => string;
  renameCV: (id: string, name: string) => void;
  deleteCV: (id: string) => void;
  setActiveCV: (id: string) => void;
  reorderCVs: (fromIndex: number, toIndex: number) => void;

  // Meta
  updateMeta: (meta: Partial<CVMeta>) => void;

  // Settings
  updateSettings: (settings: Partial<CVSettings>) => void;

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
  resetCV: () => void;
}

const debouncedSave = createDebouncedSave(
  500,
  () => {
    useUIStore.getState().setSaveStatus("saved");
    useUIStore.getState().setStorageError(null);
  },
  (error) => {
    useUIStore.getState().setSaveStatus("idle");
    useUIStore.getState().setStorageError(error);
  },
);

export const useCVStore = create<CVStore>()(
  immer((set, get) => ({
    workspace: createDefaultWorkspace(),

    // ── Computed ────────────────────────────────────────────
    activeCv: () => {
      const { workspace } = get();
      if (!workspace.activeCvId) return null;
      return workspace.cvs[workspace.activeCvId] ?? null;
    },

    // ── Workspace actions ──────────────────────────────────
    createCV: (name) => {
      const cv = createDefaultCV();
      cv.name = name;
      set((state) => {
        state.workspace.cvs[cv.id] = cv;
        state.workspace.order.push(cv.id);
        state.workspace.activeCvId = cv.id;
      });
      return cv.id;
    },

    duplicateCV: (sourceId, newName) => {
      const source = get().workspace.cvs[sourceId];
      if (!source) return "";
      const now = new Date().toISOString();
      const newId = generateId();
      const clone: CV = JSON.parse(JSON.stringify(source));
      clone.id = newId;
      clone.name = newName;
      clone.createdAt = now;
      clone.updatedAt = now;
      clone.parentId = null;
      // Regenerate section/item ids to avoid collisions
      set((state) => {
        state.workspace.cvs[newId] = clone;
        const idx = state.workspace.order.indexOf(sourceId);
        state.workspace.order.splice(idx + 1, 0, newId);
        state.workspace.activeCvId = newId;
      });
      return newId;
    },

    forkCV: (sourceId, newName) => {
      const source = get().workspace.cvs[sourceId];
      if (!source) return "";
      const now = new Date().toISOString();
      const newId = generateId();
      const clone: CV = JSON.parse(JSON.stringify(source));
      clone.id = newId;
      clone.name = newName;
      clone.createdAt = now;
      clone.updatedAt = now;
      clone.parentId = sourceId;
      set((state) => {
        state.workspace.cvs[newId] = clone;
        const idx = state.workspace.order.indexOf(sourceId);
        state.workspace.order.splice(idx + 1, 0, newId);
        state.workspace.activeCvId = newId;
      });
      return newId;
    },

    renameCV: (id, name) =>
      set((state) => {
        const cv = state.workspace.cvs[id];
        if (cv) {
          cv.name = name;
          cv.updatedAt = new Date().toISOString();
        }
      }),

    deleteCV: (id) =>
      set((state) => {
        // Prevent deleting the last CV
        if (state.workspace.order.length <= 1) return;

        // Unlink any forks that reference this CV
        for (const cv of Object.values(state.workspace.cvs)) {
          if (cv.parentId === id) {
            cv.parentId = null;
          }
        }

        delete state.workspace.cvs[id];
        state.workspace.order = state.workspace.order.filter((i) => i !== id);

        if (state.workspace.activeCvId === id) {
          state.workspace.activeCvId = state.workspace.order[0] ?? null;
        }
      }),

    setActiveCV: (id) =>
      set((state) => {
        if (state.workspace.cvs[id]) {
          state.workspace.activeCvId = id;
        }
      }),

    reorderCVs: (fromIndex, toIndex) =>
      set((state) => {
        const [id] = state.workspace.order.splice(fromIndex, 1);
        state.workspace.order.splice(toIndex, 0, id);
      }),

    // ── Content actions (operate on activeCv) ──────────────
    updateMeta: (meta) =>
      set((state) => {
        const cv = getActive(state.workspace);
        if (!cv) return;
        Object.assign(cv.meta, meta);
        cv.updatedAt = new Date().toISOString();
      }),

    updateSettings: (settings) =>
      set((state) => {
        const cv = getActive(state.workspace);
        if (!cv) return;
        if (!cv.settings) cv.settings = { fontFamily: "Roboto" };
        Object.assign(cv.settings, settings);
        cv.updatedAt = new Date().toISOString();
      }),

    addSection: (type) =>
      set((state) => {
        const cv = getActive(state.workspace);
        if (!cv) return;
        cv.sections.push({
          id: generateId(),
          type,
          title: defaultTitles[type],
          visible: true,
          items: [],
        });
        cv.updatedAt = new Date().toISOString();
      }),

    removeSection: (sectionId) =>
      set((state) => {
        const cv = getActive(state.workspace);
        if (!cv) return;
        cv.sections = cv.sections.filter((s) => s.id !== sectionId);
        cv.updatedAt = new Date().toISOString();
      }),

    moveSection: (fromIndex, toIndex) =>
      set((state) => {
        const cv = getActive(state.workspace);
        if (!cv) return;
        const [section] = cv.sections.splice(fromIndex, 1);
        cv.sections.splice(toIndex, 0, section);
        cv.updatedAt = new Date().toISOString();
      }),

    updateSectionTitle: (sectionId, title) =>
      set((state) => {
        const cv = getActive(state.workspace);
        if (!cv) return;
        const section = cv.sections.find((s) => s.id === sectionId);
        if (section) {
          section.title = title;
          cv.updatedAt = new Date().toISOString();
        }
      }),

    toggleSectionVisibility: (sectionId) =>
      set((state) => {
        const cv = getActive(state.workspace);
        if (!cv) return;
        const section = cv.sections.find((s) => s.id === sectionId);
        if (section) {
          section.visible = !section.visible;
          cv.updatedAt = new Date().toISOString();
        }
      }),

    addItem: (sectionId) =>
      set((state) => {
        const cv = getActive(state.workspace);
        if (!cv) return;
        const section = cv.sections.find((s) => s.id === sectionId);
        if (section) {
          section.items.push(createEmptyItem(section.type));
          cv.updatedAt = new Date().toISOString();
        }
      }),

    removeItem: (sectionId, itemId) =>
      set((state) => {
        const cv = getActive(state.workspace);
        if (!cv) return;
        const section = cv.sections.find((s) => s.id === sectionId);
        if (section) {
          section.items = section.items.filter(
            (item) => !("id" in item) || item.id !== itemId,
          );
          cv.updatedAt = new Date().toISOString();
        }
      }),

    updateItem: (sectionId, itemId, data) =>
      set((state) => {
        const cv = getActive(state.workspace);
        if (!cv) return;
        const section = cv.sections.find((s) => s.id === sectionId);
        if (section) {
          const item = section.items.find(
            (i) => "id" in i && i.id === itemId,
          );
          if (item) {
            Object.assign(item, data);
            cv.updatedAt = new Date().toISOString();
          }
        }
      }),

    addBullet: (sectionId, itemId) =>
      set((state) => {
        const cv = getActive(state.workspace);
        if (!cv) return;
        const section = cv.sections.find((s) => s.id === sectionId);
        if (section) {
          const item = section.items.find(
            (i) => "id" in i && i.id === itemId,
          ) as ExperienceItem | undefined;
          if (item?.bullets) {
            item.bullets.push("");
            cv.updatedAt = new Date().toISOString();
          }
        }
      }),

    removeBullet: (sectionId, itemId, bulletIndex) =>
      set((state) => {
        const cv = getActive(state.workspace);
        if (!cv) return;
        const section = cv.sections.find((s) => s.id === sectionId);
        if (section) {
          const item = section.items.find(
            (i) => "id" in i && i.id === itemId,
          ) as ExperienceItem | undefined;
          if (item?.bullets) {
            item.bullets.splice(bulletIndex, 1);
            cv.updatedAt = new Date().toISOString();
          }
        }
      }),

    updateBullet: (sectionId, itemId, bulletIndex, text) =>
      set((state) => {
        const cv = getActive(state.workspace);
        if (!cv) return;
        const section = cv.sections.find((s) => s.id === sectionId);
        if (section) {
          const item = section.items.find(
            (i) => "id" in i && i.id === itemId,
          ) as ExperienceItem | undefined;
          if (item?.bullets) {
            item.bullets[bulletIndex] = text;
            cv.updatedAt = new Date().toISOString();
          }
        }
      }),

    // ── Persistence ───────────────────────────────────────
    loadFromStorage: () => {
      const workspace = loadWorkspace();
      for (const cv of Object.values(workspace.cvs)) {
        if (!cv.settings) cv.settings = { fontFamily: "Roboto" };
        if (!cv.meta.locale) cv.meta.locale = "en";
      }
      set({ workspace });
    },

    exportJson: () => {
      const cv = get().activeCv();
      return cv ? JSON.stringify(cv, null, 2) : "{}";
    },

    importJson: (json) => {
      try {
        const imported = JSON.parse(json) as CV;
        const now = new Date().toISOString();
        // Ensure imported CV has workspace fields
        if (!imported.id) imported.id = generateId();
        if (!imported.name) imported.name = "Imported CV";
        if (!imported.createdAt) imported.createdAt = now;
        imported.updatedAt = now;
        if (imported.parentId === undefined) imported.parentId = null;

        set((state) => {
          state.workspace.cvs[imported.id] = imported;
          if (!state.workspace.order.includes(imported.id)) {
            state.workspace.order.push(imported.id);
          }
          state.workspace.activeCvId = imported.id;
        });
      } catch {
        console.error("Failed to import CV from JSON");
      }
    },

    resetCV: () => {
      const cv = createDefaultCV();
      set((state) => {
        const activeId = state.workspace.activeCvId;
        if (activeId && state.workspace.cvs[activeId]) {
          // Replace current active CV content but keep its identity
          const existing = state.workspace.cvs[activeId];
          existing.meta = cv.meta;
          existing.sections = cv.sections;
          existing.updatedAt = new Date().toISOString();
        }
      });
    },
  })),
);

// Auto-save to localStorage on every change (debounced 500ms)
useCVStore.subscribe((state) => {
  useUIStore.getState().setSaveStatus("saving");
  debouncedSave(state.workspace);
});
