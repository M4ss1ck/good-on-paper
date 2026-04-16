import type { CVWorkspace } from "../types/cv";
import { generateId } from "./id";
import { createDefaultWorkspace } from "./defaults";

const WORKSPACE_KEY = "gop-workspace";
const OLD_CV_KEY = "gop-cv";

function migrateFromV1(): CVWorkspace | null {
  const raw = localStorage.getItem(OLD_CV_KEY);
  if (!raw) return null;

  try {
    const oldCv = JSON.parse(raw);
    const now = new Date().toISOString();
    const id = generateId();

    const migrated: CVWorkspace = {
      cvs: {
        [id]: {
          ...oldCv,
          id,
          name: "My CV",
          createdAt: now,
          updatedAt: now,
          parentId: null,
        },
      },
      order: [id],
      activeCvId: id,
    };

    localStorage.removeItem(OLD_CV_KEY);
    return migrated;
  } catch {
    return null;
  }
}

export function loadWorkspace(): CVWorkspace {
  // Try new key first
  try {
    const raw = localStorage.getItem(WORKSPACE_KEY);
    if (raw) return JSON.parse(raw) as CVWorkspace;
  } catch {
    // fall through
  }

  // Try migrating from v1
  const migrated = migrateFromV1();
  if (migrated) {
    saveWorkspace(migrated);
    return migrated;
  }

  // Fresh workspace
  const fresh = createDefaultWorkspace();
  saveWorkspace(fresh);
  return fresh;
}

export function saveWorkspace(workspace: CVWorkspace): void {
  localStorage.setItem(WORKSPACE_KEY, JSON.stringify(workspace));
}

export function createDebouncedSave(
  delay: number,
  onSaved?: () => void,
): (workspace: CVWorkspace) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (workspace: CVWorkspace) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      saveWorkspace(workspace);
      onSaved?.();
    }, delay);
  };
}
