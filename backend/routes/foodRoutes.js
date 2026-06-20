import { Router } from "express";
import {
  listFoods,
  createFood,
  bulkCreateFoods,
  updateFood,
  deleteFood,
} from "../controllers/foodController.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

// Reads are open (shared master list); mutations require a signed-in doctor.
router.get("/", listFoods);
router.post("/", requireAuth, createFood);
router.post("/bulk", requireAuth, bulkCreateFoods);
router.put("/:id", requireAuth, updateFood);
router.delete("/:id", requireAuth, deleteFood);

export default router;
