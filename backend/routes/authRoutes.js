import { Router } from "express";
import { authConfig, googleLogin, me, updateProfile } from "../controllers/authController.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

router.get("/config", authConfig);
router.post("/google", googleLogin);
router.get("/me", requireAuth, me);
router.put("/me", requireAuth, updateProfile);

export default router;
