import { DietPlan, CLASSIFICATIONS } from "../models/DietPlan.js";
import { FoodItem } from "../models/FoodItem.js";
import { translateFoodItem, translateText } from "../services/translationService.js";
import { buildDietPlanHtml, generatePdfBuffer } from "../services/pdfService.js";
import { SOURCE_LANG } from "../data/languages.js";

// Accepts either:
//   items:      [{ foodItemId|name, category?, classification, note? }]
//   OR selections: { pathya:[ids], apathya:[ids], alpamatra:[ids] }
// and returns a normalised items array with denormalised name/category.
async function buildItems(body) {
  if (Array.isArray(body.items) && body.items.length) {
    const ids = body.items.map((i) => i.foodItemId).filter(Boolean);
    const foods = ids.length ? await FoodItem.find({ _id: { $in: ids } }).populate("category") : [];
    const byId = new Map(foods.map((f) => [String(f._id), f]));

    return body.items.map((i) => {
      const f = i.foodItemId ? byId.get(String(i.foodItemId)) : null;
      return {
        foodItem: f?._id,
        name: f?.name || i.name,
        // Snapshot the English category NAME so the plan stays readable forever.
        category: f?.category?.name || i.category || "—",
        classification: i.classification,
        note: i.note || "",
      };
    });
  }

  // selections form
  const sel = body.selections || {};
  const allIds = CLASSIFICATIONS.flatMap((c) => (sel[c] || []).map((id) => ({ id, c })));
  const foods = await FoodItem.find({ _id: { $in: allIds.map((x) => x.id) } }).populate("category");
  const byId = new Map(foods.map((f) => [String(f._id), f]));

  return allIds
    .map(({ id, c }) => {
      const f = byId.get(String(id));
      if (!f) return null;
      return { foodItem: f._id, name: f.name, category: f.category?.name || "—", classification: c, note: "" };
    })
    .filter(Boolean);
}

function validateItems(items) {
  for (const it of items) {
    if (!it.name) return "Each item needs a name";
    if (!CLASSIFICATIONS.includes(it.classification)) {
      return `Invalid classification "${it.classification}". Use: ${CLASSIFICATIONS.join(", ")}`;
    }
  }
  return null;
}

// POST /api/diet-plans  (protected — owned by req.doctor)
export async function createPlan(req, res, next) {
  try {
    const { patient, doctorName, clinicName, diagnosis, language, generalAdvice, date } = req.body;
    if (!patient?.name) return res.status(400).json({ error: "patient.name is required" });

    const items = await buildItems(req.body);
    const invalid = validateItems(items);
    if (invalid) return res.status(400).json({ error: invalid });

    const plan = await DietPlan.create({
      doctor: req.doctor._id,
      patient,
      // Default the printed doctor/clinic name from the signed-in account.
      doctorName: doctorName || req.doctor.name,
      clinicName: clinicName || req.doctor.clinicName,
      diagnosis,
      language: language || "mr",
      // Snapshot the doctor's standard advice; per-plan extra advice on top.
      defaultAdvice: req.doctor.defaultAdvice || "",
      generalAdvice,
      items,
      date: date || Date.now(),
    });
    res.status(201).json(plan);
  } catch (err) {
    next(err);
  }
}

// GET /api/diet-plans  (protected — only this doctor's plans)
export async function listPlans(req, res, next) {
  try {
    const plans = await DietPlan.find({ doctor: req.doctor._id })
      .sort({ createdAt: -1 })
      .select("patient doctorName diagnosis language date createdAt items")
      .lean();
    res.json({
      count: plans.length,
      plans: plans.map((p) => ({ ...p, itemCount: p.items?.length || 0, items: undefined })),
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/diet-plans/:id?lang=mr  -> plan with items translated for display
export async function getPlan(req, res, next) {
  try {
    const plan = await DietPlan.findOne({ _id: req.params.id, doctor: req.doctor._id }).lean();
    if (!plan) return res.status(404).json({ error: "Diet plan not found" });

    const lang = req.query.lang || plan.language || SOURCE_LANG;
    const items = await translateItemsForDisplay(plan.items, lang);
    res.json({ ...plan, displayLang: lang, items });
  } catch (err) {
    next(err);
  }
}

// Translate plan items (name + category) into `lang` for display/PDF.
async function translateItemsForDisplay(items, lang) {
  return Promise.all(
    (items || []).map(async (it) => {
      if (lang === SOURCE_LANG) {
        return { ...it, name_en: it.name, category_en: it.category };
      }
      const [name, category] = await Promise.all([
        translateText(it.name, lang),
        translateText(it.category, lang),
      ]);
      return { ...it, name_en: it.name, category_en: it.category, name, category };
    })
  );
}

// GET /api/diet-plans/:id/pdf?lang=mr   -> downloads the formatted PDF
export async function downloadPlanPdf(req, res, next) {
  try {
    const plan = await DietPlan.findOne({ _id: req.params.id, doctor: req.doctor._id }).lean();
    if (!plan) return res.status(404).json({ error: "Diet plan not found" });

    const lang = req.query.lang || plan.language || "mr";
    const rows = await translateItemsForDisplay(plan.items, lang);

    const html = buildDietPlanHtml(plan, rows, lang);
    const pdf = await generatePdfBuffer(html);

    const safeName = (plan.patient?.name || "patient").replace(/[^a-z0-9]+/gi, "_");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="diet-plan-${safeName}-${lang}.pdf"`
    );
    res.send(pdf);
  } catch (err) {
    next(err);
  }
}

// POST /api/diet-plans/preview-pdf  -> generate a PDF WITHOUT saving the plan.
// Body is the same shape as createPlan (+ optional lang). Handy for "Download" before save.
export async function previewPdf(req, res, next) {
  try {
    const { patient } = req.body;
    if (!patient?.name) return res.status(400).json({ error: "patient.name is required" });

    const items = await buildItems(req.body);
    const invalid = validateItems(items);
    if (invalid) return res.status(400).json({ error: invalid });

    const lang = req.body.language || req.query.lang || "mr";
    const plan = {
      patient,
      doctorName: req.body.doctorName || req.doctor.name,
      clinicName: req.body.clinicName || req.doctor.clinicName,
      diagnosis: req.body.diagnosis,
      // Standard advice (always) + per-plan extra advice, just like a saved plan.
      defaultAdvice: req.doctor.defaultAdvice || "",
      generalAdvice: req.body.generalAdvice,
      date: req.body.date || Date.now(),
      items,
    };
    const rows = await translateItemsForDisplay(items, lang);
    const html = buildDietPlanHtml(plan, rows, lang);
    const pdf = await generatePdfBuffer(html);

    const safeName = (patient.name || "patient").replace(/[^a-z0-9]+/gi, "_");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="diet-plan-${safeName}-${lang}.pdf"`);
    res.send(pdf);
  } catch (err) {
    next(err);
  }
}
