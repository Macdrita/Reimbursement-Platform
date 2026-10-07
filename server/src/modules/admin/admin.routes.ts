import { Router } from "express";
import { Role } from "@prisma/client";
import { authenticate } from "../../middlewares/auth";
import { requireRole } from "../../middlewares/role";
import {
  createDepartment,
  getAuditLogs,
  getDepartments,
  getPendingRegistrations,
  getPolicyRules,
  updateDepartment,
  updateRegistrationStatus,
  updateUserRole,
  upsertPolicyRule,
} from "./admin.controller";

const router = Router();

router.use(authenticate, requireRole(Role.SUPERADMIN));
router.get("/departments", getDepartments);
router.post("/departments", createDepartment);
router.patch("/departments/:id", updateDepartment);
router.get("/policies", getPolicyRules);
router.post("/policies", upsertPolicyRule);
router.get("/audit-logs", getAuditLogs);
router.get("/registrations/pending", getPendingRegistrations);
router.patch("/registrations/:id/status", updateRegistrationStatus);
router.patch("/users/:id/role", updateUserRole);

export default router;
