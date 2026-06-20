import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    // Canonical English name — the source of truth (e.g. "Dairy").
    name: { type: String, required: true, trim: true },
    // Cached translations keyed by language code: { mr: "दुग्धजन्य पदार्थ", ... }
    translations: { type: Map, of: String, default: {} },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Case-insensitive uniqueness on name.
categorySchema.index({ name: 1 }, { unique: true, collation: { locale: "en", strength: 2 } });

export const Category = mongoose.model("Category", categorySchema);
