import type { CV } from "../types/cv";

/** A small but complete CV, enough to exercise every section type. */
export function makeCV(overrides: Partial<CV> = {}): CV {
  return {
    id: "cv-1",
    name: "My CV",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    parentId: null,
    meta: {
      name: "Ada Lovelace",
      title: "Backend Engineer",
      email: "ada@example.com",
      phone: "+34 600 000 000",
      location: "Madrid",
      locale: "en",
      links: [{ label: "GitHub", url: "https://github.com/ada" }],
    },
    settings: { fontFamily: "Inter" },
    sections: [
      {
        id: "sec-summary",
        type: "summary",
        title: "Summary",
        visible: true,
        items: [{ id: "item-summary", content: "Backend engineer." }],
      },
      {
        id: "sec-skills",
        type: "skills",
        title: "Technical Skills",
        visible: true,
        items: [
          { id: "item-skills", category: "Languages", items: ["Go", "Python"] },
        ],
      },
      {
        id: "sec-exp",
        type: "experience",
        title: "Professional Experience",
        visible: true,
        items: [
          {
            id: "item-exp",
            role: "Engineer",
            company: "Acme",
            location: "Remote",
            startDate: "2020",
            endDate: "Present",
            bullets: ["Built services.", "Ran deployments."],
          },
        ],
      },
      {
        id: "sec-hidden",
        type: "education",
        title: "Education",
        visible: false,
        items: [
          {
            id: "item-edu",
            degree: "BSc Mathematics",
            institution: "UCM",
            dates: "2016",
          },
        ],
      },
    ],
    ...overrides,
  };
}
