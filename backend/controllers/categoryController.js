import { Category } from "../models/Category.js";
import { FoodItem } from "../models/FoodItem.js";
import { translateName } from "../services/translationService.js";
import { SOURCE_LANG, isSupportedLang, sanitizeTranslations } from "../data/languages.js";

// Find a category by (case-insensitive) name, creating it if missing.
// Returns the Category document. Shared by the food endpoints.
export async function resolveOrCreateCategory(name) {
  const clean = (name || "").trim();
  if (!clean) throw new Error("Category name is required");
  let cat = await Category.findOne({ name: clean }).collation({ locale: "en", strength: 2 });
  if (!cat) cat = await Category.create({ name: clean });
  return cat;
}

// GET /api/categories?lang=mr&withCounts=1
export async function listCategories(req, res, next) {
  try {
    const lang = req.query.lang || SOURCE_LANG;
    const cats = await Category.find({ isActive: true }).sort({ name: 1 });

    let counts = {};
    if (req.query.withCounts) {
      const agg = await FoodItem.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: "$category", n: { $sum: 1 } } },
      ]);
      counts = Object.fromEntries(agg.map((a) => [String(a._id), a.n]));
    }

    const items = await Promise.all(
      cats.map(async (c) => ({
        _id: c._id,
        name_en: c.name,
        name: lang === SOURCE_LANG || !isSupportedLang(lang) ? c.name : await translateName(c, lang),
        foodCount: counts[String(c._id)] || 0,
      }))
    );
    res.json({ lang, count: items.length, categories: items });
  } catch (err) {
    next(err);
  }
}

// POST /api/categories   { name, translations? }
// `translations` = doctor-verified { mr, hi, gu } from the Translate+override UI.
export async function createCategory(req, res, next) {
  try {
    const name = (req.body.name || "").trim();
    if (!name) return res.status(400).json({ error: "name is required" });
    const cat = await Category.create({ name, translations: sanitizeTranslations(req.body.translations) });
    res.status(201).json(cat);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: "Category already exists" });
    next(err);
  }
}

// PUT /api/categories/:id   { name?, translations?, isActive? }
export async function updateCategory(req, res, next) {
  try {
    const update = {};
    if (req.body.translations !== undefined) {
      // Explicit override always wins.
      update.translations = sanitizeTranslations(req.body.translations);
    }
    if (req.body.name) {
      update.name = req.body.name.trim();
      // Rename without new translations -> clear stale ones (they'll repopulate).
      if (update.translations === undefined) update.translations = {};
    }
    if (req.body.isActive !== undefined) update.isActive = req.body.isActive;

    const cat = await Category.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!cat) return res.status(404).json({ error: "Category not found" });
    res.json(cat);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: "Category already exists" });
    next(err);
  }
}

// DELETE /api/categories/:id  (blocked while foods still reference it)
export async function deleteCategory(req, res, next) {
  try {
    const inUse = await FoodItem.countDocuments({ category: req.params.id, isActive: true });
    if (inUse > 0) {
      return res.status(409).json({
        error: `Cannot delete: ${inUse} food item(s) still use this category. Reassign or remove them first.`,
      });
    }
    const cat = await Category.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!cat) return res.status(404).json({ error: "Category not found" });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
