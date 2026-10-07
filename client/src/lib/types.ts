export type Role =
  | "EMPLOYEE"
  | "MANAGER"
  | "HOD"
  | "FINANCE"
  | "FINANCE_ADMIN"
  | "SUPERADMIN";

export type ClaimStatus = "PENDING" | "APPROVED" | "REJECTED";
export type RegistrationStatus = "PENDING" | "APPROVED" | "REJECTED" | "BLACKLISTED";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  registrationStatus: RegistrationStatus;
  managerId: string | null;
  manager?: {
    id: string;
    name: string;
    email: string;
  } | null;
  createdAt: string;
}

export interface Claim {
  id: string;
  title: string;
  description: string | null;
  amount: number;
  receiptUrl: string;
  status: ClaimStatus;
  employeeId: string;
  employee?: {
    id: string;
    name: string;
    email: string;
    role?: Role;
    managerId?: string | null;
  };
  reviewerId: string | null;
  reviewer?: {
    id: string;
    name: string;
    email: string;
  } | null;
  isRedirected?: boolean;
  redirectedToId?: string | null;
  redirectedTo?: {
    id: string;
    name: string;
    email: string;
  } | null;
  redirectReason?: string | null;
  reviewComment: string | null;
  createdAt: string;
  updatedAt: string;
  payoutBatchId?: string | null;
  isFlagged?: boolean;
}

export interface Manager {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  budget: number;
  hodId: string | null;
  hod?: { id: string; name: string } | null;
  createdAt: string;
}

export interface RegistrationRequest {
  id: string;
  email: string;
  name: string;
  role: Role;
  managerId: string | null;
  manager?: { id: string; name: string } | null;
  createdAt: string;
}

export interface PolicyRule {
  id: string;
  category: string;
  maxLimit: number;
  requireReceipt: boolean;
  requireGstin: boolean;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string };
}

export interface PayoutBatch {
  id: string;
  status: "DRAFT" | "PROCESSING" | "COMPLETED" | "FAILED";
  totalAmount: number;
  executedById: string;
  createdAt: string;
  claimIds: string[];
}
