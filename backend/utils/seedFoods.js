import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { FoodItem } from "../models/FoodItem.js";
import { Category } from "../models/Category.js";
import { FOOD_GLOSSARY, CATEGORY_GLOSSARY } from "../data/foodGlossary.js";

// Glossary is used here at SEED time only, to pre-fill verified translations into
// the DB. After this, the DB is the source of truth (editable in production via
// the Translate+override UI) — nothing reads the glossary at request time.
const foodTr = (name) => FOOD_GLOSSARY[name.toLowerCase()] || {};
const catTr = (name) => CATEGORY_GLOSSARY[name.toLowerCase()] || {};

// English names here intentionally match keys in data/foodGlossary.js so their
// Marathi/Hindi/Gujarati translations come from the verified glossary (no API).
const SEED = [
  // Dairy
  ["Milk", "Dairy"], ["Curd", "Dairy"], ["Buttermilk", "Dairy"], ["Ghee", "Dairy"],
  ["Butter", "Dairy"], ["Paneer", "Dairy"], ["Cream", "Dairy"], ["Cheese", "Dairy"],
  // Grains
  ["Rice", "Grains"], ["Wheat", "Grains"], ["Barley", "Grains"], ["Jowar", "Grains"],
  ["Bajra", "Grains"], ["Ragi", "Grains"], ["Oats", "Grains"], ["Semolina", "Grains"],
  ["Flattened rice", "Grains"], ["Corn", "Grains"],
  // Pulses
  ["Moong", "Pulses"], ["Chickpea", "Pulses"], ["Toor", "Pulses"], ["Urad", "Pulses"],
  ["Masoor", "Pulses"], ["Kidney beans", "Pulses"], ["Lentils", "Pulses"],
  // Vegetables
  ["Potato", "Vegetables"], ["Tomato", "Vegetables"], ["Onion", "Vegetables"],
  ["Garlic", "Vegetables"], ["Ginger", "Vegetables"], ["Spinach", "Vegetables"],
  ["Brinjal", "Vegetables"], ["Okra", "Vegetables"], ["Cauliflower", "Vegetables"],
  ["Cabbage", "Vegetables"], ["Carrot", "Vegetables"], ["Peas", "Vegetables"],
  ["Bottle gourd", "Vegetables"], ["Bitter gourd", "Vegetables"], ["Cucumber", "Vegetables"],
  ["Pumpkin", "Vegetables"], ["Radish", "Vegetables"], ["Coriander leaves", "Vegetables"],
  ["Green chilli", "Vegetables"], ["Drumstick", "Vegetables"], ["Fenugreek leaves", "Vegetables"],
  // Fruits
  ["Banana", "Fruits"], ["Mango", "Fruits"], ["Apple", "Fruits"], ["Grapes", "Fruits"],
  ["Pomegranate", "Fruits"], ["Orange", "Fruits"], ["Guava", "Fruits"], ["Papaya", "Fruits"],
  ["Watermelon", "Fruits"], ["Lemon", "Fruits"], ["Coconut", "Fruits"], ["Dates", "Fruits"],
  ["Fig", "Fruits"], ["Sugarcane", "Fruits"],
  // Nuts / Dry Fruits
  ["Almond", "Nuts"], ["Cashew", "Nuts"], ["Walnut", "Nuts"], ["Raisins", "Nuts"],
  ["Groundnut", "Nuts"], ["Pistachio", "Nuts"],
  // Spices / Sweeteners
  ["Salt", "Spices"], ["Sugar", "Sweeteners"], ["Jaggery", "Sweeteners"], ["Honey", "Sweeteners"],
  ["Turmeric", "Spices"], ["Cumin", "Spices"], ["Mustard", "Spices"], ["Black pepper", "Spices"],
  ["Asafoetida", "Spices"], ["Coriander seeds", "Spices"], ["Red chilli", "Spices"],
  ["Cardamom", "Spices"], ["Cloves", "Spices"], ["Cinnamon", "Spices"], ["Tamarind", "Spices"],
  ["Oil", "Oils"],
  // Non-Vegetarian
  ["Egg", "Non-Vegetarian"], ["Fish", "Non-Vegetarian"], ["Chicken", "Non-Vegetarian"],
  ["Mutton", "Non-Vegetarian"],
  // Beverages
  ["Water", "Beverages"], ["Tea", "Beverages"], ["Coffee", "Beverages"],
];

async function run() {
  await connectDB();

  // 1) Upsert categories first, then map name -> _id.
  const catNames = [...new Set(SEED.map(([, c]) => c))];
  await Category.bulkWrite(
    catNames.map((name) => ({
      updateOne: {
        filter: { name },
        update: { $set: { translations: catTr(name) }, $setOnInsert: { name } },
        upsert: true,
      },
    })),
    { ordered: false }
  );
  const cats = await Category.find({ name: { $in: catNames } });
  const catId = new Map(cats.map((c) => [c.name, c._id]));
  console.log(`Categories ready: ${cats.length}`);

  // 2) Upsert foods referencing their category _id. `$set` (not `$setOnInsert`)
  // on category also MIGRATES any older rows that stored category as a string,
  // and clears stale name-translation caches so they repopulate cleanly.
  const ops = SEED.map(([name, category]) => ({
    updateOne: {
      filter: { name },
      update: {
        $set: { category: catId.get(category), translations: foodTr(name) },
        $setOnInsert: { name },
      },
      upsert: true,
    },
  }));

  const result = await FoodItem.bulkWrite(ops, { ordered: false });
  const total = await FoodItem.countDocuments();
  console.log(`Seed complete. Inserted ${result.upsertedCount} new food item(s). Total foods: ${total}.`);

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
