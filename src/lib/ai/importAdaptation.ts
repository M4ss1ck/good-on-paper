import type {
  CV,
  Section,
  SectionItem,
  ExperienceItem,
  EducationItem,
} from "../../types/cv";
import {
  adaptedCVExportSchema,
  SUPPORTED_SCHEMA_VERSION,
  type AdaptableItem,
  type AdaptableSection,
  type AdaptedCVExport,
} from "../schemas/adaptation";
import { formatIssues } from "../schemas/cv";
import { generateId } from "../id";
import { fingerprintCV } from "./adaptableCV";

export type ImportWarning = "missing-source" | "stale-source" | "dates-changed";

export type AdaptationImportResult =
  | { kind: "ok"; cv: CV; warnings: ImportWarning[] }
  | { kind: "not-json" }
  | { kind: "unsupported-version"; version: string }
  | { kind: "invalid"; issues: string[] };

/** True when a parsed JSON value looks like an adaptation envelope rather than a raw CV. */
export function isAdaptationEnvelope(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    "schemaVersion" in (value as Record<string, unknown>)
  );
}

function readVersion(value: unknown): unknown {
  return (value as Record<string, unknown>).schemaVersion;
}

// ── Name ───────────────────────────────────────────────────

const MAX_NAME_LENGTH = 80;

export function adaptedCVName(
  target: AdaptedCVExport["target"],
  sourceName: string,
  adaptedSuffix: string,
): string {
  const position = target.position?.trim() || "";
  const company = target.company?.trim() || "";

  let name: string;
  if (position && company) name = `${position} - ${company}`;
  else if (position) name = position;
  else if (company) name = `${sourceName} - ${company}`;
  else name = `${sourceName} (${adaptedSuffix})`;

  return name.length > MAX_NAME_LENGTH
    ? `${name.slice(0, MAX_NAME_LENGTH - 1).trimEnd()}…`
    : name;
}

// ── CV construction ────────────────────────────────────────

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v) => typeof v === "string") : [];
}

/**
 * Keeps an id the model carried over, as long as it is a non-empty string that
 * has not already been used in this CV. Anything else gets a fresh id.
 */
function claimId(candidate: string | undefined, used: Set<string>): string {
  const id = candidate && !used.has(candidate) ? candidate : generateId();
  used.add(id);
  return id;
}

interface ItemBuildContext {
  used: Set<string>;
  sourceItems: Map<string, SectionItem>;
  onDateChange: () => void;
}

function buildItem(
  type: Section["type"],
  raw: AdaptableItem,
  ctx: ItemBuildContext,
): SectionItem {
  const id = claimId(raw.id, ctx.used);
  const source = raw.id ? ctx.sourceItems.get(raw.id) : undefined;

  switch (type) {
    case "summary":
    case "custom":
      return { id, content: str(raw.content) };
    case "skills":
      return { id, category: str(raw.category), items: strings(raw.items) };
    case "experience": {
      const original = source as ExperienceItem | undefined;
      // Dates are read-only: the model gets them for context, never to edit.
      const startDate = original ? original.startDate : str(raw.startDate);
      const endDate = original ? original.endDate : str(raw.endDate);
      if (
        original &&
        (str(raw.startDate) !== original.startDate ||
          str(raw.endDate) !== original.endDate)
      ) {
        ctx.onDateChange();
      }
      return {
        id,
        role: str(raw.role),
        company: str(raw.company),
        location: str(raw.location),
        startDate,
        endDate,
        bullets: strings(raw.bullets),
      };
    }
    case "education": {
      const original = source as EducationItem | undefined;
      const dates = original ? original.dates : str(raw.dates);
      if (original && str(raw.dates) !== original.dates) ctx.onDateChange();
      return {
        id,
        degree: str(raw.degree),
        institution: str(raw.institution),
        dates,
        notes: str(raw.notes),
      };
    }
    case "languages":
      return { id, language: str(raw.language), level: str(raw.level) };
  }
}

function buildSection(
  raw: AdaptableSection,
  source: CV | null,
  used: Set<string>,
  onDateChange: () => void,
): Section {
  const id = claimId(raw.id, used);
  const sourceSection = source?.sections.find((s) => s.id === raw.id);

  const sourceItems = new Map<string, SectionItem>();
  for (const item of sourceSection?.items ?? []) sourceItems.set(item.id, item);

  const itemIds = new Set<string>();
  const ctx: ItemBuildContext = { used: itemIds, sourceItems, onDateChange };

  return {
    id,
    type: raw.type,
    title: raw.title,
    visible: true,
    ...(sourceSection?.hideDivider != null && {
      hideDivider: sourceSection.hideDivider,
    }),
    items: raw.items.map((item) => buildItem(raw.type, item, ctx)),
  };
}

/**
 * Turns a validated envelope into a brand new CV. The source CV is only read:
 * for contact details, settings, hidden sections, original dates and parentage.
 */
export function buildAdaptedCV(
  envelope: AdaptedCVExport,
  source: CV | null,
  adaptedSuffix: string,
  now: string = new Date().toISOString(),
): { cv: CV; warnings: ImportWarning[] } {
  const warnings: ImportWarning[] = [];
  if (!source) {
    warnings.push("missing-source");
  } else if (
    envelope.source.fingerprint &&
    envelope.source.fingerprint !== fingerprintCV(source)
  ) {
    warnings.push("stale-source");
  }

  let datesChanged = false;
  const onDateChange = () => {
    datesChanged = true;
  };

  const usedSectionIds = new Set<string>();
  const sections = envelope.cv.sections.map((s) =>
    buildSection(s, source, usedSectionIds, onDateChange),
  );

  // Hidden sections are never sent to the model. Put them back where they were.
  if (source) {
    source.sections.forEach((section, index) => {
      if (section.visible) return;
      const clone: Section = JSON.parse(JSON.stringify(section));
      sections.splice(Math.min(index, sections.length), 0, clone);
    });
  }

  if (datesChanged) warnings.push("dates-changed");

  const cv: CV = {
    id: generateId(),
    name: adaptedCVName(envelope.target, source?.name ?? "CV", adaptedSuffix),
    createdAt: now,
    updatedAt: now,
    parentId: source?.id ?? null,
    meta: {
      name: source?.meta.name ?? "",
      title: envelope.cv.meta.title,
      email: source?.meta.email ?? "",
      phone: source?.meta.phone ?? "",
      location: envelope.cv.meta.location,
      locale: source?.meta.locale ?? "en",
      links: source ? JSON.parse(JSON.stringify(source.meta.links)) : [],
    },
    settings: source
      ? { ...source.settings }
      : { fontFamily: "Roboto" as const },
    sections,
  };

  return { cv, warnings };
}

/**
 * Validates untrusted JSON text as an adaptation envelope and builds the new CV.
 * `resolveSource` looks the source CV up in the workspace.
 */
export function importAdaptation(
  text: string,
  resolveSource: (cvId: string) => CV | null,
  adaptedSuffix: string,
): AdaptationImportResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { kind: "not-json" };
  }

  const version = readVersion(json);
  if (version !== SUPPORTED_SCHEMA_VERSION) {
    return { kind: "unsupported-version", version: String(version) };
  }

  const parsed = adaptedCVExportSchema.safeParse(json);
  if (!parsed.success) {
    return { kind: "invalid", issues: formatIssues(parsed.error) };
  }

  const source = resolveSource(parsed.data.source.cvId);
  const { cv, warnings } = buildAdaptedCV(parsed.data, source, adaptedSuffix);
  return { kind: "ok", cv, warnings };
}
