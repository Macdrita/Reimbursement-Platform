import * as auditService from "../../services/audit.service";
import * as adminRepository from "./admin.repository";
import {
  CreateDepartmentInput,
  RegistrationStatusInput,
  UpdateDepartmentInput,
  UpdateUserRoleInput,
  UpsertPolicyRuleInput,
} from "./admin.schemas";

export const getDepartments = () => adminRepository.listDepartments();

export const getPolicyRules = () => adminRepository.listPolicyRules();

export const getAuditLogs = () => adminRepository.listAuditLogs();

export const getRegistrations = () => adminRepository.listRegistrations();

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

export const updateDepartment = async (
  departmentId: string,
  data: UpdateDepartmentInput,
  actorId: string,
  ipAddress?: string
) => {
  const department = await adminRepository.updateDepartment(departmentId, data);
  auditService.logAction(
    actorId,
    "DEPARTMENT_UPDATED",
    {
      departmentId: department.id,
      name: department.name,
      code: department.code,
      budget: department.budget,
      hodId: department.hodId,
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

export class RegistrationStatusError extends Error {
  constructor(public readonly userExists: boolean) {
    super(userExists
      ? "Registration has already been reviewed."
      : "Registration was not found.");
  }
}

export const updateRegistrationStatus = async (
  userId: string,
  data: RegistrationStatusInput,
  actorId: string,
  ipAddress?: string
) => {
  const result = await adminRepository.updateRegistrationStatus(userId, data);
  if (!result.user) {
    throw new RegistrationStatusError(result.exists);
  }

  auditService.logAction(
    actorId,
    `REGISTRATION_${data.status}`,
    { targetUserId: result.user.id, email: result.user.email },
    ipAddress
  );
  return result.user;
};
