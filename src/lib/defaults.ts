import type { CV } from "../types/cv";
import { generateId } from "./id";

export function createDefaultCV(): CV {
  return {
    meta: {
      name: "",
      title: "",
      email: "",
      phone: "",
      location: "",
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
