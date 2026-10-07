import * as auditService from "../../services/audit.service";
import * as adminRepository from "./admin.repository";
import {
  CreateDepartmentInput,
  UpdateUserRoleInput,
  UpsertPolicyRuleInput,
} from "./admin.schemas";

export const createDepartment = async (
  data: CreateDepartmentInput,
  actorId: string,
  ipAddress?: string
) => {
  const department = await adminRepository.createDepartment(data);
  auditService.logAction(
    actorId,
    "DEPARTMENT_CREATED",
    {
      departmentId: department.id,
      name: department.name,
      code: department.code,
      budget: department.budget,
    },
    ipAddress
  );
  return department;
};

export const upsertPolicyRule = async (
  data: UpsertPolicyRuleInput,
  actorId: string,
  ipAddress?: string
) => {
  const policyRule = await adminRepository.upsertPolicyRule(data);
  auditService.logAction(
    actorId,
    "POLICY_RULE_UPSERTED",
    {
      policyRuleId: policyRule.id,
      category: policyRule.category,
      maxLimit: policyRule.maxLimit,
      requireReceipt: policyRule.requireReceipt,
      requireGstin: policyRule.requireGstin,
    },
    ipAddress
  );
  return policyRule;
};

export const updateUserRole = async (
  userId: string,
  data: UpdateUserRoleInput,
  actorId: string,
  ipAddress?: string
) => {
  const user = await adminRepository.updateUserRole(userId, data);
  auditService.logAction(
    actorId,
    "USER_ROLE_UPDATED",
    { targetUserId: user.id, role: user.role },
    ipAddress
  );
  return user;
};
