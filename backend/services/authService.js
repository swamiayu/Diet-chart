import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const JWT_SECRET = process.env.JWT_SECRET || "";
const JWT_EXPIRES_IN = "30d";

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

export function isAuthConfigured() {
  return Boolean(GOOGLE_CLIENT_ID && JWT_SECRET);
}

export function getGoogleClientId() {
  return GOOGLE_CLIENT_ID;
}

/**
 * Verify a Google ID token (the `credential` from Google Identity Services).
 * Returns the trusted profile, or throws if invalid / audience mismatch.
 */
export async function verifyGoogleIdToken(idToken) {
  if (!GOOGLE_CLIENT_ID) throw new Error("GOOGLE_CLIENT_ID is not configured on the server");
  const ticket = await googleClient.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID });
  const p = ticket.getPayload();
  if (!p?.sub) throw new Error("Invalid Google token");
  return {
    googleId: p.sub,
    email: p.email || "",
    name: p.name || "",
    picture: p.picture || "",
    emailVerified: p.email_verified === true,
  };
}

/** Issue our own session JWT for a Doctor document. */
export function issueSessionToken(doctor) {
  if (!JWT_SECRET) throw new Error("JWT_SECRET is not configured on the server");
  return jwt.sign(
    { sub: String(doctor._id), email: doctor.email, name: doctor.name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/** Verify our session JWT; returns the decoded payload or throws. */
export function verifySessionToken(token) {
  if (!JWT_SECRET) throw new Error("JWT_SECRET is not configured on the server");
  return jwt.verify(token, JWT_SECRET);
}
