import { Router } from "express";
import { Role } from "@prisma/client";
import { authenticate } from "../../middlewares/auth";
import { requireRole } from "../../middlewares/role";
import {
  createDepartment,
  getAuditLogs,
  getDepartments,
  getPolicyRules,
  updateUserRole,
  upsertPolicyRule,
} from "./admin.controller";

const router = Router();

router.use(authenticate, requireRole(Role.SUPERADMIN));
router.get("/departments", getDepartments);
router.post("/departments", createDepartment);
router.get("/policies", getPolicyRules);
router.post("/policies", upsertPolicyRule);
router.get("/audit-logs", getAuditLogs);
router.patch("/users/:id/role", updateUserRole);

export default router;
