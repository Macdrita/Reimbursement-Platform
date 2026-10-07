import axios from "axios";
import type { AuditLog, Claim, Department, PolicyRule, PayoutBatch, RegistrationRequest, RegistrationStatus, Role } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data: {
    name: string;
    email: string;
    password: string;
  }) => api.post("/auth/register", data),

  login: (data: { email: string; password: string }) =>
    api.post("/auth/login", data),

  getMe: () => api.get("/auth/me"),
};

// Claims API
export const claimsAPI = {
  create: (formData: FormData) =>
    api.post("/claims", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  getMyClaims: () => api.get("/claims/my-claims"),

  getSubordinateClaims: () => api.get("/claims/subordinates"),

  reviewClaim: (
    id: string,
    data: { status: string; reviewComment?: string }
  ) => api.patch(`/claims/${id}/review`, data),

  redirectClaim: (
    id: string,
    data: { redirectedToId?: string; reason?: string }
  ) => api.patch(`/claims/${id}/redirect`, data),
};

// Users API
export const usersAPI = {
  getManagers: () => api.get("/users/managers"),
  getHODs: () => api.get("/users/hods"),
};

export const financeAPI = {
  getApprovedClaims: () => api.get<{ claims: Claim[] }>("/finance/approved-claims"),
  executeBatch: (claimIds: string[]) =>
    api.post<{ payoutBatch: PayoutBatch }>("/finance/batches/execute", { claimIds }),
};

export const adminAPI = {
  getDepartments: () => api.get<{ departments: Department[] }>("/admin/departments"),
  createDepartment: (data: { name: string; code: string; budget: number; hodId?: string | null }) =>
    api.post<{ department: Department }>("/admin/departments", data),
  updateDepartment: (id: string, data: { name: string; code: string; budget: number; hodId?: string | null }) =>
    api.patch<{ department: Department }>(`/admin/departments/${id}`, data),
  getPolicyRules: () => api.get<{ policyRules: PolicyRule[] }>("/admin/policies"),
  upsertPolicyRule: (data: {
    category: string;
    maxLimit: number;
    requireReceipt?: boolean;
    requireGstin?: boolean;
  }) => api.post<{ policyRule: PolicyRule }>("/admin/policies", data),
  getAuditLogs: () => api.get<{ auditLogs: AuditLog[] }>("/admin/audit-logs"),
  getRegistrations: () =>
    api.get<{ registrations: RegistrationRequest[] }>("/admin/registrations"),
  updateRegistrationStatus: (
    id: string,
    status: Exclude<RegistrationStatus, "PENDING">
  ) => api.patch<{ user: { id: string; role: Role; registrationStatus: RegistrationStatus } }>(`/admin/registrations/${id}/status`, { status }),
};

export default api;
