import pdfMake from "pdfmake/build/pdfmake";

import interRegularUrl from "../assets/fonts/Inter-Regular.ttf?url";
import interBoldUrl from "../assets/fonts/Inter-Bold.ttf?url";
import loraRegularUrl from "../assets/fonts/Lora-Regular.ttf?url";
import loraBoldUrl from "../assets/fonts/Lora-Bold.ttf?url";

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function fetchAsBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  return arrayBufferToBase64(buf);
}

let registered = false;

export async function registerFonts(): Promise<void> {
  if (registered) return;
  registered = true;

  const [interRegular, interBold, loraRegular, loraBold] = await Promise.all([
    fetchAsBase64(interRegularUrl),
    fetchAsBase64(interBoldUrl),
    fetchAsBase64(loraRegularUrl),
    fetchAsBase64(loraBoldUrl),
  ]);

  pdfMake.addVirtualFileSystem({
    "Inter-Regular.ttf": interRegular,
    "Inter-Bold.ttf": interBold,
    "Lora-Regular.ttf": loraRegular,
    "Lora-Bold.ttf": loraBold,
  });

  pdfMake.addFonts({
    Inter: {
      normal: "Inter-Regular.ttf",
      bold: "Inter-Bold.ttf",
      italics: "Inter-Regular.ttf",
      bolditalics: "Inter-Bold.ttf",
    },
    Lora: {
      normal: "Lora-Regular.ttf",
      bold: "Lora-Bold.ttf",
      italics: "Lora-Regular.ttf",
      bolditalics: "Lora-Bold.ttf",
    },
  });
}

/** Font URL map for @font-face in the HTML preview */
export const previewFontUrls = {
  Inter: { regular: interRegularUrl, bold: interBoldUrl },
  Lora: { regular: loraRegularUrl, bold: loraBoldUrl },
};
