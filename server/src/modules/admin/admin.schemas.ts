import { z } from "zod";

export const createDepartmentSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    code: z
      .string()
      .trim()
      .min(1)
      .max(20)
      .transform((code) => code.toUpperCase()),
    budget: z.number().finite().nonnegative(),
  })
  .strict();

export const upsertPolicyRuleSchema = z
  .object({
    category: z.string().trim().min(1).max(100),
    maxLimit: z.number().finite().nonnegative(),
    requireReceipt: z.boolean().optional(),
    requireGstin: z.boolean().optional(),
  })
  .strict();

export const updateUserRoleSchema = z
  .object({
    role: z.enum([
      "EMPLOYEE",
      "MANAGER",
      "HOD",
      "FINANCE_ADMIN",
      "SUPERADMIN",
    ]),
  })
  .strict();

export const userIdParamsSchema = z
  .object({
    id: z.string().uuid(),
  })
  .strict();

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type UpsertPolicyRuleInput = z.infer<typeof upsertPolicyRuleSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
