import type { TDocumentDefinitions, Style, Content, ContentText } from "pdfmake/interfaces";
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

/**
 * A text node that is a named destination. pdfmake reads `id` from it, but @types/pdfmake
 * does not declare the field, so it is typed here.
 */
type NamedDestinationText = ContentText & { id?: string };

// Letter page with 50pt side margins. The divider spans the text column exactly.
const PAGE_WIDTH = 612;
const SIDE_MARGIN = 50;
const DIVIDER_WIDTH = PAGE_WIDTH - 2 * SIDE_MARGIN;
// Width of the bullet glyph column. Bullet text starts after it, so wrapped lines hang.
const BULLET_MARKER_WIDTH = 10;

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
  subline: { fontSize: 10, italics: true, color: "#3A6EA5" },
  bullet: { fontSize: 9.5 },
};

/** The visible text of a link: its URL without the scheme and trailing slash (`github.com/jose`). */
function linkText(url: string): string {
  return url.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "").replace(/\/$/, "");
}

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
    const parts: ContentText[] = [];
    filledLinks.forEach((link, index) => {
      if (index > 0) parts.push({ text: "  ·  " });
      // A link with a URL prints the URL, not its label, and annotates the full address.
      // A label-only link prints the label and carries no annotation.
      parts.push(
        link.url
          ? { text: linkText(link.url), link: link.url }
          : { text: link.label },
      );
    });
    content.push({
      text: parts,
      style: "contact",
      color: "#3A6EA5",
      alignment: "center",
      margin: [0, 2, 0, 0],
    });
  }

  return content;
}

/**
 * The heading is the section's named destination. It uses the stable section id, so a
 * retitled section keeps its links.
 */
function sectionHeadingBlock(section: Section): Content[] {
  const title: NamedDestinationText = {
    text: section.title.toUpperCase(),
    style: "sectionHeading",
    id: section.id,
  };
  return [
    title,
    ...(section.hideDivider
      ? []
      : [
          {
            canvas: [
              {
                type: "line" as const,
                x1: 0,
                y1: 0,
                x2: DIVIDER_WIDTH,
                y2: 0,
                lineWidth: 0.5,
                lineColor: "#1F3A5F",
              },
            ],
            margin: [0, 0, 0, 6] as [number, number, number, number],
          },
        ]),
  ];
}

function keepTogether(content: Content[]): Content {
  return { stack: content, unbreakable: true };
}

function buildSection(section: Section, blocks: Content[]): Content[] {
  const heading = sectionHeadingBlock(section);

  if (blocks.length === 0) {
    return [keepTogether(heading)];
  }

  const [firstBlock, ...remainingBlocks] = blocks;
  return [keepTogether([...heading, firstBlock]), ...remainingBlocks];
}

function buildSummary(section: Section): Content[] {
  const items = section.items as SummaryItem[];
  const blocks: Content[] = [];
  for (const item of items) {
    if (item.content) {
      blocks.push({
        text: item.content,
        style: "body",
        unbreakable: true,
      });
    }
  }
  return buildSection(section, blocks);
}

function buildSkills(section: Section): Content[] {
  const items = section.items as SkillItem[];
  const blocks: Content[] = [];
  for (const item of items) {
    const filled = item.items.filter(Boolean);
    if (item.category || filled.length > 0) {
      blocks.push({
        text: [
          { text: item.category + ": ", bold: true, fontSize: 10 },
          { text: filled.join(", "), fontSize: 10 },
        ],
        margin: [0, 1, 0, 1],
        unbreakable: true,
      });
    }
  }
  return buildSection(section, blocks);
}

/** Company or institution line with its dates after a " · " separator; either part may be empty. */
function joinSubline(name: string | undefined, dates: string | undefined): string {
  return [name, dates].filter(Boolean).join(" · ");
}

/**
 * An experience role or education degree: a bold title, then its subline. `topMargin` is the
 * gap above the title, which differs by entry type.
 */
