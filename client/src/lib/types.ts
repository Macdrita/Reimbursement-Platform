export type Role = "EMPLOYEE" | "MANAGER" | "HOD" | "FINANCE" | "SUPERADMIN";

export type ClaimStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
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
}

export interface Manager {
  id: string;
  name: string;
  email: string;
  role: Role;
}
