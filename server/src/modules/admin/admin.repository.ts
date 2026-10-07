import { prisma } from "../../prisma";
import {
  CreateDepartmentInput,
  RegistrationStatusInput,
  UpdateDepartmentInput,
  UpdateUserRoleInput,
  UpsertPolicyRuleInput,
} from "./admin.schemas";

export const createDepartment = (data: CreateDepartmentInput) =>
  prisma.department.create({ data });

export const updateDepartment = (id: string, data: UpdateDepartmentInput) =>
  prisma.department.update({
    where: { id },
    data,
    include: { hod: { select: { id: true, name: true } } },
  });

export const listDepartments = () =>
  prisma.department.findMany({
    orderBy: { name: "asc" },
    include: { hod: { select: { id: true, name: true } } },
  });

export const listPolicyRules = () =>
  prisma.policyRule.findMany({ orderBy: { category: "asc" } });

export const listAuditLogs = () =>
  prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

export const upsertPolicyRule = (data: UpsertPolicyRuleInput) =>
  prisma.policyRule.upsert({
    where: { category: data.category },
    create: data,
    update: {
      maxLimit: data.maxLimit,
      ...(data.requireReceipt === undefined
        ? {}
        : { requireReceipt: data.requireReceipt }),
      ...(data.requireGstin === undefined
        ? {}
        : { requireGstin: data.requireGstin }),
    },
  });

export const updateUserRole = (id: string, data: UpdateUserRoleInput) =>
  prisma.user.update({
    where: { id },
    data: { role: data.role },
    select: { id: true, email: true, name: true, role: true },
  });

export const listPendingRegistrations = () =>
  prisma.user.findMany({
    where: { registrationStatus: "PENDING" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      managerId: true,
      createdAt: true,
      manager: { select: { id: true, name: true } },
    },
  });

export const updateRegistrationStatus = async (
  id: string,
  data: RegistrationStatusInput
) => {
  const result = await prisma.user.updateMany({
    where: { id, registrationStatus: "PENDING" },
    data: { registrationStatus: data.status },
  });
  if (result.count === 0) {
    return { user: null, exists: Boolean(await prisma.user.findUnique({ where: { id }, select: { id: true } })) };
  }
  const user = await prisma.user.findUniqueOrThrow({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      registrationStatus: true,
    },
  });
  return { user, exists: true };
};
