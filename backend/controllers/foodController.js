import { FoodItem } from "../models/FoodItem.js";
import { Category } from "../models/Category.js";
import { resolveOrCreateCategory } from "./categoryController.js";
import { translateFoodList } from "../services/translationService.js";
import { SOURCE_LANG, isSupportedLang, sanitizeTranslations } from "../data/languages.js";

// GET /api/foods?lang=mr&categoryId=<id>&search=ba
// Returns the master food list (category populated), translated into `lang`.
export async function listFoods(req, res, next) {
  try {
    const lang = req.query.lang || SOURCE_LANG;
    const filter = { isActive: true };
    if (req.query.categoryId) filter.category = req.query.categoryId;
    if (req.query.search) filter.name = { $regex: req.query.search, $options: "i" };

    const foods = await FoodItem.find(filter).populate("category").sort({ name: 1 });

    if (lang === SOURCE_LANG || !isSupportedLang(lang)) {
      return res.json({
        lang: SOURCE_LANG,
        count: foods.length,
        items: foods.map((f) => ({
          _id: f._id,
          name: f.name,
          name_en: f.name,
          category: f.category?.name || "",
          category_en: f.category?.name || "",
          categoryId: f.category?._id || null,
          notes: f.notes || "",
        })),
      });
    }

    const items = await translateFoodList(foods, lang);
    res.json({ lang, count: items.length, items });
  } catch (err) {
    next(err);
  }
}

// Resolve a category from a request body that may carry `categoryId` or `category` (name).
async function resolveCategory(body) {
  if (body.categoryId) {
    const cat = await Category.findById(body.categoryId);
    if (!cat) throw Object.assign(new Error("categoryId not found"), { status: 400 });
    return cat;
  }
  if (body.category) return resolveOrCreateCategory(body.category);
  throw Object.assign(new Error("categoryId or category (name) is required"), { status: 400 });
}

// POST /api/foods   { name, categoryId } OR { name, category: "<name>" }
// If `category` is a name that doesn't exist yet, the category is created.
export async function createFood(req, res, next) {
  try {
    const name = (req.body.name || "").trim();
    if (!name) return res.status(400).json({ error: "name is required" });

    const cat = await resolveCategory(req.body);
    const food = await FoodItem.create({
      name,
      category: cat._id,
      notes: req.body.notes,
      translations: sanitizeTranslations(req.body.translations), // doctor-verified mr/hi/gu
    });
    const populated = await food.populate("category");
    res.status(201).json(populated);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: "Food item already exists" });
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

// POST /api/foods/bulk   { items: [{ name, category }] }  (category is a name)
export async function bulkCreateFoods(req, res, next) {
  try {
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    if (!items.length) return res.status(400).json({ error: "items array required" });

    // Resolve all distinct category names up front.
    const catNames = [...new Set(items.map((i) => (i.category || "").trim()).filter(Boolean))];
    const catMap = new Map();
    for (const n of catNames) {
      const c = await resolveOrCreateCategory(n);
      catMap.set(n.toLowerCase(), c._id);
    }

    const ops = items
      .filter((i) => i.name && i.category)
      .map((i) => ({
        updateOne: {
          filter: { name: i.name.trim() },
          update: { $setOnInsert: { name: i.name.trim(), category: catMap.get(i.category.trim().toLowerCase()) } },
          upsert: true,
        },
      }));

    const result = await FoodItem.bulkWrite(ops, { ordered: false });
    res.status(201).json({ inserted: result.upsertedCount, matched: result.matchedCount, total: items.length });
  } catch (err) {
    next(err);
  }
}

// PUT /api/foods/:id   { name?, categoryId?/category?, notes?, isActive? }
export async function updateFood(req, res, next) {
  try {
    const update = {};
    if (req.body.translations !== undefined) {
      update.translations = sanitizeTranslations(req.body.translations); // explicit override wins
    }
    if (req.body.name) {
      update.name = req.body.name.trim();
      // Rename without new translations -> clear stale ones.
      if (update.translations === undefined) update.translations = {};
    }
    if (req.body.categoryId || req.body.category) {
      const cat = await resolveCategory(req.body);
      update.category = cat._id;
    }
    if (req.body.notes !== undefined) update.notes = req.body.notes;
    if (req.body.isActive !== undefined) update.isActive = req.body.isActive;

    const food = await FoodItem.findByIdAndUpdate(req.params.id, update, { new: true }).populate("category");
    if (!food) return res.status(404).json({ error: "Food item not found" });
    res.json(food);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: "Food item already exists" });
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

// DELETE /api/foods/:id  (soft delete)
export async function deleteFood(req, res, next) {
  try {
    const food = await FoodItem.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!food) return res.status(404).json({ error: "Food item not found" });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
