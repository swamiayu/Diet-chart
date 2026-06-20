import axios from "axios";
import { glossaryLookup } from "../data/foodGlossary.js";
import { TranslationCache } from "../models/TranslationCache.js";
import { SOURCE_LANG, isSupportedLang } from "../data/languages.js";

const MYMEMORY_URL = "https://api.mymemory.translated.net/get";

// In-process memo so a single request burst doesn't re-hit Mongo/MyMemory.
const memo = new Map(); // `${lang}:${key}` -> translatedText

function memoKey(text, lang) {
  return `${lang}:${text.trim().toLowerCase()}`;
}

// Detect MyMemory's "error-as-text" responses so we never cache garbage.
function looksLikeMyMemoryError(s) {
  if (!s) return true;
  const upper = s.toUpperCase();
  return (
    upper.includes("MYMEMORY WARNING") ||
    upper.includes("PLEASE SELECT TWO DISTINCT LANGUAGES") ||
    upper.includes("INVALID") ||
    upper.includes("QUERY LENGTH LIMIT")
  );
}

async function callMyMemory(text, lang) {
  const params = {
    q: text,
    langpair: `${SOURCE_LANG}|${lang}`,
  };
  if (process.env.MYMEMORY_EMAIL) params.de = process.env.MYMEMORY_EMAIL;

  const { data } = await axios.get(MYMEMORY_URL, { params, timeout: 12000 });

  const status = data?.responseStatus;
  const translated = data?.responseData?.translatedText;

  if (Number(status) !== 200 || !translated || looksLikeMyMemoryError(translated)) {
    const detail = data?.responseDetails || `status ${status}`;
    throw new Error(`MyMemory failed: ${detail}`);
  }
  return translated.trim();
}

/**
 * Translate a single English string into `lang`.
 * Order: same-language passthrough -> glossary -> DB cache -> MyMemory.
 * Always returns a string (falls back to the original English on failure).
 */
export async function translateText(text, lang) {
  const clean = (text || "").trim();
  if (!clean) return "";
  if (lang === SOURCE_LANG || !isSupportedLang(lang)) return clean;

  const mKey = memoKey(clean, lang);
  if (memo.has(mKey)) return memo.get(mKey);

  // 1) Curated glossary (most reliable for food terms).
  const fromGlossary = glossaryLookup(clean, lang);
  if (fromGlossary) {
    memo.set(mKey, fromGlossary);
    return fromGlossary;
  }

  const sourceKey = clean.toLowerCase();

  // 2) Persistent cache.
  try {
    const cached = await TranslationCache.findOne({ sourceText: sourceKey, lang }).lean();
    if (cached?.translatedText) {
      memo.set(mKey, cached.translatedText);
      return cached.translatedText;
    }
  } catch {
    /* cache read failure is non-fatal */
  }

  // 3) MyMemory API.
  try {
    const translated = await callMyMemory(clean, lang);
    memo.set(mKey, translated);
    // Persist for next time (ignore duplicate-key races).
    TranslationCache.updateOne(
      { sourceText: sourceKey, lang },
      { $set: { translatedText: translated, provider: "mymemory" } },
      { upsert: true }
    ).catch(() => {});
    return translated;
  } catch (err) {
    console.warn(`Translation fallback for "${clean}" -> ${lang}: ${err.message}`);
    return clean; // graceful degradation: show English
  }
}

/**
 * Resolve the display name of a doc (Category/FoodItem) in `lang`.
 * The doc's `translations` map is AUTHORITATIVE (doctor-verified, stored in DB).
 * Only when a language is unset do we fall back to a live MyMemory translation —
 * and we do NOT write that fallback back onto the doc, so the stored map always
 * reflects exactly what was reviewed/saved (and stays editable in production).
 */
export async function translateName(doc, lang) {
  if (!doc) return "";
  if (lang === SOURCE_LANG) return doc.name;

  const stored =
    typeof doc.translations?.get === "function"
      ? doc.translations.get(lang)
      : doc.translations?.[lang];
  if (stored) return stored;

  // No doctor-set value -> best-effort fallback (cached in TranslationCache, not on the doc).
  return translateText(doc.name, lang);
}

/**
 * Translate a food item's name and its (populated) category name.
 * `foodDoc.category` must be a populated Category document.
 */
export async function translateFoodItem(foodDoc, lang) {
  const cat = foodDoc.category && typeof foodDoc.category === "object" ? foodDoc.category : null;
  const [name, category] = await Promise.all([
    translateName(foodDoc, lang),
    cat ? translateName(cat, lang) : Promise.resolve(""),
  ]);
  return {
    name,
    category,
    name_en: foodDoc.name,
    category_en: cat?.name || "",
    categoryId: cat?._id || foodDoc.category || null,
  };
}

/** Translate a list of food docs (category populated) into display-ready rows. */
export async function translateFoodList(foodDocs, lang) {
  return Promise.all(
    foodDocs.map(async (doc) => {
      const t = await translateFoodItem(doc, lang);
      return {
        _id: doc._id,
        name_en: t.name_en,
        category_en: t.category_en,
        categoryId: t.categoryId,
        name: t.name,
        category: t.category,
        notes: doc.notes || "",
        lang,
      };
    })
  );
}
