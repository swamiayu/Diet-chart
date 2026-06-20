import mongoose from "mongoose";

// A doctor (user) authenticated via Google SSO. We never store a password —
// identity is proven by a verified Google ID token.
const doctorSchema = new mongoose.Schema(
  {
    googleId: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    name: { type: String, default: "" },
    picture: { type: String, default: "" },
    clinicName: { type: String, default: "" }, // optional default for new plans
    // Standard advice that prints on EVERY plan (e.g. "Drink warm water, avoid
    // curd at night"). Per-plan additional advice is appended on top of this.
    defaultAdvice: { type: String, default: "" }, // English source
    // Doctor-reviewed translations of defaultAdvice, keyed by lang (mr/hi/gu).
    defaultAdviceTr: { type: Map, of: String, default: {} },
    lastLoginAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const Doctor = mongoose.model("Doctor", doctorSchema);
