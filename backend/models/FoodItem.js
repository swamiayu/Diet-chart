import mongoose from "mongoose";

const foodItemSchema = new mongoose.Schema(
  {
    // Canonical English name — the only language stored as the source of truth.
    name: {
      type: String,
      required: true,
      trim: true,
      // Uniqueness enforced by the case-insensitive collation index below.
    },
    // Reference to the Category document (category names + their translations
    // live in the Category collection, not duplicated here).
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    // Cached translations of the food NAME, keyed by language code (mr/hi/gu).
    // Category translations live on the Category doc.
    translations: { type: Map, of: String, default: {} },
    notes: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Case-insensitive uniqueness on name.
foodItemSchema.index({ name: 1 }, { unique: true, collation: { locale: "en", strength: 2 } });

export const FoodItem = mongoose.model("FoodItem", foodItemSchema);
