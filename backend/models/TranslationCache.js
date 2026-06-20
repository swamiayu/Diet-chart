import mongoose from "mongoose";

// Generic cache for any English string -> target language, so we never call
// MyMemory twice for the same term (categories, ad-hoc labels, etc.).
const translationCacheSchema = new mongoose.Schema(
  {
    sourceText: { type: String, required: true },   // lowercase English key
    lang: { type: String, required: true },          // mr / hi / gu
    translatedText: { type: String, required: true },
    provider: {
      type: String,
      enum: ["glossary", "mymemory", "manual"],
      default: "mymemory",
    },
  },
  { timestamps: true }
);

translationCacheSchema.index({ sourceText: 1, lang: 1 }, { unique: true });

export const TranslationCache = mongoose.model("TranslationCache", translationCacheSchema);
