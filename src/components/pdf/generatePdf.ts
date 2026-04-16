import type { TDocumentDefinitions, Style, Content } from "pdfmake/interfaces";
import type {
  CV,
  Section,
  SummaryItem,
  SkillItem,
  ExperienceItem,
  EducationItem,
  LanguageItem,
  CustomItem,
} from "../../types/cv";

const styles: Record<string, Style> = {
  name: { fontSize: 20, bold: true, color: "#1F3A5F" },
  title: { fontSize: 12, color: "#3A6EA5" },
  contact: { fontSize: 9, color: "#555555" },
  sectionHeading: {
    fontSize: 11,
    bold: true,
    color: "#1F3A5F",
    margin: [0, 12, 0, 4],
  },
  body: { fontSize: 10, color: "#333333" },
  roleTitle: { fontSize: 10.5, bold: true, color: "#222222" },
  companyLine: { fontSize: 10, italics: true, color: "#3A6EA5" },
  bullet: { fontSize: 9.5 },
  dates: { fontSize: 9, color: "#888888" },
};

function buildHeader(cv: CV): Content[] {
  const content: Content[] = [];

  if (cv.meta.name) {
    content.push({ text: cv.meta.name, style: "name", alignment: "center" });
  }
  if (cv.meta.title) {
    content.push({
      text: cv.meta.title,
      style: "title",
      alignment: "center",
      margin: [0, 2, 0, 0],
    });
  }

  const contactParts: string[] = [];
  if (cv.meta.email) contactParts.push(cv.meta.email);
  if (cv.meta.phone) contactParts.push(cv.meta.phone);
  if (cv.meta.location) contactParts.push(cv.meta.location);

  if (contactParts.length > 0) {
    content.push({
      text: contactParts.join("  ·  "),
      style: "contact",
      alignment: "center",
      margin: [0, 4, 0, 0],
    });
  }

  const filledLinks = cv.meta.links.filter((l) => l.label || l.url);
  if (filledLinks.length > 0) {
    content.push({
      text: filledLinks.map((l) => l.label || l.url).join("  ·  "),
      style: "contact",
      color: "#3A6EA5",
      alignment: "center",
      margin: [0, 2, 0, 0],
    });
  }

  return content;
}

function sectionHeadingBlock(title: string): Content[] {
  return [
    { text: title.toUpperCase(), style: "sectionHeading" },
    {
      canvas: [
        {
          type: "line" as const,
          x1: 0,
          y1: 0,
          x2: 515,
          y2: 0,
          lineWidth: 0.5,
          lineColor: "#1F3A5F",
        },
      ],
      margin: [0, 0, 0, 6] as [number, number, number, number],
    },
  ];
}

function buildSummary(section: Section): Content[] {
  const items = section.items as SummaryItem[];
  const blocks: Content[] = [...sectionHeadingBlock(section.title)];
  for (const item of items) {
    if (item.content) {
      blocks.push({
        text: item.content,
        style: "body",
        alignment: "justify" as const,
      });
    }
  }
  return blocks;
}

function buildSkills(section: Section): Content[] {
  const items = section.items as SkillItem[];
  const blocks: Content[] = [...sectionHeadingBlock(section.title)];
  for (const item of items) {
    const filled = item.items.filter(Boolean);
    if (item.category || filled.length > 0) {
      blocks.push({
        text: [
          { text: item.category + ": ", bold: true, fontSize: 10 },
          { text: filled.join(", "), fontSize: 10 },
        ],
        margin: [0, 1, 0, 1],
      });
    }
  }
  return blocks;
}

function buildExperience(section: Section): Content[] {
  const items = section.items as ExperienceItem[];
  const blocks: Content[] = [...sectionHeadingBlock(section.title)];
  for (const item of items) {
    const dateText = [item.startDate, item.endDate].filter(Boolean).join(" – ");

    if (item.role || dateText) {
      blocks.push({
        columns: [
          { text: item.role, style: "roleTitle", width: "*" },
          {
            text: dateText,
            style: "dates",
            width: "auto",
            alignment: "right" as const,
          },
        ],
        margin: [0, 4, 0, 0],
      });
    }

    const companyLine = [item.company, item.location]
      .filter(Boolean)
      .join(", ");
    if (companyLine) {
      blocks.push({ text: companyLine, style: "companyLine" });
    }

    const bullets = item.bullets.filter(Boolean);
    if (bullets.length > 0) {
      blocks.push({
        ul: bullets.map((b) => ({ text: b, style: "bullet" })),
        margin: [12, 2, 0, 0],
      });
    }
  }
  return blocks;
}

function buildEducation(section: Section): Content[] {
  const items = section.items as EducationItem[];
  const blocks: Content[] = [...sectionHeadingBlock(section.title)];
  for (const item of items) {
    if (item.degree || item.dates) {
      blocks.push({
        columns: [
          { text: item.degree, style: "roleTitle", width: "*" },
          {
            text: item.dates,
            style: "dates",
            width: "auto",
            alignment: "right" as const,
          },
        ],
        margin: [0, 3, 0, 0],
      });
    }
    if (item.institution) {
      blocks.push({ text: item.institution, style: "companyLine" });
    }
    if (item.notes) {
      blocks.push({
        text: item.notes,
        style: "bullet",
        margin: [0, 1, 0, 0],
      });
    }
  }
  return blocks;
}

function buildLanguages(section: Section): Content[] {
  const items = section.items as LanguageItem[];
  const filled = items.filter((i) => i.language);
  if (filled.length === 0)
    return [...sectionHeadingBlock(section.title)];

  const blocks: Content[] = [...sectionHeadingBlock(section.title)];
  const textParts = filled.flatMap((item, i) => {
    const parts: Content[] = [];
    if (i > 0) parts.push({ text: "  ·  " });
    parts.push({ text: item.language, bold: true });
    if (item.level) parts.push({ text: ` (${item.level})` });
    return parts;
  });
  blocks.push({
    text: textParts,
    style: "body",
  });
  return blocks;
}

function buildCustom(section: Section): Content[] {
  const items = section.items as CustomItem[];
  const blocks: Content[] = [...sectionHeadingBlock(section.title)];
  for (const item of items) {
    if (item.content) {
      blocks.push({ text: item.content, style: "body" });
    }
  }
  return blocks;
}

export function generatePdfDefinition(cv: CV): TDocumentDefinitions {
  const content: Content[] = [...buildHeader(cv)];

  for (const section of cv.sections.filter((s) => s.visible)) {
    switch (section.type) {
      case "summary":
        content.push(...buildSummary(section));
        break;
      case "skills":
        content.push(...buildSkills(section));
        break;
      case "experience":
        content.push(...buildExperience(section));
        break;
      case "education":
        content.push(...buildEducation(section));
        break;
      case "languages":
        content.push(...buildLanguages(section));
        break;
      case "custom":
        content.push(...buildCustom(section));
        break;
    }
  }

  return {
    content,
    styles,
    defaultStyle: { font: cv.settings?.fontFamily ?? "Roboto", fontSize: 10, color: "#333333" },
    pageSize: "LETTER",
    pageMargins: [50, 40, 50, 40],
    info: { lang: cv.meta.locale ?? "en" } as Record<string, string>,
  };
}
