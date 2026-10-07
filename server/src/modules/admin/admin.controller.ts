import { Prisma } from "@prisma/client";
import { Response } from "express";
import { AuthRequest } from "../../middlewares/auth";
import {
  createDepartmentSchema,
  registrationStatusSchema,
  updateDepartmentSchema,
  updateUserRoleSchema,
  upsertPolicyRuleSchema,
  userIdParamsSchema,
} from "./admin.schemas";
import * as adminService from "./admin.service";

const sendValidationError = (res: Response, error: { flatten: () => unknown }) => {
  res.status(400).json({
    message: "Invalid request payload.",
    errors: error.flatten(),
  });
};

const isPrismaErrorCode = (error: unknown, code: string): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;

export const getDepartments = async (
  _req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const departments = await adminService.getDepartments();
    res.status(200).json({ departments });
  } catch (error) {
    console.error("Get Departments Error:", error);
    res.status(500).json({ message: "Unable to fetch departments." });
  }
};

export const getPolicyRules = async (
  _req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const policyRules = await adminService.getPolicyRules();
    res.status(200).json({ policyRules });
  } catch (error) {
    console.error("Get Policy Rules Error:", error);
    res.status(500).json({ message: "Unable to fetch policy rules." });
  }
};

export const getAuditLogs = async (
  _req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const auditLogs = await adminService.getAuditLogs();
    res.status(200).json({ auditLogs });
  } catch (error) {
    console.error("Get Audit Logs Error:", error);
    res.status(500).json({ message: "Unable to fetch audit logs." });
  }
};

export const getPendingRegistrations = async (
  _req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const registrations = await adminService.getPendingRegistrations();
    res.status(200).json({ registrations });
  } catch (error) {
    console.error("Get Pending Registrations Error:", error);
    res.status(500).json({ message: "Unable to fetch pending registrations." });
  }
};

export const createDepartment = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const actorId = req.user?.id;
  if (!actorId) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }

  const input = createDepartmentSchema.safeParse(req.body);
  if (!input.success) {
    sendValidationError(res, input.error);
    return;
  }

  try {
    const department = await adminService.createDepartment(
      input.data,
      actorId,
      req.ip
    );
    res.status(201).json({ department });
  } catch (error) {
    if (isPrismaErrorCode(error, "P2002")) {
      res.status(409).json({ message: "A department with that code already exists." });
      return;
    }
    console.error("Create Department Error:", error);
    res.status(500).json({ message: "Unable to create department." });
  }
};

export const updateDepartment = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const actorId = req.user?.id;
  if (!actorId) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }

  const params = userIdParamsSchema.safeParse(req.params);
  if (!params.success) {
    sendValidationError(res, params.error);
    return;
  }
  const input = updateDepartmentSchema.safeParse(req.body);
  if (!input.success) {
    sendValidationError(res, input.error);
    return;
  }

  try {
    const department = await adminService.updateDepartment(
      params.data.id,
      input.data,
      actorId,
      req.ip
    );
    res.status(200).json({ department });
  } catch (error) {
    if (isPrismaErrorCode(error, "P2002")) {
      res.status(409).json({ message: "A department with that code already exists." });
      return;
    }
    if (isPrismaErrorCode(error, "P2025")) {
      res.status(404).json({ message: "Department not found." });
      return;
    }
    console.error("Update Department Error:", error);
    res.status(500).json({ message: "Unable to update department." });
  }
};

export const upsertPolicyRule = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const actorId = req.user?.id;
  if (!actorId) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }

  const input = upsertPolicyRuleSchema.safeParse(req.body);
  if (!input.success) {
    sendValidationError(res, input.error);
    return;
  }

  try {
    const policyRule = await adminService.upsertPolicyRule(
      input.data,
      actorId,
      req.ip
    );
    res.status(200).json({ policyRule });
  } catch (error) {
    console.error("Upsert Policy Rule Error:", error);
    res.status(500).json({ message: "Unable to save policy rule." });
  }
};

export const updateUserRole = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const actorId = req.user?.id;
  if (!actorId) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }

  const params = userIdParamsSchema.safeParse(req.params);
  if (!params.success) {
    sendValidationError(res, params.error);
    return;
  }

  const input = updateUserRoleSchema.safeParse(req.body);
  if (!input.success) {
    sendValidationError(res, input.error);
    return;
  }

  try {
    const user = await adminService.updateUserRole(
      params.data.id,
      input.data,
      actorId,
      req.ip
    );
    res.status(200).json({ user });
  } catch (error) {
    if (isPrismaErrorCode(error, "P2025")) {
      res.status(404).json({ message: "User not found." });
      return;
    }
    console.error("Update User Role Error:", error);
    res.status(500).json({ message: "Unable to update user role." });
  }
};

export const updateRegistrationStatus = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const actorId = req.user?.id;
  if (!actorId) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }
  const params = userIdParamsSchema.safeParse(req.params);
  if (!params.success) {
    sendValidationError(res, params.error);
    return;
  }
  const input = registrationStatusSchema.safeParse(req.body);
  if (!input.success) {
    sendValidationError(res, input.error);
    return;
  }

  try {
    const user = await adminService.updateRegistrationStatus(
      params.data.id,
      input.data,
      actorId,
      req.ip
    );
    res.status(200).json({ user });
  } catch (error) {
    if (error instanceof adminService.RegistrationStatusError) {
      res.status(error.userExists ? 409 : 404).json({ message: error.message });
      return;
    }
    console.error("Update Registration Status Error:", error);
    res.status(500).json({ message: "Unable to update registration status." });
  }
};
