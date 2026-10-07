import { prisma } from "../../prisma";
import {
  CreateDepartmentInput,
  UpdateUserRoleInput,
  UpsertPolicyRuleInput,
} from "./admin.schemas";

export const createDepartment = (data: CreateDepartmentInput) =>
  prisma.department.create({ data });

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
    take: 100,
    include: { user: { select: { id: true, name: true, email: true } } },
  });

export const upsertPolicyRule = (data: UpsertPolicyRuleInput) =>
  prisma.$transaction(async (transaction) => {
    const existing = await transaction.policyRule.findFirst({
      where: { category: data.category },
    });

    if (existing) {
      return transaction.policyRule.update({
        where: { id: existing.id },
        data: {
          maxLimit: data.maxLimit,
          ...(data.requireReceipt === undefined
            ? {}
            : { requireReceipt: data.requireReceipt }),
          ...(data.requireGstin === undefined
            ? {}
            : { requireGstin: data.requireGstin }),
        },
      });
    }

    return transaction.policyRule.create({ data });
  }, { maxWait: 10_000, timeout: 10_000 });

export const updateUserRole = (id: string, data: UpdateUserRoleInput) =>
  prisma.user.update({
    where: { id },
    data: { role: data.role },
    select: { id: true, email: true, name: true, role: true },
  });
