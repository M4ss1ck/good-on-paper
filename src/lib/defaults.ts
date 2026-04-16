import type { CV, CVWorkspace } from "../types/cv";
import { generateId } from "./id";

export function createDefaultCV(): CV {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    name: "My CV",
    createdAt: now,
    updatedAt: now,
    parentId: null,
    meta: {
      name: "",
      title: "",
      email: "",
      phone: "",
      location: "",
      locale: "en",
      links: [],
    },
    sections: [
      {
        id: generateId(),
        type: "summary",
        title: "Summary",
        visible: true,
        items: [],
      },
      {
        id: generateId(),
        type: "skills",
        title: "Technical Skills",
        visible: true,
        items: [],
      },
      {
        id: generateId(),
        type: "experience",
        title: "Professional Experience",
        visible: true,
        items: [],
      },
      {
        id: generateId(),
        type: "education",
        title: "Education",
        visible: true,
        items: [],
      },
      {
        id: generateId(),
        type: "languages",
        title: "Languages",
        visible: true,
        items: [],
      },
    ],
  };
}

export function createDefaultWorkspace(): CVWorkspace {
  const cv = createDefaultCV();
  return {
    cvs: { [cv.id]: cv },
    order: [cv.id],
    activeCvId: cv.id,
  };
}
