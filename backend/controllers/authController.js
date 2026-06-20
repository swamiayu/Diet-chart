import { Doctor } from "../models/Doctor.js";
import { sanitizeTranslations } from "../data/languages.js";
import {
  verifyGoogleIdToken,
  issueSessionToken,
  isAuthConfigured,
  getGoogleClientId,
} from "../services/authService.js";

// GET /api/auth/config  -> tells the frontend the Google Client ID to render the button.
export function authConfig(req, res) {
  res.json({ configured: isAuthConfigured(), googleClientId: getGoogleClientId() });
}

// POST /api/auth/google   { credential }  (the Google ID token from GIS)
// Verifies with Google, upserts the Doctor, returns our session token + profile.
export async function googleLogin(req, res, next) {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: "Missing Google credential" });

    let profile;
    try {
      profile = await verifyGoogleIdToken(credential);
    } catch (e) {
      return res.status(401).json({ error: "Google sign-in failed: " + e.message });
    }
    if (!profile.emailVerified) {
      return res.status(401).json({ error: "Your Google email is not verified" });
    }

    const doctor = await Doctor.findOneAndUpdate(
      { googleId: profile.googleId },
      {
        $set: {
          email: profile.email,
          name: profile.name,
          picture: profile.picture,
          lastLoginAt: new Date(),
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const token = issueSessionToken(doctor);
    res.json({ token, doctor: publicDoctor(doctor) });
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/me  (protected) -> current doctor's profile
export function me(req, res) {
  res.json({ doctor: publicDoctor(req.doctor) });
}

// PUT /api/auth/me  (protected) -> update editable profile fields.
// `name`/`email`/`picture` come from Google and stay read-only; the doctor can
// set their clinic name (used as the printed PDF header / default on new plans).
export async function updateProfile(req, res, next) {
  try {
    if (req.body.clinicName !== undefined) {
      req.doctor.clinicName = String(req.body.clinicName).trim();
    }
    if (req.body.defaultAdvice !== undefined) {
      req.doctor.defaultAdvice = String(req.body.defaultAdvice).trim();
    }
    if (req.body.defaultAdviceTr !== undefined) {
      req.doctor.defaultAdviceTr = sanitizeTranslations(req.body.defaultAdviceTr);
    }
    await req.doctor.save();
    res.json({ doctor: publicDoctor(req.doctor) });
  } catch (err) {
    next(err);
  }
}

function publicDoctor(d) {
  return {
    _id: d._id,
    name: d.name,
    email: d.email,
    picture: d.picture,
    clinicName: d.clinicName,
    defaultAdvice: d.defaultAdvice,
    // Map -> plain object so the frontend can read translations by lang.
    defaultAdviceTr: d.defaultAdviceTr ? Object.fromEntries(d.defaultAdviceTr) : {},
  };
}
