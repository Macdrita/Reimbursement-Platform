import { prisma } from "../../prisma";
import {
  CreateDepartmentInput,
  UpdateUserRoleInput,
  UpsertPolicyRuleInput,
} from "./admin.schemas";

export const createDepartment = (data: CreateDepartmentInput) =>
  prisma.department.create({ data });

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
