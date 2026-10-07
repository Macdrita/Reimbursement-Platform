import { Router } from "express";
import { Role } from "@prisma/client";
import { authenticate } from "../../middlewares/auth";
import { requireRole } from "../../middlewares/role";
import {
  createDepartment,
  updateUserRole,
  upsertPolicyRule,
} from "./admin.controller";

const router = Router();

router.use(authenticate, requireRole(Role.SUPERADMIN));
router.post("/departments", createDepartment);
router.post("/policies", upsertPolicyRule);
router.patch("/users/:id/role", updateUserRole);

export default router;
