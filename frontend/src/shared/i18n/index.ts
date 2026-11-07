import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enCommon from "./locales/en/common.json";
import viCommon from "./locales/vi/common.json";
import enAccount from "./locales/en/account.json";
import viAccount from "./locales/vi/account.json";
import enWorkspace from "./locales/en/workspace.json";
import viWorkspace from "./locales/vi/workspace.json";
import enAgent from "./locales/en/agent.json";
import viAgent from "./locales/vi/agent.json";

export type Language = "en" | "vi";
const storageKey = "orbit.language";

export function getSavedLanguage(): Language {
  try {
    return localStorage.getItem(storageKey) === "vi" ? "vi" : "en";
  } catch {
    return "en";
  }
}

function synchronizeLanguage(language: string) {
  const supportedLanguage = language === "vi" ? "vi" : "en";
  if (typeof document !== "undefined") {
    document.documentElement.lang = supportedLanguage;
  }
  try {
    localStorage.setItem(storageKey, supportedLanguage);
  } catch {
    // Storage can be disabled; the in-memory preference still works.
  }
}

i18n.on("languageChanged", synchronizeLanguage);
void i18n.use(initReactI18next).init({
  resources: {
    en: {
      common: enCommon,
      account: enAccount,
      workspace: enWorkspace,
      agent: enAgent,
    },
    vi: {
      common: viCommon,
      account: viAccount,
      workspace: viWorkspace,
      agent: viAgent,
    },
  },
  lng: getSavedLanguage(),
  fallbackLng: "en",
  supportedLngs: ["en", "vi"],
  defaultNS: "common",
  interpolation: { escapeValue: false },
  initAsync: false,
  react: { useSuspense: false },
});

export async function setLanguage(language: string): Promise<void> {
  if (language !== "en" && language !== "vi") return;
  await i18n.changeLanguage(language);
}

export function getLocale(): string {
  return i18n.resolvedLanguage === "vi" ? "vi-VN" : "en-US";
}

export default i18n;
