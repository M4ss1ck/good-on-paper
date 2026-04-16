# Good on Paper — AGENTS.md

## Project Overview

**Good on Paper** is a free, opinionated CV builder web app. One design, done well. The user gets total control over sections and their content, but the app provides sane defaults and structure out of the box. AI-assisted filling comes later (Phase 2); this document covers **Phase 1: Core Editor + PDF Export**.

The app runs entirely in the browser. No backend, no auth, no database. Data lives in localStorage. PDF generation is client-side via pdfmake. Deploy target is Cloudflare Pages.

---

## Phase 1 Scope

Phase 1 delivers a usable product: the user can create a CV, edit it, reorder sections, preview it live in HTML, preview the real PDF in a modal, and download it. No AI features yet.

### What ships

- Section-based CV editor (left panel)
- Live HTML preview (right panel, updates on every keystroke)
- "Preview PDF" button → pdfmake generates blob → renders in iframe modal
- "Download PDF" button → triggers browser download
- localStorage persistence (auto-save on change, debounced 500ms)
- JSON export/import for portability
- Default sections: Summary, Skills (grouped), Experience, Education, Languages
- User can: add, remove, reorder (drag), rename, and toggle visibility of sections
- Custom section type (freeform text) for anything that doesn't fit the typed schemas
- Responsive layout (desktop-first, but mobile shouldn't break)

### What does NOT ship in Phase 1

- AI features (BYOK, bullet rewriting, summary generation)
- Multiple CV versions / forking
- Custom fonts in PDF
- i18n
- Landing page / marketing site
- User accounts or cloud sync

---

## Stack

| Layer       | Choice                   | Notes                                           |
| ----------- | ------------------------ | ----------------------------------------------- |
| Framework   | React 19 + Vite          | SPA, no SSR needed                              |
| Language    | TypeScript (strict)      | `"strict": true` in tsconfig                    |
| Styling     | Tailwind CSS v4          | Utility-first, design tokens via CSS variables  |
| State       | Zustand                  | Single store with slices for CV data + UI state |
| PDF         | pdfmake                  | Declarative JSON → PDF, client-side             |
| Drag & Drop | @dnd-kit/core + sortable | For section reordering                          |
| Storage     | localStorage             | JSON.stringify the CV store                     |
| Deploy      | Cloudflare Pages         | Static site, no functions needed in Phase 1     |
| Linting     | ESLint + Prettier        | Standard config, run on pre-commit              |

---

## Data Model

```typescript
// types/cv.ts

interface CV {
  meta: CVMeta;
  sections: Section[];
}

interface CVMeta {
  name: string;
  title: string; // e.g. "Full Stack Developer"
  email: string;
  phone: string;
  location: string;
  links: { label: string; url: string }[];
}

type SectionType =
  | "summary"
  | "skills"
  | "experience"
  | "education"
  | "languages"
  | "custom";

interface Section {
  id: string; // nanoid
  type: SectionType;
  title: string; // user can rename, defaults based on type
  visible: boolean; // toggle without deleting
  items: SectionItem[]; // polymorphic based on type
}

// Item types

interface SummaryItem {
  content: string; // plain text paragraph
}

interface SkillItem {
  category: string; // e.g. "Frontend", "Backend"
  items: string[]; // e.g. ["React", "TypeScript"]
}

interface ExperienceItem {
  id: string;
  role: string;
  company: string;
  location: string;
  startDate: string; // "May 2024", freeform string not Date
  endDate: string; // "Present" or "Jan 2023"
  bullets: string[];
}

interface EducationItem {
  id: string;
  degree: string;
  institution: string;
  dates: string; // "2011 – 2017"
  notes?: string;
}

interface LanguageItem {
  language: string;
  level: string; // "Native", "Professional", "Conversational"
}

interface CustomItem {
  id: string;
  content: string; // freeform text
}

type SectionItem =
  | SummaryItem
  | SkillItem
  | ExperienceItem
  | EducationItem
  | LanguageItem
  | CustomItem;
```

### Default CV

When the user first opens the app with no saved data, create a CV with these sections (in order), all visible, all empty:

1. Summary (`type: "summary"`)
2. Technical Skills (`type: "skills"`)
3. Professional Experience (`type: "experience"`)
4. Education (`type: "education"`)
5. Languages (`type: "languages"`)

---

## Project Structure

```
good-on-paper/
├── public/
├── src/
│   ├── components/
│   │   ├── editor/              # Left panel: forms for each section type
│   │   │   ├── CVEditor.tsx     # Main editor container
│   │   │   ├── MetaEditor.tsx   # Name, title, contact info
│   │   │   ├── SectionEditor.tsx # Renders correct editor for section.type
│   │   │   ├── SummaryEditor.tsx
│   │   │   ├── SkillsEditor.tsx
│   │   │   ├── ExperienceEditor.tsx
│   │   │   ├── EducationEditor.tsx
│   │   │   ├── LanguagesEditor.tsx
│   │   │   ├── CustomEditor.tsx
│   │   │   └── SectionList.tsx   # Sortable section list with drag handles
│   │   ├── preview/             # Right panel: live HTML preview
│   │   │   ├── CVPreview.tsx    # Main preview container
│   │   │   ├── PreviewMeta.tsx
│   │   │   ├── PreviewSection.tsx
│   │   │   └── PreviewStyles.tsx # Tailwind classes or inline styles for preview
│   │   ├── pdf/                 # PDF generation
│   │   │   ├── generatePdf.ts   # CV data → pdfmake document definition
│   │   │   └── PdfPreviewModal.tsx # iframe modal for PDF preview
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx    # Split-pane layout
│   │   │   └── Toolbar.tsx      # Top bar: Preview PDF, Download, Export JSON, Import JSON
│   │   └── ui/                  # Shared primitives (Button, Input, Modal, etc.)
│   ├── store/
│   │   ├── cvStore.ts           # Zustand store: CV data + actions
│   │   └── uiStore.ts           # Zustand store: UI state (modal open, active section)
│   ├── lib/
│   │   ├── defaults.ts          # Default empty CV
│   │   ├── storage.ts           # localStorage read/write with debounce
│   │   └── id.ts                # nanoid wrapper
│   ├── types/
│   │   └── cv.ts                # All types from data model above
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css                # Tailwind directives + design tokens
├── AGENTS.md                    # This file
├── CLAUDE.md                    # Claude Code instructions (see below)
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
└── eslint.config.js
```

---

## Zustand Store Design

```typescript
// store/cvStore.ts

interface CVStore {
  cv: CV;

  // Meta
  updateMeta: (meta: Partial<CVMeta>) => void;

  // Sections
  addSection: (type: SectionType) => void;
  removeSection: (sectionId: string) => void;
  moveSection: (fromIndex: number, toIndex: number) => void;
  updateSectionTitle: (sectionId: string, title: string) => void;
  toggleSectionVisibility: (sectionId: string) => void;

  // Items (generic, dispatches based on section type)
  addItem: (sectionId: string) => void;
  removeItem: (sectionId: string, itemId: string) => void;
  updateItem: (
    sectionId: string,
    itemId: string,
    data: Partial<SectionItem>,
  ) => void;

  // Experience-specific (bullets are nested)
  addBullet: (sectionId: string, itemId: string) => void;
  removeBullet: (
    sectionId: string,
    itemId: string,
    bulletIndex: number,
  ) => void;
  updateBullet: (
    sectionId: string,
    itemId: string,
    bulletIndex: number,
    text: string,
  ) => void;

  // Persistence
  loadFromStorage: () => void;
  exportJson: () => string;
  importJson: (json: string) => void;
}
```

### Persistence

- Subscribe to store changes with `zustand/subscribeWithSelector`
- On any change, debounce 500ms, then `localStorage.setItem("gop-cv", JSON.stringify(cv))`
- On app init, `loadFromStorage()` reads from localStorage; if empty, use default CV
- Key: `"gop-cv"` (gop = good on paper)

---

## PDF Generation (pdfmake)

### Architecture

`generatePdf.ts` takes a `CV` object and returns a pdfmake document definition. The mapping is direct:

```typescript
function generatePdfDefinition(cv: CV): TDocumentDefinitions {
  // 1. Build header from cv.meta (name, title, contact line)
  // 2. Iterate cv.sections.filter(s => s.visible)
  // 3. For each section, call the appropriate builder:
  //    - buildSummarySection(section)
  //    - buildSkillsSection(section)
  //    - buildExperienceSection(section)
  //    - buildEducationSection(section)
  //    - buildLanguagesSection(section)
  //    - buildCustomSection(section)
  // 4. Return { content, styles, defaultStyle, pageMargins }
}
```

### Style mapping

Define a consistent style map that mirrors the HTML preview as closely as possible:

- Page: Letter size, margins [50, 40, 50, 40]
- Name: 20pt, bold, dark blue (#1F3A5F)
- Title: 12pt, accent blue (#3A6EA5)
- Contact: 9pt, muted gray
- Section heading: 11pt, bold, uppercase, dark blue, with a thin horizontal rule below
- Body text: 10pt, justified
- Role title: 10.5pt, bold
- Company line: 10pt, italic, accent blue
- Bullets: 9.5pt, left indent 12pt

### Font

Use pdfmake's built-in Roboto for Phase 1. Custom fonts can come later.

### Export flow

1. **"Preview PDF"**: `pdfmake.createPdf(def).getBlob()` → create object URL → open in iframe inside modal
2. **"Download PDF"**: `pdfmake.createPdf(def).download("cv.pdf")`

---

## UI / Layout

### Split-pane layout

```
┌──────────────────────────────────────────────────┐
│  Toolbar: [Preview PDF] [Download] [Export] [Import] │
├─────────────────────┬────────────────────────────┤
│                     │                            │
│   Editor Panel      │    HTML Preview Panel      │
│   (scrollable)      │    (scrollable, A4-ish)    │
│                     │                            │
│   - Meta form       │    Live render of CV       │
│   - Section list    │    using Tailwind styles    │
│     (sortable)      │                            │
│   - Section editors │                            │
│                     │                            │
└─────────────────────┴────────────────────────────┘
```

- Desktop: 45% editor / 55% preview (or similar)
- The preview panel should have a white "page" container with A4-ish proportions, centered in a gray background, to give a print-like feel
- Both panels scroll independently

### Editor UX

- Each section in the editor is a collapsible card
- Drag handle on the left of each card for reordering
- Eye icon to toggle visibility (dimmed when hidden, still editable)
- Trash icon to delete (with confirmation)
- "Add section" button at bottom with dropdown for section type
- Within each section, items have their own add/remove controls

### Design direction

Aim for a clean, functional UI. Think Notion-like simplicity: lots of whitespace, subtle borders, no heavy shadows. The focus is the content, not the chrome.

- Color palette: white/near-white backgrounds, dark text, one accent color (blue)
- Typography: system font stack for the UI (the preview can use its own fonts)
- Inputs: borderless or very subtle borders, focus ring only
- Animations: minimal. Smooth reorder animation from dnd-kit is enough

---

## Implementation Order

Execute these phases sequentially. Each phase should result in working code that can be tested.

### Phase 1a: Scaffold + Data Layer

1. Init project: `npm create vite@latest good-on-paper -- --template react-ts`
2. Install deps: tailwindcss, zustand, nanoid, pdfmake, @dnd-kit/core, @dnd-kit/sortable
3. Set up Tailwind v4
4. Create types (`types/cv.ts`)
5. Create defaults (`lib/defaults.ts`)
6. Create Zustand store (`store/cvStore.ts`) with all actions
7. Create localStorage persistence (`lib/storage.ts`)
8. Write a quick smoke test: render App, check store initializes with default CV

### Phase 1b: Editor Panel

1. Build `AppLayout.tsx` with split-pane
2. Build `MetaEditor.tsx` (name, title, email, phone, location, links)
3. Build `SectionList.tsx` with dnd-kit sortable
4. Build each section editor: Summary, Skills, Experience, Education, Languages, Custom
5. Build "Add section" dropdown
6. Wire everything to the Zustand store

### Phase 1c: HTML Preview

1. Build `CVPreview.tsx` that reads from the store and renders the CV as styled HTML
2. Build sub-components: `PreviewMeta`, `PreviewSection` (dispatches to type-specific renderers)
3. Style the preview to closely match the target PDF output
4. Ensure the preview updates reactively on every store change

### Phase 1d: PDF Generation

1. Set up pdfmake with vfs_fonts (built-in Roboto)
2. Implement `generatePdfDefinition(cv)` with all section builders
3. Test: generate a PDF from the default CV data and verify output
4. Implement "Preview PDF" modal with iframe
5. Implement "Download PDF" button

### Phase 1e: Toolbar + Import/Export

1. Build `Toolbar.tsx` with all buttons
2. Implement JSON export (`cvStore.exportJson()` → download .json file)
3. Implement JSON import (file picker → `cvStore.importJson()`)
4. Add "New CV" button (reset to defaults, with confirmation)

### Phase 1f: Polish

1. Keyboard navigation: Tab through fields, Enter to add new bullet
2. Empty state: when a section has no items, show a helpful prompt
3. Confirm dialogs for destructive actions (delete section, reset CV)
4. Auto-save indicator ("Saved" / "Saving..." in toolbar)
5. Basic responsive adjustments for tablets (stack panels vertically)

---

## CLAUDE.md (for Claude Code execution)

Place this at the project root as `CLAUDE.md`:

```markdown
# CLAUDE.md — Good on Paper

## Project context

Free, opinionated CV builder. React 19 + Vite + Tailwind + Zustand + pdfmake.
All client-side. No backend. Data in localStorage.
See AGENTS.md for full spec.

## Commands

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run lint` — eslint
- `npm run preview` — preview production build

## Code conventions

- TypeScript strict mode. No `any` unless absolutely necessary (and add a comment why).
- Functional components only. No class components.
- Zustand store: one file per slice concept (cvStore, uiStore). Use immer middleware for nested updates.
- File naming: PascalCase for components, camelCase for utilities and stores.
- Imports: prefer named exports. Default export only for page-level components.
- CSS: Tailwind utility classes. No CSS modules. No styled-components.
- No `console.log` in committed code (use `console.warn` or `console.error` if needed).

## Architecture rules

- The store is the single source of truth. Components read from store, dispatch actions.
- The PDF generator is a pure function: CV data in, pdfmake definition out. No side effects.
- The HTML preview reads from the same store as the editor. No separate state.
- Do not put business logic in components. Extract to store actions or lib/ utilities.

## Design tokens (Tailwind CSS variables)

- Primary: #1F3A5F (dark blue, used for headings and accents)
- Accent: #3A6EA5 (medium blue, used for links and highlights)
- Muted: #555555 (secondary text)
- Light: #888888 (tertiary text, dates)
- Background: #F8F8F8 (preview panel background)
- Page: #FFFFFF (preview page and editor cards)

## pdfmake notes

- Import pdfmake/build/pdfmake and pdfmake/build/vfs_fonts
- The vfs_fonts import registers Roboto automatically
- Use TDocumentDefinitions type from pdfmake/interfaces
- Keep the style map in a separate constant, not inline in the generator

## Testing

- No test framework in Phase 1. Manual testing only.
- Smoke test: after any change, verify the PDF downloads and the preview renders.
```

---

## Acceptance Criteria (Phase 1 complete when:)

- [ ] User can fill in all meta fields (name, title, email, phone, location, links)
- [ ] User can add, remove, reorder, rename, and hide/show sections
- [ ] All 6 section types work: summary, skills, experience, education, languages, custom
- [ ] Experience section supports multiple items, each with multiple bullets
- [ ] Skills section supports grouped categories
- [ ] HTML preview updates in real time as the user types
- [ ] "Preview PDF" opens a modal with the real PDF rendered in an iframe
- [ ] "Download PDF" downloads a well-formatted PDF
- [ ] Data persists across page reloads (localStorage)
- [ ] JSON export downloads a .json file
- [ ] JSON import loads data from a .json file
- [ ] "New CV" resets to defaults with confirmation
- [ ] The PDF output closely matches the HTML preview in structure and style
- [ ] No runtime errors in the console during normal usage
