import { Router } from "express";
import { getLanguages, translate, suggestTranslations } from "../controllers/translationController.js";

const router = Router();

router.get("/languages", getLanguages);
router.get("/translate/suggest", suggestTranslations);
router.post("/translate", translate);

export default router;
