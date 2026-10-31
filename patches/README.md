# Patches

## pdfmake+0.3.7.patch

pdfmake 0.3.7 writes PDF bookmarks whose destination is the page's top-right corner
(`XYZ 612 792`), so every outline entry jumps to the corner of its page instead of its
heading. pdfmake's bundle (`pdfmake/build/pdfmake.js`, the one the app imports) calls
pdfkit's `addItem(title, { expanded })` with no position, and pdfkit then computes the
destination from the page's right and top edges.

The patch:

- `Renderer.renderLine` passes the line's `x` and `y` as `left` and `top`.
- pdfkit's `PDFOutline` uses `left` as an absolute x (it was an inset from the right edge).
  `top` already meant distance from the top edge, which matches pdfmake's `y`.
- `endOutline` no longer sets `/PageMode /UseOutlines`, so the viewer opens on the page, not the bookmark panel.

Tests that depend on it: `src/components/pdf/renderPdf.test.ts` (outline and destinations).

Upstream: an issue or PR against pdfkit (bookmark destination position) is still to be filed.
Until then, a reinstall must reapply this patch (`postinstall` runs `patch-package`).
