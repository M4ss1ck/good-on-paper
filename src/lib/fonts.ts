import interRegularUrl from "../assets/fonts/Inter-Regular.ttf?url";
import interBoldUrl from "../assets/fonts/Inter-Bold.ttf?url";
import loraRegularUrl from "../assets/fonts/Lora-Regular.ttf?url";
import loraBoldUrl from "../assets/fonts/Lora-Bold.ttf?url";

/**
 * Font files the app ships beyond pdfmake's built-in Roboto, keyed by the file
 * name the PDF renderer registers them under. Registration lives in
 * components/pdf/renderPdf.ts.
 */
export const bundledFontUrls = {
  "Inter-Regular.ttf": interRegularUrl,
  "Inter-Bold.ttf": interBoldUrl,
  "Lora-Regular.ttf": loraRegularUrl,
  "Lora-Bold.ttf": loraBoldUrl,
} as const;

/** Font URL map for @font-face in the HTML preview */
export const previewFontUrls = {
  Inter: { regular: interRegularUrl, bold: interBoldUrl },
  Lora: { regular: loraRegularUrl, bold: loraBoldUrl },
};
