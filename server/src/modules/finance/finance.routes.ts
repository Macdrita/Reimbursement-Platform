import { Router } from "express";
import { Role } from "@prisma/client";
import { authenticate } from "../../middlewares/auth";
import { requireRole } from "../../middlewares/role";
import {
  executePayoutBatch,
  getApprovedClaims,
  getPayoutBatches,
} from "./finance.controller";

const router = Router();

router.use(authenticate, requireRole(Role.FINANCE_ADMIN, Role.SUPERADMIN));
router.get("/approved-claims", getApprovedClaims);
router.get("/batches", getPayoutBatches);
router.post("/batches/execute", executePayoutBatch);

export default router;
