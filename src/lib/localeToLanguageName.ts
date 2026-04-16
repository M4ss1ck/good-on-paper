const LOCALE_NAMES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  pt: "Portuguese",
  fr: "French",
  de: "German",
  it: "Italian",
};

export function localeToLanguageName(locale: string): string {
  const base = locale.split("-")[0].toLowerCase();
  return LOCALE_NAMES[base] ?? locale;
}
