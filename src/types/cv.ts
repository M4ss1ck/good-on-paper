import type { z } from "zod";
import type {
  cvSchema,
  cvWorkspaceSchema,
  cvMetaSchema,
  cvSettingsSchema,
  fontFamilySchema,
  sectionSchema,
  sectionTypeSchema,
  sectionItemSchema,
  summaryItemSchema,
  skillItemSchema,
  experienceItemSchema,
  educationItemSchema,
  languageItemSchema,
  customItemSchema,
} from "../lib/schemas/cv";

// These types are derived from the zod schemas in lib/schemas/cv.ts, which are
// the single source of truth. Edit the schema, not a duplicate interface.

export type CV = z.infer<typeof cvSchema>;
export type CVWorkspace = z.infer<typeof cvWorkspaceSchema>;
export type CVMeta = z.infer<typeof cvMetaSchema>;
export type CVSettings = z.infer<typeof cvSettingsSchema>;
export type FontFamily = z.infer<typeof fontFamilySchema>;
export type Section = z.infer<typeof sectionSchema>;
export type SectionType = z.infer<typeof sectionTypeSchema>;
export type SectionItem = z.infer<typeof sectionItemSchema>;
export type SummaryItem = z.infer<typeof summaryItemSchema>;
export type SkillItem = z.infer<typeof skillItemSchema>;
export type ExperienceItem = z.infer<typeof experienceItemSchema>;
export type EducationItem = z.infer<typeof educationItemSchema>;
export type LanguageItem = z.infer<typeof languageItemSchema>;
export type CustomItem = z.infer<typeof customItemSchema>;
