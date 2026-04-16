# Good on Paper — Phase 4: i18n, Fonts, AI Translation & Landing Page

## Overview

Phase 4 is the polish phase. It internationalizes the UI, adds custom fonts to the PDF, introduces AI-powered CV translation, and ships a landing page. After this, the product is complete for public launch.

---

## Prerequisites

Phases 1-3 complete: editor, preview, PDF, AI features, multi-CV with fork and diff.

---

## Scope

### What ships

1. **UI i18n** with Lingui (Spanish + English)
2. **CV locale** field — each CV declares its content language (independent of UI language)
3. **Custom fonts** in PDF — at least one alternative to Roboto
4. **AI CV translation** — translate an entire CV into another language, creating a new fork
5. **Landing page** — minimal, effective, explains what the tool does

### What does NOT ship

- RTL support (Arabic, Hebrew) — can come later, out of scope
- More than 2 UI languages (ship ES/EN, add more via community contributions)
- Server-side rendering for the landing page (static is fine)

---

## 1. UI Internationalization with Lingui

### Why Lingui

- Small bundle (~5KB runtime)
- Macro-based: `t` tagged template literal extracts messages at build time
- ICU MessageFormat for plurals and interpolation
- First-class Vite support via `@lingui/vite-plugin`
- Catalogs are plain JSON, easy for contributors to translate

### Setup

```bash
npm install @lingui/core @lingui/react @lingui/macro @lingui/cli
npm install -D @lingui/vite-plugin @lingui/babel-plugin-lingui-macro babel-plugin-macros
```

### Config: `lingui.config.ts`

```typescript
import type { LinguiConfig } from "@lingui/conf";

const config: LinguiConfig = {
  locales: ["en", "es"],
  sourceLocale: "en",
  catalogs: [
    {
      path: "src/locales/{locale}/messages",
      include: ["src"],
    },
  ],
};

export default config;
```

### Vite integration

Add the Lingui plugin to `vite.config.ts`:

```typescript
import { linguiPlugin } from "@lingui/vite-plugin";

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: ["@lingui/babel-plugin-lingui-macro"],
      },
    }),
    linguiPlugin(),
  ],
});
```

### Usage pattern

```typescript
// In components:
import { t, Trans } from "@lingui/macro"

// For text in JSX:
<button><Trans>Download PDF</Trans></button>

// For attributes, variables, store logic:
const label = t`Preview PDF`

// With interpolation:
<Trans>Editing: {cvName}</Trans>

// With plurals:
<Trans>You have {count, plural, one {# CV} other {# CVs}}</Trans>
```

### Extraction workflow

```bash
# Extract messages from source code
npx lingui extract

# This creates/updates:
# src/locales/en/messages.po
# src/locales/es/messages.po

# After translating, compile:
npx lingui compile
# Produces messages.js catalogs
```

### Locale switcher

Add a language toggle to the Toolbar (or settings). Simple two-option toggle: EN / ES.

Store the UI locale preference in localStorage under `gop-ui-locale`. Default: detect from `navigator.language` (if starts with "es", use "es", otherwise "en").

### What to translate

- All UI labels: buttons, headings, placeholders, tooltips, error messages
- Modal titles and body text
- Empty state messages
- AI feature labels and descriptions
- Privacy notice in settings

### What NOT to translate

- CV content (that's the user's job, or AI translation)
- Section type identifiers in code
- JSON keys

---

## 2. CV Locale

### Data model change

```typescript
// types/cv.ts (addition to CVMeta)

interface CVMeta {
  // ... existing fields
  locale: string; // BCP 47 tag: "en", "es", "pt-BR", etc.
}
```

Default: `"en"`. Shown in the meta editor as a dropdown or combobox.

### What CV locale affects

1. **Date formatting** in the HTML preview and PDF:
   - `en`: "May 2024 – Present"
   - `es`: "Mayo 2024 – Presente"
   - Note: the dates in the data model are freeform strings typed by the user, so this mainly affects any auto-generated dates and the "Present" keyword.

2. **AI prompts**: when generating or improving text, the prompt includes the CV locale so the AI responds in the correct language:

   ```
   The CV is written in ${cv.meta.locale}. Respond in the same language.
   ```

