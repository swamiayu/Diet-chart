import { Router } from "express";
import {
  createPlan,
  listPlans,
  getPlan,
  downloadPlanPdf,
  previewPdf,
} from "../controllers/dietPlanController.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

// All diet-plan routes require a signed-in doctor; data is scoped per doctor.
router.use(requireAuth);

router.post("/", createPlan);
router.get("/", listPlans);
router.post("/preview-pdf", previewPdf); // generate PDF without saving
router.get("/:id", getPlan);
router.get("/:id/pdf", downloadPlanPdf);

export default router;
