import { z } from "zod";
import { sectionTypeSchema } from "./cv";

// ── AI-safe adaptable CV ───────────────────────────────────
//
// What we hand to a model and accept back. Deliberately excludes PII
// (name, email, phone, links), CV identity/persistence fields, section
// visibility flags and app settings — a model has no business editing those.

export const adaptableMetaSchema = z.object({
  title: z.string(),
  location: z.string(),
});

export const adaptableItemSchema = z.object({
  id: z.string().optional(),
  // summary / custom
  content: z.string().optional(),
  // skills
  category: z.string().optional(),
  items: z.array(z.string()).optional(),
  // experience
  role: z.string().optional(),
  company: z.string().optional(),
  location: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  bullets: z.array(z.string()).optional(),
  // education
  degree: z.string().optional(),
  institution: z.string().optional(),
  dates: z.string().optional(),
  notes: z.string().optional(),
  // languages
  language: z.string().optional(),
  level: z.string().optional(),
});

export const adaptableSectionSchema = z.object({
  id: z.string().optional(),
  type: sectionTypeSchema,
  title: z.string(),
  items: z.array(adaptableItemSchema),
});

export const adaptableCVSchema = z.object({
  meta: adaptableMetaSchema,
  sections: z.array(adaptableSectionSchema),
});

export type AdaptableCV = z.infer<typeof adaptableCVSchema>;
export type AdaptableSection = z.infer<typeof adaptableSectionSchema>;
export type AdaptableItem = z.infer<typeof adaptableItemSchema>;

// ── External handoff envelope ──────────────────────────────

export const SUPPORTED_SCHEMA_VERSION = 1;

export const adaptedCVExportSchema = z.object({
  schemaVersion: z.literal(SUPPORTED_SCHEMA_VERSION),
  source: z.object({
    cvId: z.string(),
    fingerprint: z.string().optional(),
  }),
  target: z.object({
    position: z.string().nullable().optional(),
    company: z.string().nullable().optional(),
    // Accepted if a model volunteers it, never requested, never used.
    jobOffer: z.string().optional(),
  }),
  cv: adaptableCVSchema,
});

export type AdaptedCVExport = z.infer<typeof adaptedCVExportSchema>;

// ── BYOK suggestion protocol ───────────────────────────────

const withReason = { reason: z.string().default("") };

export const suggestionSchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("replace_summary"),
    sectionId: z.string(),
    itemId: z.string(),
    current: z.string().nullable().default(null),
    suggested: z.string(),
    ...withReason,
  }),
  z.object({
    op: z.literal("replace_bullet"),
    sectionId: z.string(),
    itemId: z.string(),
    bulletIndex: z.number().int().nonnegative(),
    current: z.string().nullable().default(null),
    suggested: z.string(),
    ...withReason,
  }),
  z.object({
    op: z.literal("add_bullet"),
    sectionId: z.string(),
    itemId: z.string(),
    suggested: z.string(),
    ...withReason,
  }),
  z.object({
    op: z.literal("remove_bullet"),
    sectionId: z.string(),
    itemId: z.string(),
    bulletIndex: z.number().int().nonnegative(),
    current: z.string().nullable().default(null),
    ...withReason,
  }),
  z.object({
    op: z.literal("replace_skill_group"),
    sectionId: z.string(),
    itemId: z.string(),
    suggested: z.array(z.string()),
    ...withReason,
  }),
  z.object({
    op: z.literal("replace_meta_title"),
    current: z.string().nullable().default(null),
    suggested: z.string(),
    ...withReason,
  }),
  z.object({
    op: z.literal("replace_custom"),
    sectionId: z.string(),
    itemId: z.string(),
    current: z.string().nullable().default(null),
    suggested: z.string(),
    ...withReason,
  }),
]);

export type Suggestion = z.infer<typeof suggestionSchema>;

export const tailorTargetSchema = z.object({
  position: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
});

export type TailorTarget = z.infer<typeof tailorTargetSchema>;

/** The envelope of a BYOK tailoring response, before per-suggestion validation. */
export const tailorResponseSchema = z.object({
  target: tailorTargetSchema.optional(),
  suggestions: z.array(z.unknown()),
});
