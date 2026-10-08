import { Role } from "@/lib/types";

export function getRoleHomePath(role: Role): string {
  if (role === "FINANCE_ADMIN") return "/dashboard/finance";
  if (role === "SUPERADMIN") return "/dashboard/admin/departments";
  return "/dashboard";
}
