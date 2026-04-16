import { diffArrays } from "diff";
import type {
  CV,
  Section,
  SectionItem,
  SectionType,
  ExperienceItem,
  EducationItem,
  SkillItem,
  LanguageItem,
  SummaryItem,
  CustomItem,
} from "../../types/cv";
import type {
  CVDiff,
  MetaDiff,
  SectionDiff,
  ItemDiff,
  FieldChange,
  BulletChange,
} from "../../types/diff";

// ── Public API ─────────────────────────────────────────────

export function computeDiff(base: CV, against: CV): CVDiff {
  const meta = diffMeta(base, against);
  const sections = diffSections(base.sections, against.sections);

  const unchanged =
    meta.fields.length === 0 &&
    !meta.linksChanged &&
    sections.length === 0;

  return {
    leftId: base.id,
    rightId: against.id,
    meta,
    sections,
    unchanged,
  };
}

// ── Meta diff ──────────────────────────────────────────────

const META_FIELDS = ["name", "title", "email", "phone", "location"] as const;

function diffMeta(base: CV, against: CV): MetaDiff {
  const fields: FieldChange[] = [];

  for (const field of META_FIELDS) {
    const before = base.meta[field];
    const after = against.meta[field];
    if (before !== after) {
      fields.push({ field, before, after });
    }
  }

  const linksChanged =
    JSON.stringify(base.meta.links) !== JSON.stringify(against.meta.links);

  return { fields, linksChanged };
}

// ── Section diff ───────────────────────────────────────────

function diffSections(baseSections: Section[], againstSections: Section[]): SectionDiff[] {
  const baseMap = new Map(baseSections.map((s) => [s.id, s]));
  const againstMap = new Map(againstSections.map((s) => [s.id, s]));
  const diffs: SectionDiff[] = [];

  // Removed sections (in base, not in against)
  for (const sec of baseSections) {
    if (!againstMap.has(sec.id)) {
      diffs.push({
        sectionId: sec.id,
        sectionTitle: sec.title,
        sectionType: sec.type,
        type: "removed",
        items: sec.items.map((item) => ({
          itemId: "id" in item ? item.id : "",
          identifier: itemIdentifier(sec.type, item),
          type: "removed",
          fields: [],
        })),
      });
    }
  }

  // Added sections (in against, not in base)
  for (const sec of againstSections) {
    if (!baseMap.has(sec.id)) {
      diffs.push({
        sectionId: sec.id,
        sectionTitle: sec.title,
        sectionType: sec.type,
        type: "added",
        items: sec.items.map((item) => ({
          itemId: "id" in item ? item.id : "",
          identifier: itemIdentifier(sec.type, item),
          type: "added",
          fields: [],
        })),
      });
    }
  }

  // Modified sections (in both)
  for (const baseSec of baseSections) {
    const againstSec = againstMap.get(baseSec.id);
    if (!againstSec) continue;

    const titleChange: FieldChange | undefined =
      baseSec.title !== againstSec.title
        ? { field: "title", before: baseSec.title, after: againstSec.title }
        : undefined;

    const visibilityChange: FieldChange<boolean> | undefined =
      baseSec.visible !== againstSec.visible
        ? { field: "visible", before: baseSec.visible, after: againstSec.visible }
        : undefined;

    const items = diffItems(baseSec.type, baseSec.items, againstSec.items);

    // Only report if something changed
    if (titleChange || visibilityChange || items.length > 0) {
      diffs.push({
        sectionId: baseSec.id,
        sectionTitle: againstSec.title,
        sectionType: baseSec.type,
        type: "changed",
        titleChange,
        visibilityChange,
        items,
      });
    }
  }

  return diffs;
}

// ── Item diff ──────────────────────────────────────────────

function itemKey(type: SectionType, item: SectionItem): string {
  switch (type) {
    case "experience": {
      const e = item as ExperienceItem;
      return `${e.role}\0${e.company}`;
    }
    case "education": {
      const e = item as EducationItem;
      return `${e.degree}\0${e.institution}`;
    }
    case "skills":
      return (item as SkillItem).category;
    case "languages":
      return (item as LanguageItem).language;
    case "summary":
    case "custom":
      return "id" in item ? item.id : "";
  }
}

function itemIdentifier(type: SectionType, item: SectionItem): string {
  switch (type) {
    case "experience": {
      const e = item as ExperienceItem;
      return [e.role, e.company].filter(Boolean).join(" / ") || "Untitled";
    }
    case "education": {
      const e = item as EducationItem;
      return [e.degree, e.institution].filter(Boolean).join(" / ") || "Untitled";
    }
    case "skills":
      return (item as SkillItem).category || "Untitled";
    case "languages":
      return (item as LanguageItem).language || "Untitled";
    case "summary":
      return "Summary";
    case "custom":
      return (item as CustomItem).content.slice(0, 40) || "Untitled";
  }
}

function diffItems(
  type: SectionType,
  baseItems: SectionItem[],
  againstItems: SectionItem[],
): ItemDiff[] {
  const baseByKey = new Map<string, SectionItem>();
  for (const item of baseItems) baseByKey.set(itemKey(type, item), item);

  const againstByKey = new Map<string, SectionItem>();
  for (const item of againstItems) againstByKey.set(itemKey(type, item), item);

  const diffs: ItemDiff[] = [];

  // Removed items
  for (const [key, item] of baseByKey) {
    if (!againstByKey.has(key)) {
      diffs.push({
        itemId: "id" in item ? item.id : "",
        identifier: itemIdentifier(type, item),
        type: "removed",
        fields: [],
      });
    }
  }

  // Added items
  for (const [key, item] of againstByKey) {
    if (!baseByKey.has(key)) {
      diffs.push({
        itemId: "id" in item ? item.id : "",
        identifier: itemIdentifier(type, item),
        type: "added",
        fields: [],
      });
    }
  }

  // Changed items
  for (const [key, baseItem] of baseByKey) {
    const againstItem = againstByKey.get(key);
    if (!againstItem) continue;

    const itemDiff = diffSingleItem(type, baseItem, againstItem);
    if (itemDiff) diffs.push(itemDiff);
  }

  return diffs;
}

