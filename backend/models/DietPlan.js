import mongoose from "mongoose";

// The three Ayurvedic buckets:
//   pathya    = wholesome / recommended      (the "remaining" items)
//   apathya   = unwholesome / to avoid       (doctor CROSSES these out)
//   alpamatra = allowed in small quantity    (doctor DOTS these)
export const CLASSIFICATIONS = ["pathya", "apathya", "alpamatra"];

const planItemSchema = new mongoose.Schema(
  {
    foodItem: { type: mongoose.Schema.Types.ObjectId, ref: "FoodItem" },
    // Denormalised English name/category so a plan stays readable even if the
    // master food item is later renamed or removed.
    name: { type: String, required: true },
    category: { type: String, required: true },
    classification: {
      type: String,
      enum: CLASSIFICATIONS,
      required: true,
    },
    note: { type: String, default: "" }, // e.g. "only at lunch", "twice a week"
  },
  { _id: false }
);

const dietPlanSchema = new mongoose.Schema(
  {
    // Owner — plans are private to the doctor who created them.
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
      index: true,
    },
    patient: {
      name: { type: String, required: true, trim: true },
      age: { type: Number },
      gender: { type: String, enum: ["male", "female", "other", ""], default: "" },
      prakriti: { type: String, default: "" }, // vata / pitta / kapha constitution
    },
    doctorName: { type: String, default: "" },
    clinicName: { type: String, default: "" },
    diagnosis: { type: String, default: "" },
    // Language the doctor selected for this plan's printout.
    language: { type: String, default: "mr" },
    items: { type: [planItemSchema], default: [] },
    // Snapshot of the doctor's standard advice at save time (always printed).
    defaultAdvice: { type: String, default: "" },
    // Per-plan extra advice typed on the planner (printed in addition).
    generalAdvice: { type: String, default: "" },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const DietPlan = mongoose.model("DietPlan", dietPlanSchema);
