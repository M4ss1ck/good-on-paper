# Good on Paper

A free, private CV builder that runs entirely in your browser. No account, no cloud, no tracking.

## Features

- **Edit anything** — sections, bullets, skills, education. Drag to reorder, toggle visibility
- **AI assist (BYOK)** — generate summaries, improve bullets, tailor to job descriptions. Works with OpenAI, Google Gemini, Mistral, Groq, DeepSeek, xAI, OpenRouter, and Cloudflare Workers AI — bring your own API key
- **Fork & compare** — create variants for different roles. Compare versions side by side with visual diffs
- **AI translation** — translate your entire CV into another language, creating a new fork
- **PDF export** — download a clean, print-ready PDF
- **Custom fonts** — choose between Roboto, Inter, and Lora
- **Multilingual UI** — English and Spanish, with more to come
- **Free forever** — your data stays in your browser. Open source under MIT

## Tech Stack

- [React](https://react.dev) + [TypeScript](https://www.typescriptlang.org)
- [Tailwind CSS](https://tailwindcss.com) v4
- [Zustand](https://zustand.docs.pmnd.rs) + [Immer](https://immerjs.github.io/immer/)
- [pdfmake](http://pdfmake.org) for PDF generation
- [Lingui](https://lingui.dev) for i18n
- [dnd-kit](https://dndkit.com) for drag-and-drop
- [Vite](https://vite.dev) for build tooling
- Deployed on [Cloudflare](https://pages.cloudflare.com)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## License

[MIT](LICENSE)

## Credits

Built by [@M4ss1ck](https://massick.dev).
