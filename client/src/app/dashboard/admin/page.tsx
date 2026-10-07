"use client";

import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { z } from "zod";
import {
  Building2,
  ClipboardList,
  LoaderCircle,
  Plus,
  ScrollText,
  ShieldCheck,
  SlidersHorizontal,
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
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { adminAPI } from "@/lib/api";
import { AuditLog, Department, PolicyRule } from "@/lib/types";

const departmentSchema = z.object({
  name: z.string().trim().min(1, "Department name is required.").max(100),
  code: z.string().trim().min(1, "Department code is required.").max(20),
  budget: z
    .string()
    .trim()
    .min(1, "Budget is required.")
    .transform(Number)
    .pipe(z.number().finite().nonnegative("Budget must be zero or greater.")),
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

export default function AdminPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [departmentDialogOpen, setDepartmentDialogOpen] = useState(false);
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
      router.replace("/dashboard");
    }
  }, [authLoading, router, user]);

  const departmentsQuery = useQuery({
    queryKey: ["admin", "departments"],
    queryFn: async () => (await adminAPI.getDepartments()).data.departments,
    enabled: isSuperadmin,
  });
  const policiesQuery = useQuery({
    queryKey: ["admin", "policies"],
    queryFn: async () => (await adminAPI.getPolicyRules()).data.policyRules,
    enabled: isSuperadmin,
  });
  const auditQuery = useQuery({
    queryKey: ["admin", "audit-logs"],
    queryFn: async () => (await adminAPI.getAuditLogs()).data.auditLogs,
    enabled: isSuperadmin,
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
  const savePolicy = useMutation({
    mutationFn: adminAPI.upsertPolicyRule,
    onSuccess: async () => {
      setPolicyDialogOpen(false);
      setEditingPolicy(null);
      setPolicyError("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "policies"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "audit-logs"] }),
      ]);
    },
    onError: (error: unknown) => setPolicyError(getErrorMessage(error)),
  });

  const handleDepartmentSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDepartmentError("");
    const formData = new FormData(event.currentTarget);
    const parsed = departmentSchema.safeParse({
      name: formData.get("name"),
      code: formData.get("code"),
      budget: formData.get("budget"),
    });
    if (!parsed.success) {
      setDepartmentError(parsed.error.issues[0]?.message ?? "Check the department details.");
      return;
    }
    createDepartment.mutate(parsed.data);
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

  if (authLoading || !isSuperadmin) return null;

  return (
    <DashboardLayout>
      <div className="space-y-7">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-rose-300">Platform controls</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">
              Administration
            </h1>
            <p className="mt-2 text-sm text-white/45">
              Manage department budgets, spend policies, and platform activity.
            </p>
          </div>
          <Badge variant="outline" className="w-fit border-rose-400/20 bg-rose-500/10 px-3 py-1 text-rose-200">
            <ShieldCheck className="mr-1.5 size-3.5" />
            Superadmin access
          </Badge>
        </header>

        <Tabs defaultValue="departments" className="gap-5">
          <TabsList className="h-auto w-full justify-start overflow-x-auto border border-white/[0.06] bg-[#12121e] p-1 sm:w-fit">
            <TabsTrigger value="departments" className="gap-2 px-4 py-2 text-white/55 data-active:text-white">
              <Building2 className="size-4" /> Department Management
            </TabsTrigger>
            <TabsTrigger value="policies" className="gap-2 px-4 py-2 text-white/55 data-active:text-white">
              <SlidersHorizontal className="size-4" /> Spend Policies
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-2 px-4 py-2 text-white/55 data-active:text-white">
              <ScrollText className="size-4" /> Audit Logs
            </TabsTrigger>
          </TabsList>

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
                  onClick={() => {
                    setDepartmentError("");
                    setDepartmentDialogOpen(true);
                  }}
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
                          <TableHead className="pr-5 text-right text-xs uppercase tracking-wide text-white/45">Budget cap</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {departmentsQuery.data.map((department: Department) => (
                          <TableRow key={department.id} className="border-white/[0.05]">
                            <TableCell className="pl-5 font-medium text-white">{department.name}</TableCell>
                            <TableCell><Badge variant="outline" className="border-white/10 text-white/60">{department.code}</Badge></TableCell>
                            <TableCell className="text-white/55">{department.hod?.name ?? "Not assigned"}</TableCell>
                            <TableCell className="pr-5 text-right font-medium text-white">{formatCurrency(department.budget)}</TableCell>
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
                  The latest 100 administrative and financial events.
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
        </Tabs>

        <Dialog open={departmentDialogOpen} onOpenChange={setDepartmentDialogOpen}>
          <DialogContent className="border-white/10 bg-[#151522] text-white sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-white">Add a department</DialogTitle>
              <DialogDescription className="text-white/45">
                Create a department and set its budget cap.
              </DialogDescription>
            </DialogHeader>
            <Form key={departmentDialogOpen ? "department-open" : "department-closed"} onSubmit={handleDepartmentSubmit}>
              <div className="space-y-2">
                <Label htmlFor="department-name" className="text-white/70">Department name</Label>
                <Input id="department-name" name="name" placeholder="Engineering" required maxLength={100} className="h-10 border-white/10 bg-white/[0.04] text-white" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department-code" className="text-white/70">Department code</Label>
                <Input id="department-code" name="code" placeholder="ENG" required maxLength={20} className="h-10 border-white/10 bg-white/[0.04] text-white" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department-budget" className="text-white/70">Budget cap (₹)</Label>
                <Input id="department-budget" name="budget" type="number" min="0" step="0.01" placeholder="500000" required className="h-10 border-white/10 bg-white/[0.04] text-white" />
              </div>
              {departmentError && <p role="alert" className="text-sm text-red-300">{departmentError}</p>}
              <DialogFooter className="border-white/[0.06] bg-transparent p-0 pt-2">
                <Button type="button" variant="outline" onClick={() => setDepartmentDialogOpen(false)} className="border-white/10 text-white/70">Cancel</Button>
                <Button type="submit" disabled={createDepartment.isPending} className="bg-violet-600 text-white hover:bg-violet-500">
                  {createDepartment.isPending && <LoaderCircle className="animate-spin" />}
                  Create department
                </Button>
              </DialogFooter>
            </Form>
          </DialogContent>
        </Dialog>

        <Dialog
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
        </Dialog>
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
