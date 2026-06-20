import { verifySessionToken } from "../services/authService.js";
import { Doctor } from "../models/Doctor.js";

// Protects a route: requires a valid `Authorization: Bearer <jwt>` header and
// attaches the authenticated Doctor as req.doctor.
export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : null;
    if (!token) return res.status(401).json({ error: "Sign in required" });

    let payload;
    try {
      payload = verifySessionToken(token);
    } catch {
      return res.status(401).json({ error: "Session expired — please sign in again" });
    }

    const doctor = await Doctor.findById(payload.sub);
    if (!doctor) return res.status(401).json({ error: "Account not found" });

    req.doctor = doctor;
    next();
  } catch (err) {
    next(err);
  }
}
