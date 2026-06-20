import { translateText } from "../services/translationService.js";
import { SUPPORTED_LANGUAGES, isSupportedLang, TARGET_LANG_CODES } from "../data/languages.js";

// GET /api/languages
export function getLanguages(req, res) {
  res.json({ languages: SUPPORTED_LANGUAGES });
}

// GET /api/translate/suggest?text=Idli
// Returns MyMemory (glossary-boosted) suggestions for ALL target languages at
// once, to pre-fill the "Translate" button in the add/edit UI. The doctor then
// reviews/overrides before saving — these are only suggestions.
export async function suggestTranslations(req, res, next) {
  try {
    const text = (req.query.text || "").trim();
    if (!text) return res.status(400).json({ error: "text query param is required" });

    const entries = await Promise.all(
      TARGET_LANG_CODES.map(async (code) => [code, await translateText(text, code)])
    );
    res.json({ text, translations: Object.fromEntries(entries) });
  } catch (err) {
    next(err);
  }
}

// POST /api/translate   { text | texts: [], lang }
// Useful for translating ad-hoc UI strings or arrays of labels.
export async function translate(req, res, next) {
  try {
    const { text, texts, lang } = req.body;
    if (!lang || !isSupportedLang(lang)) {
      return res.status(400).json({ error: "Valid 'lang' is required (mr, hi, gu, en)" });
    }

    if (Array.isArray(texts)) {
      const result = await Promise.all(
        texts.map(async (t) => ({ source: t, translated: await translateText(t, lang) }))
      );
      return res.json({ lang, results: result });
    }

    if (typeof text === "string") {
      return res.json({ lang, source: text, translated: await translateText(text, lang) });
    }

    res.status(400).json({ error: "Provide 'text' (string) or 'texts' (array)" });
  } catch (err) {
    next(err);
  }
}