3. **PDF metadata**: set the `info.lang` field in the pdfmake document definition.

4. **AI translation**: the source locale of the CV is used to determine what language to translate FROM.

### Supported locales for the dropdown

Start with a practical list:

- English (en)
- Spanish (es)
- Portuguese (pt)
- French (fr)
- German (de)
- Italian (it)

The user can also type a custom BCP 47 tag if they need something else. The dropdown is a combobox: searchable, accepts free text.

---

## 3. Custom Fonts in PDF

### Problem

Phase 1 uses pdfmake's built-in Roboto. It's fine but generic. Users should have at least one alternative.

### Approach

Bundle 2-3 font families as static assets. Register them with pdfmake's VFS (virtual file system) at build time.

### Font choices

1. **Roboto** (default, already included) — neutral, safe
2. **Inter** — modern, widely used in tech
3. **Lora** — serif alternative, good for more traditional CVs

### Implementation

```typescript
// lib/fonts.ts

import interRegular from "../assets/fonts/Inter-Regular.ttf?arraybuffer";
import interBold from "../assets/fonts/Inter-Bold.ttf?arraybuffer";
import loraRegular from "../assets/fonts/Lora-Regular.ttf?arraybuffer";
import loraBold from "../assets/fonts/Lora-Bold.ttf?arraybuffer";

// Vite's ?arraybuffer import gives us the raw font data

export const customFonts = {
  Inter: {
    normal: interRegular,
    bold: interBold,
  },
  Lora: {
    normal: loraRegular,
    bold: loraBold,
  },
};

export function registerFonts() {
  // Register with pdfmake's VFS
  // pdfMake.vfs = { ...pdfMake.vfs, ...convertedFonts }
  // pdfMake.fonts = { ...pdfMake.fonts, Inter: {...}, Lora: {...} }
}
```

### UX

Add a font selector in the editor (or in a "Document settings" section at the top):

- Dropdown: Roboto / Inter / Lora
- The HTML preview switches font family to match
- The PDF generator uses the selected font

### Data model

```typescript
// types/cv.ts (addition to CV)

interface CV {
  // ... existing fields
  settings: CVSettings; // NEW
}

interface CVSettings {
  fontFamily: "Roboto" | "Inter" | "Lora";
  // Room for future settings: color scheme, page size, margins, etc.
}
```

Default: `{ fontFamily: "Roboto" }`.

---

## 4. AI CV Translation

### Concept

The user has a CV in Spanish and needs to apply to a job that requires an English CV. Instead of manually translating, they click "Translate CV" → choose the target language → the AI translates every text field → a new forked CV is created with the translated content and the new locale.

### UX flow

1. User clicks "🌐 Translate" in the Toolbar (or in the AI dropdown)
2. Modal opens:
   - Shows current CV locale (e.g. "Spanish")
   - Target language dropdown (same list as CV locale)
   - "Translate" button
3. Loading state with progress indication (since it may take several API calls)
4. When done:
   - A new CV is created as a fork of the current CV
   - Name: "[Original name] (English)" or similar
   - Locale set to the target language
   - All text content translated
   - User is switched to the new CV
   - Toast: "Translation complete. Review your CV — AI translations may need adjustments."

### Architecture

A single API call translating the entire CV at once is better than per-field calls (fewer round-trips, the AI has full context for consistent terminology).

**Serialize → Translate → Deserialize.**

```typescript
// lib/ai/prompts.ts

function translateCVPrompt(
  cv: CV,
  targetLocale: string,
): { role: string; content: string }[] {
  const cvJson = serializeCVForTranslation(cv);
  const targetLanguage = localeToLanguageName(targetLocale); // "en" → "English"
  const sourceLanguage = localeToLanguageName(cv.meta.locale); // "es" → "Spanish"

  return [
    {
      role: "system",
      content: `You are a professional CV translator. Translate the following CV content from ${sourceLanguage} to ${targetLanguage}.

