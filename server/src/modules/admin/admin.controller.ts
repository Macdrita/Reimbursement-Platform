import { Prisma } from "@prisma/client";
import { Response } from "express";
import { AuthRequest } from "../../middlewares/auth";
import {
  createDepartmentSchema,
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
