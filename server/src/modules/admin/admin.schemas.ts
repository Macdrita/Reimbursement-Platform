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
    hodId: z.string().uuid().nullable().optional(),
  })
  .strict();

export const updateDepartmentSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    code: z
      .string()
      .trim()
      .min(1)
      .max(20)
      .transform((code) => code.toUpperCase())
      .optional(),
    budget: z.number().finite().nonnegative().optional(),
    hodId: z.string().uuid().nullable().optional(),
  })
  .strict()
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "At least one department field must be provided.",
  });

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
      "FINANCE",
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

export const registrationStatusSchema = z
  .object({
    status: z.enum(["APPROVED", "REJECTED", "BLACKLISTED"]),
  })
  .strict();

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;
export type UpsertPolicyRuleInput = z.infer<typeof upsertPolicyRuleSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
export type RegistrationStatusInput = z.infer<typeof registrationStatusSchema>;
