"use client";

import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { z } from "zod";
import {
  ClipboardList,
  LoaderCircle,
  Pencil,
  Plus,
  ShieldCheck,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
} from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { adminAPI, usersAPI } from "@/lib/api";
import { AuditLog, Department, PolicyRule, RegistrationRequest, RegistrationStatus } from "@/lib/types";
import { getRoleHomePath } from "@/lib/navigation";

export type AdminSection = "departments" | "policies" | "audit" | "registrations";

const departmentSchema = z.object({
  name: z.string().trim().min(1, "Department name is required.").max(100),
  code: z.string().trim().min(1, "Department code is required.").max(20),
  budget: z
    .string()
    .trim()
    .min(1, "Budget is required.")
    .transform(Number)
    .pipe(z.number().finite().nonnegative("Budget must be zero or greater.")),
  hodId: z.string().uuid().nullable(),
});
const policySchema = z.object({
  category: z.string().trim().min(1, "Category is required.").max(100),
  maxLimit: z
    .string()
    .trim()
    .min(1, "Spend limit is required.")
    .transform(Number)
    .pipe(z.number().finite().nonnegative("Limit must be zero or greater.")),
  requireReceipt: z.boolean(),
  requireGstin: z.boolean(),
});

function getErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = error.response;
    if (typeof response === "object" && response !== null && "data" in response) {
      const data = response.data;
      if (typeof data === "object" && data !== null && "message" in data && typeof data.message === "string") {
        return data.message;
      }
    }
  }
  return "Something went wrong. Please try again.";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function AdminPage({ section }: { section: AdminSection }) {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [departmentDialogOpen, setDepartmentDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [policyDialogOpen, setPolicyDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<PolicyRule | null>(null);
  const [departmentError, setDepartmentError] = useState("");
  const [policyError, setPolicyError] = useState("");
  const isSuperadmin = user?.role === "SUPERADMIN";

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
    } else if (user.role !== "SUPERADMIN") {
      router.replace(getRoleHomePath(user.role));
    }
  }, [authLoading, router, user]);

  const departmentsQuery = useQuery({
    queryKey: ["admin", "departments"],
    queryFn: async () => (await adminAPI.getDepartments()).data.departments,
    enabled: isSuperadmin && section === "departments",
  });
  const policiesQuery = useQuery({
    queryKey: ["admin", "policies"],
    queryFn: async () => (await adminAPI.getPolicyRules()).data.policyRules,
    enabled: isSuperadmin && section === "policies",
  });
  const auditQuery = useQuery({
    queryKey: ["admin", "audit-logs"],
    queryFn: async () => (await adminAPI.getAuditLogs()).data.auditLogs,
    enabled: isSuperadmin && section === "audit",
  });
  const registrationsQuery = useQuery({
    queryKey: ["admin", "registrations"],
    queryFn: async () => (await adminAPI.getRegistrations()).data.registrations,
    enabled: isSuperadmin && section === "registrations",
  });
  const hodsQuery = useQuery({
    queryKey: ["admin", "department-hods"],
    queryFn: async () => (await usersAPI.getHODs()).data.hods as { id: string; name: string }[],
    enabled: isSuperadmin && section === "departments" && departmentDialogOpen,
  });

  const createDepartment = useMutation({
    mutationFn: adminAPI.createDepartment,
    onSuccess: async () => {
      setDepartmentDialogOpen(false);
      setDepartmentError("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "departments"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "audit-logs"] }),
      ]);
    },
    onError: (error: unknown) => setDepartmentError(getErrorMessage(error)),
  });
  const editDepartment = useMutation({
    mutationFn: ({ id, data }: {
      id: string;
      data: { name: string; code: string; budget: number; hodId: string | null };
    }) => adminAPI.updateDepartment(id, data),
    onSuccess: async () => {
      setDepartmentDialogOpen(false);
      setEditingDepartment(null);
      setDepartmentError("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "departments"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "audit-logs"] }),
      ]);
    },
    onError: (error: unknown) => setDepartmentError(getErrorMessage(error)),
  });
  const savePolicy = useMutation({
    mutationFn: adminAPI.upsertPolicyRule,
    onMutate: (input) => {
      const previousPolicies = queryClient.getQueryData<PolicyRule[]>([
        "admin",
        "policies",
      ]);
      const previousEditingPolicy = editingPolicy;
      const existing = previousPolicies?.find(
        (policy) => policy.category === input.category
      );
      const optimisticPolicy: PolicyRule = {
        id: existing?.id ?? `optimistic-${input.category}`,
        category: input.category,
        maxLimit: input.maxLimit,
        requireReceipt: input.requireReceipt ?? existing?.requireReceipt ?? false,
        requireGstin: input.requireGstin ?? existing?.requireGstin ?? false,
      };
      queryClient.setQueryData<PolicyRule[]>(
        ["admin", "policies"],
        (current) =>
          (current ?? [])
            .filter((policy) => policy.category !== input.category)
            .concat(optimisticPolicy)
            .sort((a, b) => a.category.localeCompare(b.category))
      );
      setPolicyDialogOpen(false);
      setEditingPolicy(null);
      return { previousPolicies, previousEditingPolicy };
    },
    onSuccess: ({ data }) => {
      setPolicyDialogOpen(false);
      setEditingPolicy(null);
      setPolicyError("");
      queryClient.setQueryData<PolicyRule[]>(["admin", "policies"], (current) =>
        current
          ? current.some((policy) => policy.id === data.policyRule.id || policy.category === data.policyRule.category)
            ? current.map((policy) => policy.id === data.policyRule.id || policy.category === data.policyRule.category ? data.policyRule : policy)
            : [...current, data.policyRule].sort((a, b) => a.category.localeCompare(b.category))
          : [data.policyRule]
      );
      void queryClient.invalidateQueries({ queryKey: ["admin", "policies"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "audit-logs"] });
    },
    onError: (error, _input, context) => {
      if (context?.previousPolicies !== undefined) {
        queryClient.setQueryData(["admin", "policies"], context.previousPolicies);
      } else {
        queryClient.removeQueries({
          queryKey: ["admin", "policies"],
          exact: true,
        });
      }
      setEditingPolicy(context?.previousEditingPolicy ?? null);
      setPolicyDialogOpen(true);
      setPolicyError(getErrorMessage(error));
    },
  });
  const reviewRegistration = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Exclude<RegistrationStatus, "PENDING"> }) =>
      adminAPI.updateRegistrationStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "registrations"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "audit-logs"] });
    },
  });

  const handleDepartmentSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDepartmentError("");
    const formData = new FormData(event.currentTarget);
    const parsed = departmentSchema.safeParse({
      name: formData.get("name"),
      code: formData.get("code"),
      budget: formData.get("budget"),
      hodId: formData.has("hodId")
        ? (formData.get("hodId") as string) || null
        : editingDepartment?.hodId ?? null,
    });
    if (!parsed.success) {
      setDepartmentError(parsed.error.issues[0]?.message ?? "Check the department details.");
      return;
    }
    if (editingDepartment) {
      editDepartment.mutate({ id: editingDepartment.id, data: parsed.data });
    } else {
      createDepartment.mutate(parsed.data);
    }
  };

  const handlePolicySubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPolicyError("");
    const formData = new FormData(event.currentTarget);
    const parsed = policySchema.safeParse({
      category: formData.get("category"),
      maxLimit: formData.get("maxLimit"),
      requireReceipt: formData.get("requireReceipt") === "on",
      requireGstin: formData.get("requireGstin") === "on",
    });
    if (!parsed.success) {
      setPolicyError(parsed.error.issues[0]?.message ?? "Check the policy details.");
      return;
    }
    savePolicy.mutate(parsed.data);
  };

  const openPolicyDialog = (policy?: PolicyRule) => {
    setEditingPolicy(policy ?? null);
    setPolicyError("");
    setPolicyDialogOpen(true);
  };

  const openDepartmentDialog = (department?: Department) => {
    setEditingDepartment(department ?? null);
    setDepartmentError("");
    setDepartmentDialogOpen(true);
  };

  if (authLoading || !isSuperadmin) return null;

  const sectionDetails: Record<AdminSection, { title: string; description: string }> = {
    departments: {
      title: "Department Management",
      description: "Set up departments and manage their annual budget caps.",
    },
    policies: {
      title: "Spend Policies",
      description: "Define per-category limits and documentation requirements.",
    },
    audit: {
      title: "Audit Logs",
      description: "Review administrative and financial activity across the organization.",
    },
    registrations: {
      title: "Registration Requests",
      description: "Review registration requests and manage user access.",
    },
  };

  return (
    <DashboardLayout>
      <div className="space-y-7">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-rose-300">Platform controls</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">
              {sectionDetails[section].title}
            </h1>
            <p className="mt-2 text-sm text-white/45">
              {sectionDetails[section].description}
            </p>
          </div>
          <Badge variant="outline" className="w-fit border-rose-400/20 bg-rose-500/10 px-3 py-1 text-rose-200">
            <ShieldCheck className="mr-1.5 size-3.5" />
            Superadmin access
          </Badge>
        </header>
        {savePolicy.isPending && (
          <p role="status" className="rounded-xl border border-violet-500/20 bg-violet-500/10 px-4 py-3 text-sm text-violet-200">
            Saving policy update…
          </p>
        )}

        <Tabs value={section} className="gap-5">
          <TabsContent value="departments">
            <Card className="overflow-hidden border-white/[0.07] bg-[#12121e]/70">
              <CardHeader className="flex flex-row items-center justify-between gap-4 border-b border-white/[0.06]">
                <div>
                  <CardTitle className="text-lg text-white">Departments</CardTitle>
                  <CardDescription className="mt-1 text-white/40">
                    Set up departments and their annual budget caps.
                  </CardDescription>
                </div>
                <Button
                  onClick={() => openDepartmentDialog()}
                  className="rounded-xl bg-violet-600 text-white hover:bg-violet-500"
                >
                  <Plus /> Add department
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <DataState loading={departmentsQuery.isLoading} error={departmentsQuery.isError ? getErrorMessage(departmentsQuery.error) : ""} onRetry={() => void departmentsQuery.refetch()} empty={!departmentsQuery.isLoading && !departmentsQuery.isError && departmentsQuery.data?.length === 0}>
                  {departmentsQuery.data && departmentsQuery.data.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/[0.06] hover:bg-transparent">
                          <TableHead className="pl-5 text-xs uppercase tracking-wide text-white/45">Department</TableHead>
                          <TableHead className="text-xs uppercase tracking-wide text-white/45">Code</TableHead>
                          <TableHead className="text-xs uppercase tracking-wide text-white/45">Head of department</TableHead>
                          <TableHead className="text-right text-xs uppercase tracking-wide text-white/45">Budget cap</TableHead>
                          <TableHead className="pr-5 text-right text-xs uppercase tracking-wide text-white/45">Edit</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {departmentsQuery.data.map((department: Department) => (
                          <TableRow key={department.id} className="border-white/[0.05]">
                            <TableCell className="pl-5 font-medium text-white">{department.name}</TableCell>
                            <TableCell><Badge variant="outline" className="border-white/10 text-white/60">{department.code}</Badge></TableCell>
                            <TableCell className="text-white/55">{department.hod?.name ?? "Not assigned"}</TableCell>
                            <TableCell className="text-right font-medium text-white">{formatCurrency(department.budget)}</TableCell>
                            <TableCell className="pr-5 text-right">
                              <Button variant="outline" size="sm" onClick={() => openDepartmentDialog(department)} className="border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.08] hover:text-white">
                                <Pencil /> Edit
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </DataState>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="policies">
            <Card className="overflow-hidden border-white/[0.07] bg-[#12121e]/70">
              <CardHeader className="flex flex-row items-center justify-between gap-4 border-b border-white/[0.06]">
                <div>
                  <CardTitle className="text-lg text-white">Spend policies</CardTitle>
                  <CardDescription className="mt-1 text-white/40">
                    Define per-category limits and documentation requirements.
                  </CardDescription>
                </div>
                <Button onClick={() => openPolicyDialog()} className="rounded-xl bg-violet-600 text-white hover:bg-violet-500">
                  <Plus /> Add policy
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <DataState loading={policiesQuery.isLoading} error={policiesQuery.isError ? getErrorMessage(policiesQuery.error) : ""} onRetry={() => void policiesQuery.refetch()} empty={!policiesQuery.isLoading && !policiesQuery.isError && policiesQuery.data?.length === 0}>
                  {policiesQuery.data && policiesQuery.data.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/[0.06] hover:bg-transparent">
                          <TableHead className="pl-5 text-xs uppercase tracking-wide text-white/45">Category</TableHead>
                          <TableHead className="text-xs uppercase tracking-wide text-white/45">Maximum spend</TableHead>
                          <TableHead className="text-xs uppercase tracking-wide text-white/45">Requirements</TableHead>
                          <TableHead className="pr-5 text-right text-xs uppercase tracking-wide text-white/45">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {policiesQuery.data.map((policy: PolicyRule) => (
                          <TableRow key={policy.id} className="border-white/[0.05]">
                            <TableCell className="pl-5 font-medium text-white">{policy.category}</TableCell>
                            <TableCell className="text-white/75">{formatCurrency(policy.maxLimit)}</TableCell>
                            <TableCell className="space-x-1.5">
                              <Badge variant="outline" className={policy.requireReceipt ? "border-emerald-500/20 text-emerald-300" : "border-white/10 text-white/40"}>
                                Receipt {policy.requireReceipt ? "required" : "optional"}
                              </Badge>
                              <Badge variant="outline" className={policy.requireGstin ? "border-blue-500/20 text-blue-300" : "border-white/10 text-white/40"}>
                                GSTIN {policy.requireGstin ? "required" : "optional"}
                              </Badge>
                            </TableCell>
                            <TableCell className="pr-5 text-right">
                              <Button variant="outline" size="sm" onClick={() => openPolicyDialog(policy)} className="border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.08] hover:text-white">
                                Edit policy
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </DataState>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit">
            <Card className="overflow-hidden border-white/[0.07] bg-[#12121e]/70">
              <CardHeader className="border-b border-white/[0.06]">
                <CardTitle className="flex items-center gap-2 text-lg text-white">
                  <ClipboardList className="size-5 text-violet-300" /> Recent audit activity
                </CardTitle>
                <CardDescription className="text-white/40">
                  All recorded administrative and financial activity across the organization.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <DataState loading={auditQuery.isLoading} error={auditQuery.isError ? getErrorMessage(auditQuery.error) : ""} onRetry={() => void auditQuery.refetch()} empty={!auditQuery.isLoading && !auditQuery.isError && auditQuery.data?.length === 0}>
                  {auditQuery.data && auditQuery.data.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/[0.06] hover:bg-transparent">
                          <TableHead className="pl-5 text-xs uppercase tracking-wide text-white/45">Action</TableHead>
                          <TableHead className="text-xs uppercase tracking-wide text-white/45">Performed by</TableHead>
                          <TableHead className="text-xs uppercase tracking-wide text-white/45">Details</TableHead>
                          <TableHead className="pr-5 text-right text-xs uppercase tracking-wide text-white/45">Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {auditQuery.data.map((log: AuditLog) => (
                          <TableRow key={log.id} className="border-white/[0.05]">
                            <TableCell className="pl-5"><Badge variant="outline" className="border-violet-500/20 bg-violet-500/10 text-violet-200">{log.action.replaceAll("_", " ")}</Badge></TableCell>
                            <TableCell>
                              <p className="text-sm text-white/75">{log.user?.name ?? "Unknown user"}</p>
                              <p className="mt-1 text-xs text-white/35">{log.user?.email}</p>
                            </TableCell>
                            <TableCell className="max-w-sm whitespace-normal text-xs text-white/45">
                              <pre className="max-h-20 overflow-auto whitespace-pre-wrap font-sans">{JSON.stringify(log.metadata, null, 2)}</pre>
                              {log.ipAddress && <span className="mt-1 block text-white/30">IP: {log.ipAddress}</span>}
                            </TableCell>
                            <TableCell className="pr-5 text-right text-xs text-white/45">{formatDate(log.createdAt)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </DataState>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="registrations">
            <Card className="overflow-hidden border-white/[0.07] bg-[#12121e]/70">
              <CardHeader className="border-b border-white/[0.06]">
                <CardTitle className="text-lg text-white">Users and registration requests</CardTitle>
                <CardDescription className="mt-1 text-white/40">
                  Review pending requests or blacklist existing users.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <DataState
                  loading={registrationsQuery.isLoading}
                  error={registrationsQuery.isError ? getErrorMessage(registrationsQuery.error) : ""}
                  onRetry={() => void registrationsQuery.refetch()}
                  empty={!registrationsQuery.isLoading && !registrationsQuery.isError && registrationsQuery.data?.length === 0}
                >
                  {registrationsQuery.data && registrationsQuery.data.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/[0.06] hover:bg-transparent">
                          <TableHead className="pl-5 text-xs uppercase tracking-wide text-white/45">Applicant</TableHead>
                          <TableHead className="text-xs uppercase tracking-wide text-white/45">Requested role</TableHead>
                          <TableHead className="text-xs uppercase tracking-wide text-white/45">Submitted</TableHead>
                          <TableHead className="pr-5 text-right text-xs uppercase tracking-wide text-white/45">Decision</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {registrationsQuery.data.map((registration: RegistrationRequest) => (
                          <TableRow key={registration.id} className="border-white/[0.05]">
                            <TableCell className="pl-5">
                              <p className="font-medium text-white">{registration.name}</p>
                              <p className="mt-1 text-xs text-white/40">{registration.email}</p>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="border-white/10 text-white/65">
                                {registration.role.replaceAll("_", " ")}
                              </Badge>
                              <p className="mt-1 text-xs text-white/40">
                                {registration.registrationStatus.replaceAll("_", " ")}
                              </p>
                            </TableCell>
                            <TableCell className="text-sm text-white/50">{formatDate(registration.createdAt)}</TableCell>
                            <TableCell className="pr-5">
                              {registration.registrationStatus === "PENDING" ? (
                                <div className="flex justify-end gap-2">
                                  <Button size="sm" disabled={reviewRegistration.isPending} onClick={() => reviewRegistration.mutate({ id: registration.id, status: "APPROVED" })} className="bg-emerald-600 text-white hover:bg-emerald-500">Approve</Button>
                                  <Button size="sm" variant="outline" disabled={reviewRegistration.isPending} onClick={() => reviewRegistration.mutate({ id: registration.id, status: "REJECTED" })} className="border-white/10 text-white/65">Reject</Button>
                                  <Button size="sm" variant="destructive" disabled={reviewRegistration.isPending} onClick={() => reviewRegistration.mutate({ id: registration.id, status: "BLACKLISTED" })}>Blacklist</Button>
                                </div>
                              ) : registration.registrationStatus === "APPROVED" ? (
                                <div className="flex justify-end">
                                  <Button size="sm" variant="destructive" disabled={reviewRegistration.isPending} onClick={() => reviewRegistration.mutate({ id: registration.id, status: "BLACKLISTED" })}>Blacklist user</Button>
                                </div>
                              ) : registration.registrationStatus === "BLACKLISTED" ? (
                                <div className="flex justify-end">
                                  <Button size="sm" variant="outline" disabled={reviewRegistration.isPending} onClick={() => reviewRegistration.mutate({ id: registration.id, status: "APPROVED" })} className="border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10">Undo blacklist</Button>
                                </div>
                              ) : (
                                <span className="block text-right text-xs text-white/35">No actions available</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </DataState>
                {reviewRegistration.isError && (
                  <p role="alert" className="border-t border-red-500/10 px-5 py-3 text-sm text-red-300">
                    {getErrorMessage(reviewRegistration.error)}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {section === "departments" && <Dialog open={departmentDialogOpen} onOpenChange={setDepartmentDialogOpen}>
          <DialogContent className="border-white/10 bg-[#151522] text-white sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-white">{editingDepartment ? "Edit department" : "Add a department"}</DialogTitle>
              <DialogDescription className="text-white/45">
                {editingDepartment ? "Update the department details and budget cap." : "Create a department and set its budget cap."}
              </DialogDescription>
            </DialogHeader>
            <Form key={`${editingDepartment?.id ?? "new-department"}-${departmentDialogOpen ? "open" : "closed"}`} onSubmit={handleDepartmentSubmit}>
              <div className="space-y-2">
                <Label htmlFor="department-name" className="text-white/70">Department name</Label>
                <Input id="department-name" name="name" defaultValue={editingDepartment?.name ?? ""} placeholder="Engineering" required maxLength={100} className="h-10 border-white/10 bg-white/[0.04] text-white" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department-code" className="text-white/70">Department code</Label>
                <Input id="department-code" name="code" defaultValue={editingDepartment?.code ?? ""} placeholder="ENG" required maxLength={20} className="h-10 border-white/10 bg-white/[0.04] text-white" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department-budget" className="text-white/70">Budget cap (₹)</Label>
                <Input id="department-budget" name="budget" type="number" min="0" step="0.01" defaultValue={editingDepartment?.budget ?? ""} placeholder="500000" required className="h-10 border-white/10 bg-white/[0.04] text-white" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department-hod" className="text-white/70">Department head</Label>
                <select id="department-hod" name="hodId" defaultValue={editingDepartment?.hodId ?? ""} disabled={hodsQuery.isLoading || hodsQuery.isError} className="h-10 w-full rounded-lg border border-white/10 bg-[#171724] px-3 text-sm text-white disabled:opacity-50">
                  <option value="">Unassigned</option>
                  {hodsQuery.data?.map((hod) => (
                    <option key={hod.id} value={hod.id}>{hod.name}</option>
                  ))}
                </select>
                {hodsQuery.isError && <p className="text-xs text-amber-300">Could not load department heads; the existing assignment will be kept.</p>}
              </div>
              {departmentError && <p role="alert" className="text-sm text-red-300">{departmentError}</p>}
              <DialogFooter className="border-white/[0.06] bg-transparent p-0 pt-2">
                <Button type="button" variant="outline" onClick={() => setDepartmentDialogOpen(false)} className="border-white/10 text-white/70">Cancel</Button>
                <Button type="submit" disabled={createDepartment.isPending || editDepartment.isPending} className="bg-violet-600 text-white hover:bg-violet-500">
                  {(createDepartment.isPending || editDepartment.isPending) && <LoaderCircle className="animate-spin" />}
                  {editingDepartment ? "Save changes" : "Create department"}
                </Button>
              </DialogFooter>
            </Form>
          </DialogContent>
        </Dialog>}

        {section === "policies" && <Dialog
          open={policyDialogOpen}
          onOpenChange={(open) => {
            setPolicyDialogOpen(open);
            if (!open) setEditingPolicy(null);
          }}
        >
          <DialogContent className="border-white/10 bg-[#151522] text-white sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-white">{editingPolicy ? "Update spend policy" : "Add spend policy"}</DialogTitle>
              <DialogDescription className="text-white/45">
                {editingPolicy ? `Adjust the limit and requirements for ${editingPolicy.category}.` : "Set the spending limit for a category."}
              </DialogDescription>
            </DialogHeader>
            <Form key={`${editingPolicy?.id ?? "new-policy"}-${policyDialogOpen ? "open" : "closed"}`} onSubmit={handlePolicySubmit}>
              <div className="space-y-2">
                <Label htmlFor="policy-category" className="text-white/70">Category</Label>
                <Input id="policy-category" name="category" defaultValue={editingPolicy?.category ?? ""} placeholder="Food" required maxLength={100} readOnly={Boolean(editingPolicy)} className="h-10 border-white/10 bg-white/[0.04] text-white read-only:opacity-60" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="policy-limit" className="text-white/70">Maximum spend (₹)</Label>
                <Input id="policy-limit" name="maxLimit" type="number" min="0" step="0.01" defaultValue={editingPolicy?.maxLimit ?? ""} placeholder="1500" required className="h-10 border-white/10 bg-white/[0.04] text-white" />
              </div>
              <label className="flex items-center gap-3 text-sm text-white/70">
                <input name="requireReceipt" type="checkbox" defaultChecked={editingPolicy?.requireReceipt ?? false} className="size-4 accent-violet-500" />
                Require a receipt
              </label>
              <label className="flex items-center gap-3 text-sm text-white/70">
                <input name="requireGstin" type="checkbox" defaultChecked={editingPolicy?.requireGstin ?? false} className="size-4 accent-violet-500" />
                Require GSTIN
              </label>
              {policyError && <p role="alert" className="text-sm text-red-300">{policyError}</p>}
              <DialogFooter className="border-white/[0.06] bg-transparent p-0 pt-2">
                <Button type="button" variant="outline" onClick={() => setPolicyDialogOpen(false)} className="border-white/10 text-white/70">Cancel</Button>
                <Button type="submit" disabled={savePolicy.isPending} className="bg-violet-600 text-white hover:bg-violet-500">
                  {savePolicy.isPending && <LoaderCircle className="animate-spin" />}
                  Save policy
                </Button>
              </DialogFooter>
            </Form>
          </DialogContent>
        </Dialog>}
      </div>
    </DashboardLayout>
  );
}

function DataState({
  loading,
  error,
  onRetry,
  empty,
  children,
}: {
  loading: boolean;
  error: string;
  onRetry: () => void;
  empty: boolean;
  children: React.ReactNode;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-white/45">
        <LoaderCircle className="size-4 animate-spin" /> Loading...
      </div>
    );
  }
  if (error) {
    return (
      <div className="space-y-3 py-14 text-center">
        <p role="alert" className="text-sm text-red-300">{error}</p>
        <Button variant="outline" onClick={onRetry}>Try again</Button>
      </div>
    );
  }
  if (empty) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm font-medium text-white/65">Nothing here yet</p>
        <p className="mt-1 text-sm text-white/35">New records will appear here.</p>
      </div>
    );
  }
  return <>{children}</>;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}
