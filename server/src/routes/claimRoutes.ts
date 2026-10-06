import { Router } from "express";
import {
  createClaim,
  getMyClaims,
  getSubordinateClaims,
  reviewClaim,
  redirectClaim,
} from "../controllers/claimController";
import { authenticate } from "../middlewares/auth";
import { requireRole } from "../middlewares/role";
import { upload } from "../middlewares/upload";

const router = Router();

// Employee routes
router.post("/", authenticate, upload.single("receipt"), createClaim);
router.get("/my-claims", authenticate, getMyClaims);

// Manager / HOD review routes
router.get(
  "/subordinates",
  authenticate,
  requireRole("MANAGER", "HOD", "FINANCE", "SUPERADMIN"),
  getSubordinateClaims
);
router.patch(
  "/:id/review",
  authenticate,
  requireRole("MANAGER", "HOD", "FINANCE", "SUPERADMIN"),
  reviewClaim
);
router.patch(
  "/:id/redirect",
  authenticate,
  requireRole("MANAGER", "SUPERADMIN"),
  redirectClaim
);

export default router;