// ── Single item comparison ─────────────────────────────────

function diffSingleItem(
  type: SectionType,
  base: SectionItem,
  against: SectionItem,
): ItemDiff | null {
  switch (type) {
    case "experience":
      return diffExperienceItem(base as ExperienceItem, against as ExperienceItem);
    case "education":
      return diffEducationItem(base as EducationItem, against as EducationItem);
    case "skills":
      return diffSkillItem(base as SkillItem, against as SkillItem);
    case "languages":
      return diffLanguageItem(base as LanguageItem, against as LanguageItem);
    case "summary":
    case "custom":
      return diffTextItem(type, base as SummaryItem | CustomItem, against as SummaryItem | CustomItem);
  }
}

function diffExperienceItem(base: ExperienceItem, against: ExperienceItem): ItemDiff | null {
  const fields = compareFields(base, against, ["location", "startDate", "endDate"]);
  const bullets = diffBullets(base.bullets, against.bullets);

  if (fields.length === 0 && bullets.length === 0) return null;

  return {
    itemId: against.id,
    identifier: [against.role, against.company].filter(Boolean).join(" / ") || "Untitled",
    type: "changed",
    fields,
    bullets,
  };
}

function diffEducationItem(base: EducationItem, against: EducationItem): ItemDiff | null {
  const fields = compareFields(base, against, ["dates", "notes"]);
  if (fields.length === 0) return null;

  return {
    itemId: against.id,
    identifier: [against.degree, against.institution].filter(Boolean).join(" / ") || "Untitled",
    type: "changed",
    fields,
  };
}

function diffSkillItem(base: SkillItem, against: SkillItem): ItemDiff | null {
  const baseItems = base.items.join(", ");
  const againstItems = against.items.join(", ");
  if (baseItems === againstItems) return null;

  return {
    itemId: against.id,
    identifier: against.category || "Untitled",
    type: "changed",
    fields: [{ field: "items", before: baseItems, after: againstItems }],
  };
}

function diffLanguageItem(base: LanguageItem, against: LanguageItem): ItemDiff | null {
  const fields = compareFields(base, against, ["level"]);
  if (fields.length === 0) return null;

  return {
    itemId: against.id,
    identifier: against.language || "Untitled",
    type: "changed",
    fields,
  };
}

function diffTextItem(
  _type: SectionType,
  base: SummaryItem | CustomItem,
  against: SummaryItem | CustomItem,
): ItemDiff | null {
  if (base.content === against.content) return null;

  return {
    itemId: against.id,
    identifier: _type === "summary" ? "Summary" : against.content.slice(0, 40) || "Untitled",
    type: "changed",
    fields: [{ field: "content", before: base.content, after: against.content }],
  };
}

// ── Bullet diff (experience) ───────────────────────────────

function diffBullets(baseBullets: string[], againstBullets: string[]): BulletChange[] {
  const result = diffArrays(baseBullets, againstBullets);
  const changes: BulletChange[] = [];
  let baseIdx = 0;
  let againstIdx = 0;

  for (const part of result) {
    const count = part.count ?? 0;
    if (part.removed) {
      for (let i = 0; i < count; i++) {
        changes.push({
          index: baseIdx + i,
          type: "removed",
          before: baseBullets[baseIdx + i],
        });
      }
      baseIdx += count;
    } else if (part.added) {
      for (let i = 0; i < count; i++) {
        changes.push({
          index: againstIdx + i,
          type: "added",
          after: againstBullets[againstIdx + i],
        });
      }
      againstIdx += count;
    } else {
      // Unchanged — advance both pointers
      baseIdx += count;
      againstIdx += count;
    }
  }

  // Post-process: pair removed+added at the same position as "changed"
  return coalesceBulletChanges(changes);
}

/**
 * Adjacent removed+added pairs likely represent a reworded bullet.
 * Merge them into a single "changed" entry.
 */
function coalesceBulletChanges(changes: BulletChange[]): BulletChange[] {
  const result: BulletChange[] = [];
  let i = 0;

  while (i < changes.length) {
    const curr = changes[i];
    const next = changes[i + 1];

    if (
      curr.type === "removed" &&
      next?.type === "added"
    ) {
      result.push({
        index: next.index,
        type: "changed",
        before: curr.before,
        after: next.after,
      });
      i += 2;
    } else {
      result.push(curr);
      i++;
    }
  }

  return result;
}

// ── Helpers ────────────────────────────────────────────────

function compareFields<T extends object>(
  base: T,
  against: T,
  fieldNames: string[],
): FieldChange[] {
  const changes: FieldChange[] = [];
  const b = base as Record<string, unknown>;
  const a = against as Record<string, unknown>;
  for (const field of fieldNames) {
    const before = String(b[field] ?? "");
    const after = String(a[field] ?? "");
    if (before !== after) {
      changes.push({ field, before, after });
    }
  }
  return changes;
}