Rules:
- Translate ALL text fields: summary, skills categories (but NOT individual skill names like "React" or "TypeScript"), role titles, company descriptions, bullets, education notes, language levels
- Keep proper nouns as-is: company names, university names, city names, technology names
- Maintain the same tone and level of formality
- Do not add or remove information
- Do not "improve" the content — translate it faithfully
- Return the result as a JSON object with the exact same structure as the input

Respond with ONLY the JSON object, no markdown fences, no preamble.`,
    },
    {
      role: "user",
      content: cvJson,
    },
  ];
}
```

### Serialization format

Don't send the entire CV object (it has IDs, settings, timestamps — noise for the translator). Instead, extract only the translatable fields into a clean structure:

```typescript
interface TranslatableCV {
  summary: string | null;
  skills: { category: string; items: string[] }[];
  experience: {
    role: string;
    company: string;
    location: string;
    bullets: string[];
  }[];
  education: {
    degree: string;
    institution: string;
    notes: string | null;
  }[];
  languages: {
    language: string;
    level: string;
  }[];
  custom: {
    title: string;
    content: string;
  }[];
}
```

### Deserialization

After receiving the translated JSON:

1. Parse it (with the same markdown-fence stripping and fallback as Phase 2)
2. Create a deep copy of the original CV
3. Walk through the copy and replace each translatable field with the translated value
4. Set the new locale
5. Create a fork via `forkCV`

### Error handling

- If parsing fails: show the raw response and let the user copy it manually
- If the response is incomplete (some fields missing): apply what was translated, leave the rest as-is, show a warning "Some sections couldn't be translated. Review and translate them manually."
- Rate limits: the full CV translation may hit the provider's token limit on free tiers. Show a clear error: "The CV is too long for the free model. Try a model with a larger context window, or translate one section at a time."

### Token budget concern

A full CV serialized as JSON can be 2-4K tokens. The system prompt adds ~200 tokens. The response will be a similar size. Total round-trip: ~5-10K tokens. This fits comfortably in Llama 3.3 70B's context window (128K), even on free tiers where rate limits are the constraint, not context length.

---

## 5. Landing Page

### Purpose

Explain what Good on Paper is, build trust, and get the user into the editor with zero friction.

### Design

Single page, no navigation. Sections scroll vertically:

1. **Hero**: "Good on Paper" + tagline + "Start building →" button
   - Tagline options: "The CV builder that gets out of your way" / "One design, done well" / "Your CV, not a template"
2. **What it does**: 3-4 feature cards
   - "Edit anything" — flexible sections, your structure
   - "AI assist" — bring your own key, rewrite bullets, tailor to jobs
   - "Fork & compare" — multiple versions, see what changed
   - "Free forever" — no account, no cloud, your data stays in your browser

3. **How it works**: 3-step flow
   - Fill in your info → Preview in real time → Download PDF

4. **Open source**: link to GitHub repo, "Built by [you]" with link to massick.dev

5. **Footer**: minimal, just the links

### Technical