function entryHeader(title: string | undefined, subline: string, topMargin: number): Content[] {
  const header: Content[] = [];
  if (title) {
    header.push({
      text: title,
      style: "roleTitle",
      margin: [0, topMargin, 0, 0] as [number, number, number, number],
    });
  }
  if (subline) {
    header.push({ text: subline, style: "subline" });
  }
  return header;
}

function buildExperience(section: Section): Content[] {
  const items = section.items as ExperienceItem[];
  const blocks: Content[] = [];
  for (const item of items) {
    const dateText = [item.startDate, item.endDate].filter(Boolean).join(" – ");
    // Dates ride on the subline, not in a right-aligned column, so they stay with the entry.
    const subline = joinSubline([item.company, item.location].filter(Boolean).join(", "), dateText);
    const heading = entryHeader(item.role, subline, 4);

    const bullets = item.bullets.filter(Boolean);
    if (bullets.length === 0) {
      if (heading.length > 0) blocks.push(keepTogether(heading));
      continue;
    }

    bullets.forEach((bullet, index) => {
      // A "•" text glyph in a fixed-width column, so the marker is text in reading order
      // and wrapped lines hang under the bullet text, not under the marker.
      const bulletBlock: Content = {
        columns: [
          { text: "•", style: "bullet", width: BULLET_MARKER_WIDTH },
          { text: bullet, style: "bullet", width: "*" },
        ],
        margin: [12, index === 0 ? 2 : 0, 0, 0],
        unbreakable: true,
      };

      blocks.push(
        index === 0 && heading.length > 0
          ? keepTogether([...heading, bulletBlock])
          : bulletBlock,
      );
    });
  }
  return buildSection(section, blocks);
}

function buildEducation(section: Section): Content[] {
  const items = section.items as EducationItem[];
  const blocks: Content[] = [];
  for (const item of items) {
    const entry = entryHeader(item.degree, joinSubline(item.institution, item.dates), 3);
    if (item.notes) {
      entry.push({
        text: item.notes,
        style: "bullet",
        margin: [0, 1, 0, 0],
      });
    }
    if (entry.length > 0) blocks.push(keepTogether(entry));
  }
  return buildSection(section, blocks);
}

function buildLanguages(section: Section): Content[] {
  const items = section.items as LanguageItem[];
  const filled = items.filter((i) => i.language);
  if (filled.length === 0) return buildSection(section, []);

  const textParts = filled.flatMap((item, i) => {
    const parts: Content[] = [];
    if (i > 0) parts.push({ text: "  ·  " });
    parts.push({ text: item.language, bold: true });
    if (item.level) parts.push({ text: ` (${item.level})` });
    return parts;
  });
  return buildSection(section, [
    {
      text: textParts,
      style: "body",
      unbreakable: true,
    },
  ]);
}

function buildCustom(section: Section): Content[] {
  const items = section.items as CustomItem[];
  const blocks: Content[] = [];
  for (const item of items) {
    if (item.content) {
      blocks.push({ text: item.content, style: "body", unbreakable: true });
    }
  }
  return buildSection(section, blocks);
}

export function generatePdfDefinition(
  cv: CV,
  options: { creationDate?: Date } = {},
): TDocumentDefinitions {
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

  // Title is "<name> - <title>", or the name alone when there is no title.
  const title = [cv.meta.name, cv.meta.title].filter(Boolean).join(" - ");

  return {
    content,
    styles,
    defaultStyle: { font: cv.settings?.fontFamily ?? "Roboto", fontSize: 10, color: "#333333" },
    pageSize: "LETTER",
    pageMargins: [SIDE_MARGIN, 40, SIDE_MARGIN, 40],
    // Catalog /Lang comes from `language`; `info` carries only the document properties.
    language: cv.meta.locale || "en",
    version: "1.7",
    info: {
      title: title || undefined,
      author: cv.meta.name || undefined,
      subject: "Curriculum Vitae",
      // pdfkit derives the trailer /ID from this too, so a fixed date fixes the whole file.
      creationDate: options.creationDate,
    },
  };
}
