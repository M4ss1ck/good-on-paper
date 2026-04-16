import { i18n } from "@lingui/core";

const LOCALE_KEY = "gop-ui-locale";

export type AppLocale = "en" | "es";

function detectLocale(): AppLocale {
  const stored = localStorage.getItem(LOCALE_KEY);
  if (stored === "en" || stored === "es") return stored;
  return navigator.language.startsWith("es") ? "es" : "en";
}

export function getLocale(): AppLocale {
  return i18n.locale as AppLocale || "en";
}

export function setLocale(locale: AppLocale) {
  localStorage.setItem(LOCALE_KEY, locale);
}

export async function loadCatalog(locale: AppLocale) {
  const { messages } = await import(`./locales/${locale}/messages.po`);
  i18n.load(locale, messages);
  i18n.activate(locale);
  setLocale(locale);
}

export async function initI18n() {
  const locale = detectLocale();
  await loadCatalog(locale);
}