- The landing page is a route: `/` → landing, `/editor` → the app
- Use React Router (you already have Vite, just add the router)
- Or simpler: detect if the user has a saved workspace and auto-redirect to `/editor`. New users see the landing page.
- The landing page is static HTML/CSS, no dynamic content, no API calls
- Design: follow the frontend-design skill — bold, distinctive, not generic. Dark theme with the blue accent (#3A6EA5). Typography: pick a distinctive display font from Google Fonts for headings.

---

## Implementation Order

### Phase 4a: Lingui Setup + UI i18n

1. Install Lingui dependencies
2. Create `lingui.config.ts`
3. Update `vite.config.ts` with Lingui plugin
4. Wrap the app in `<I18nProvider>` with locale detection (navigator.language)
5. Create locale switcher (EN/ES toggle) in toolbar or settings
6. Store preference in localStorage under `gop-ui-locale`
7. Go through ALL existing components and wrap user-visible strings with `<Trans>` or `t` macro
8. Run `npx lingui extract` to generate message catalogs
9. Translate `src/locales/es/messages.po` (you can do this yourself or use AI)
10. Run `npx lingui compile`
11. Verify: switch to Spanish, all UI labels change, switch back to English

### Phase 4b: CV Locale

1. Add `locale` to `CVMeta` type (default: "en")
2. Add locale combobox to the meta editor (searchable dropdown with the supported locales list)
3. Update AI prompts to include `The CV is written in ${locale}. Respond in the same language.`
4. Update the PDF generator to set document metadata language
5. Verify: set CV locale to Spanish, generate a summary with AI, confirm it comes back in Spanish

### Phase 4c: Custom Fonts

1. Download Inter and Lora font files (Regular + Bold weights) as TTF
2. Place in `src/assets/fonts/`
3. Create `lib/fonts.ts` to register fonts with pdfmake VFS
4. Add `CVSettings` to the CV type with `fontFamily` field
5. Add font selector to the editor (above sections, near meta)
6. Update the HTML preview to use the selected font
7. Update `generatePdfDefinition` to use the selected font
8. Verify: switch fonts, preview updates, PDF uses the correct font

### Phase 4d: AI Translation

1. Add `translateCVPrompt` to `lib/ai/prompts.ts`
2. Create `serializeCVForTranslation(cv)` and `deserializeTranslation(original, translated)` utilities
3. Create `src/components/ai/TranslateCV.tsx` — modal with source locale display, target locale picker, translate button, loading state
4. On success: fork the CV, apply translations, set new locale, switch to it, show toast
5. Handle errors: parse failure fallback, incomplete translation warning, rate limit message
6. Add "🌐 Translate" to the AI dropdown in toolbar
7. Verify: translate a Spanish CV to English, check that proper nouns are preserved, check that the fork has the correct parentId and locale

### Phase 4e: Landing Page

1. Install React Router: `npm install react-router`
2. Set up routes: `/` → LandingPage, `/editor` → the existing app
3. Auto-redirect: if `gop-workspace` exists in localStorage, redirect `/` to `/editor`
4. Build the landing page with hero, features, how-it-works, open source section, footer
5. Style it distinctively — not the same aesthetic as the editor. The landing page is marketing, the editor is a tool.
6. "Start building →" button links to `/editor`
7. Verify: new user sees landing page, clicks through, starts editing. Returning user goes straight to editor.

### Phase 4f: Final Polish

1. README.md for the GitHub repo (project description, screenshots, tech stack, how to run)
2. Meta tags: title, description, og:image for social sharing
3. Favicon
4. Performance check: Lighthouse audit, ensure the editor loads fast
5. Accessibility pass: keyboard navigation, aria labels on buttons, focus management in modals
6. Final `npm run build` — zero errors, zero warnings

---

## CLAUDE.md Additions

```markdown
## Phase 4 notes

- Lingui: every user-visible string must be wrapped in `<Trans>` (JSX) or `t` (JS). Never hardcode English strings in components.
- After adding or changing any translatable string, run `npx lingui extract` then `npx lingui compile`.
- CV locale (cv.meta.locale) is separate from UI locale. The UI can be in Spanish while the CV content is in English.
- Font files are in src/assets/fonts/. Import with `?arraybuffer` suffix for pdfmake VFS registration.
- The landing page route is `/`, the editor is `/editor`. React Router handles this.
- Auto-redirect logic: if gop-workspace exists in localStorage, redirect `/` to `/editor`.
```

---

## Acceptance Criteria (Phase 4 complete when:)

- [ ] UI is fully translated: English and Spanish, switchable via toggle
- [ ] Locale preference persists across reloads
- [ ] New users get locale auto-detected from browser
- [ ] Each CV has a locale field editable in the meta section
- [ ] AI prompts respect the CV locale (generate/improve in the correct language)
- [ ] PDF font can be switched between Roboto, Inter, and Lora
- [ ] Font change is reflected in both HTML preview and PDF output
- [ ] "Translate CV" creates a forked CV with all text content translated
- [ ] Translation preserves proper nouns (company names, tech names)
- [ ] Translation errors are handled gracefully (parse failure, incomplete, rate limit)
- [ ] Landing page exists at `/` with hero, features, how-it-works, and CTA
- [ ] Returning users are auto-redirected to `/editor`
- [ ] GitHub README is complete with description and setup instructions
- [ ] Lighthouse performance score ≥ 90
- [ ] No TypeScript errors, no console errors
