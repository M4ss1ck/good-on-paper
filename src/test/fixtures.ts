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

/**
 * A CV built to expose PDF text problems: an accented name, "C++" and hyphenated
 * compounds near line ends, labelled and bare links, multi-line bullets, dated
 * entries with notes, a hidden section and an empty visible section.
 */
export function makeAtsCV(overrides: Partial<CV> = {}): CV {
  return {
    id: "cv-ats",
    name: "José Martínez-Ñúñez CV",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    parentId: null,
    meta: {
      name: "José Martínez-Ñúñez",
      title: "Senior Platform Engineer",
      email: "jose@example.com",
      phone: "+34 600 111 222",
      location: "Madrid",
      locale: "en",
      links: [
        { label: "GitHub", url: "https://github.com/jose" },
        { label: "", url: "https://www.linkedin.com/in/jose-martinez/" },
        { label: "Portfolio", url: "" },
      ],
    },
    settings: { fontFamily: "Roboto" },
    sections: [
      {
        id: "sec-summary",
        type: "summary",
        title: "Summary",
        visible: true,
        items: [
          {
            id: "item-summary",
            content:
              "Platform engineer with eleven years of experience building distributed systems in C++ and Go. " +
              "Focused on fault-tolerant message pipelines and fleet-wide observability for logistics operators. " +
              "Led the move of a legacy monolith to containerized services, cutting deployment lead time from weeks " +
              "to hours through infrastructure-as-code. Mentors engineers across three time zones.",
          },
        ],
      },
      {
        id: "sec-skills",
        type: "skills",
        title: "Technical Skills",
        visible: true,
        items: [
          { id: "item-skills-1", category: "Languages", items: ["C++", "Go", "Python"] },
          { id: "item-skills-2", category: "Infrastructure", items: ["Kubernetes", "Terraform", "Kafka"] },
        ],
      },
      {
        id: "sec-exp",
        type: "experience",
        title: "Professional Experience",
        visible: true,
        items: [
          {
            id: "item-exp-1",
            role: "Senior Platform Engineer",
            company: "Northwind Logistics",
            location: "Madrid",
            startDate: "2021",
            endDate: "Present",
            bullets: [
              "Owned the message ingestion platform, handling 40k events per second across three regions with fault-tolerant replay and back-pressure controls.",
              "Designed fleet-wide rollout tooling that cut rollback time during incidents by seventy percent.",
              "Introduced infrastructure-as-code reviews for the Terraform modules used by twelve product teams.",
            ],
          },
          {
            id: "item-exp-2",
            role: "Backend Engineer",
            company: "Acme Analytics",
            location: "Remote",
            startDate: "2017",
            endDate: "2021",
            bullets: [
              "Built batch pipelines in Python and Go that processed nightly ledgers for two hundred clients.",
              "Wrote the on-call runbooks adopted across engineering after the 2019 outage review.",
            ],
          },
        ],
      },
      {
        id: "sec-edu",
        type: "education",
        title: "Education",
        visible: true,
        items: [
          {
            id: "item-edu",
            degree: "MSc Distributed Systems",
            institution: "Universidad Politécnica de Madrid",
            dates: "2015 – 2017",
            notes: "Thesis on consensus protocols under partial network partitions.",
          },
        ],
      },
      {
        id: "sec-languages",
        type: "languages",
        title: "Languages",
        visible: true,
        items: [
          { id: "item-lang-1", language: "English", level: "Fluent" },
          { id: "item-lang-2", language: "Spanish", level: "Native" },
        ],
      },
      {
        id: "sec-certs",
        type: "custom",
        title: "Certifications",
        visible: true,
        items: [],
      },
      {
        id: "sec-hidden",
        type: "custom",
        title: "Publications",
        visible: false,
        items: [{ id: "item-hidden", content: "This section is hidden and must not render." }],
      },
    ],
    ...overrides,
  };
}

/** makeAtsCV with enough extra experience to run onto a second page. */
export function makeAtsCVTwoPages(overrides: Partial<CV> = {}): CV {
  const base = makeAtsCV(overrides);
  const extraEntries = Array.from({ length: 6 }, (_, i) => ({
    id: `item-exp-extra-${i}`,
    role: `Engineer ${i + 1}`,
    company: `Company ${i + 1}`,
    location: "Remote",
    startDate: `${2005 + i}`,
    endDate: `${2006 + i}`,
    bullets: [
      "Delivered a reliability programme covering alerting, capacity planning and paging rotation for a regional payments platform.",
      "Coordinated releases with product, support and finance across several overlapping quarters of change.",
      "Documented the operational decisions so the next team could reproduce them without the original authors.",
    ],
  }));
  return {
    ...base,
    sections: base.sections.map((section) =>
      section.id === "sec-exp"
        ? { ...section, items: [...section.items, ...extraEntries] }
        : section,
    ),
  };
}
