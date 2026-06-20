// Supported display languages. `en` is the canonical storage language.
// Codes match MyMemory / ISO-639-1 so they can be passed straight to the API.
export const SOURCE_LANG = "en";

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English", native: "English" },
  { code: "mr", label: "Marathi", native: "मराठी" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
  { code: "gu", label: "Gujarati", native: "ગુજરાતી" },
];

export const TARGET_LANG_CODES = SUPPORTED_LANGUAGES
  .map((l) => l.code)
  .filter((c) => c !== SOURCE_LANG);

export function isSupportedLang(code) {
  return SUPPORTED_LANGUAGES.some((l) => l.code === code);
}

// Keep only valid target-language keys with non-empty string values.
// Used when persisting doctor-supplied translations for foods/categories.
export function sanitizeTranslations(obj) {
  const out = {};
  if (obj && typeof obj === "object") {
    for (const code of TARGET_LANG_CODES) {
      const v = obj[code];
      if (typeof v === "string" && v.trim()) out[code] = v.trim();
    }
  }
  return out;
}
