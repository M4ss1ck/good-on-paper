import { z } from "zod";

// ── Items ──────────────────────────────────────────────────

export const summaryItemSchema = z.object({
  id: z.string(),
  content: z.string(),
});

export const skillItemSchema = z.object({
  id: z.string(),
  category: z.string(),
  items: z.array(z.string()),
});

export const experienceItemSchema = z.object({
  id: z.string(),
  role: z.string(),
  company: z.string(),
  location: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  bullets: z.array(z.string()),
});

export const educationItemSchema = z.object({
  id: z.string(),
  degree: z.string(),
  institution: z.string(),
  dates: z.string(),
  notes: z.string().optional(),
});

export const languageItemSchema = z.object({
  id: z.string(),
  language: z.string(),
  level: z.string(),
});

export const customItemSchema = z.object({
  id: z.string(),
  content: z.string(),
});

export const sectionTypeSchema = z.enum([
  "summary",
  "skills",
  "experience",
  "education",
  "languages",
  "custom",
]);

/**
 * Which item shape belongs to which section type. Used by the section refine
 * below so a language item can never sit inside an experience section.
 */
export const itemSchemaByType = {
  summary: summaryItemSchema,
  skills: skillItemSchema,
  experience: experienceItemSchema,
  education: educationItemSchema,
  languages: languageItemSchema,
  custom: customItemSchema,
} as const;

// Ordered most-specific first so the union doesn't strip fields off a valid item.
export const sectionItemSchema = z.union([
  experienceItemSchema,
  educationItemSchema,
  skillItemSchema,
  languageItemSchema,
  summaryItemSchema,
  customItemSchema,
]);

// ── Section ────────────────────────────────────────────────

export const sectionSchema = z
  .object({
    id: z.string(),
    type: sectionTypeSchema,
    title: z.string(),
    visible: z.boolean(),
    hideDivider: z.boolean().optional(),
    items: z.array(sectionItemSchema),
  })
  .superRefine((section, ctx) => {
    const itemSchema = itemSchemaByType[section.type];
    section.items.forEach((item, index) => {
      const result = itemSchema.safeParse(item);
      if (result.success) return;
      for (const issue of result.error.issues) {
        ctx.addIssue({
          code: "custom",
          path: ["items", index, ...issue.path],
          message: issue.message,
        });
      }
    });
  });

// ── Meta / settings ────────────────────────────────────────

export const cvMetaSchema = z.object({
  name: z.string(),
  title: z.string(),
  email: z.string(),
  phone: z.string(),
  location: z.string(),
  locale: z.string(),
  links: z.array(z.object({ label: z.string(), url: z.string() })),
});

export const fontFamilySchema = z.enum(["Roboto", "Inter", "Lora"]);

export const cvSettingsSchema = z.object({
  fontFamily: fontFamilySchema,
});

// ── CV / workspace ─────────────────────────────────────────

export const cvSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  parentId: z.string().nullable(),
  meta: cvMetaSchema,
  settings: cvSettingsSchema,
  sections: z.array(sectionSchema),
});

export const cvWorkspaceSchema = z.object({
  cvs: z.record(z.string(), cvSchema),
  order: z.array(z.string()),
  activeCvId: z.string().nullable(),
});

// ── Error formatting ───────────────────────────────────────

/** Renders a zod path as `cv.sections[2].items[0].role`. */
export function formatIssuePath(path: readonly PropertyKey[]): string {
  return path.reduce<string>((acc, segment) => {
    if (typeof segment === "number") return `${acc}[${segment}]`;
    return acc ? `${acc}.${String(segment)}` : String(segment);
  }, "");
}

/** Flattens a ZodError into `path: message` lines for display. */
export function formatIssues(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = formatIssuePath(issue.path);
    return path ? `${path}: ${issue.message}` : issue.message;
  });
}
