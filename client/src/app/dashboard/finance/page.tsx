"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { LoaderCircle, Wallet } from "lucide-react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/context/AuthContext";
import { financeAPI } from "@/lib/api";
import { Claim } from "@/lib/types";
import { getRoleHomePath } from "@/lib/navigation";

const financeRoles = ["FINANCE_ADMIN", "SUPERADMIN"];
const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});
const emptyClaims: Claim[] = [];

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

export default function FinancePage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const canAccessFinance = Boolean(user && financeRoles.includes(user.role));

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
    } else if (!financeRoles.includes(user.role)) {
      router.replace(getRoleHomePath(user.role));
    }
  }, [authLoading, router, user]);

  const claimsQuery = useQuery({
    queryKey: ["finance", "approved-claims"],
    queryFn: async () => (await financeAPI.getApprovedClaims()).data.claims,
    enabled: canAccessFinance,
  });
  const payoutBatchesQuery = useQuery({
    queryKey: ["finance", "payout-batches"],
    queryFn: async () => (await financeAPI.getPayoutBatches()).data.batches,
    enabled: canAccessFinance,
    refetchInterval: (query) =>
      query.state.data?.some((batch) => batch.status === "PROCESSING")
        ? 10_000
        : false,
  });
  const claims = claimsQuery.data ?? emptyClaims;
  const selectedClaims = useMemo(
    () => claims.filter((claim) => selectedIds.includes(claim.id)),
    [claims, selectedIds]
  );
  const totalUnpaid = claims.reduce((sum, claim) => sum + claim.amount, 0);
  const selectedTotal = selectedClaims.reduce((sum, claim) => sum + claim.amount, 0);
  const executeBatch = useMutation({
    mutationFn: (claimIds: string[]) => financeAPI.executeBatch(claimIds),
    onSuccess: async () => {
      setSelectedIds([]);
      await queryClient.invalidateQueries({
        queryKey: ["finance", "approved-claims"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["finance", "payout-batches"],
      });
    },
  });

  const allSelected = claims.length > 0 && selectedClaims.length === claims.length;
  const toggleAll = () => {
    setSelectedIds(allSelected ? [] : claims.map((claim) => claim.id));
  };
  const toggleClaim = (claimId: string) => {
    setSelectedIds((current) =>
      current.includes(claimId)
        ? current.filter((id) => id !== claimId)
        : [...current, claimId]
    );
  };

  if (authLoading || !canAccessFinance) return null;

  return (
    <DashboardLayout>
      <div className="space-y-7">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-violet-300">Finance workspace</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">
              Ready for payout
            </h1>
            <p className="mt-2 text-sm text-white/45">
              Review approved claims and run a Razorpay test payout batch.
            </p>
          </div>
          <Button
            onClick={() => executeBatch.mutate(selectedIds)}
            disabled={selectedIds.length === 0 || executeBatch.isPending}
            className="h-11 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 text-white shadow-lg shadow-violet-950/30 hover:from-violet-500 hover:to-indigo-500"
          >
            {executeBatch.isPending
              ? "Submitting test payouts..."
              : "Execute test payout batch"}
          </Button>
        </header>

        <div
          role="note"
          className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200"
        >
          Razorpay test mode: the batch is sent to Razorpay using test API
          credentials and fixed test beneficiary details. Test mode does not
          transfer real funds. Live Razorpay credentials are rejected.
        </div>

        {executeBatch.isError && (
          <div role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {getErrorMessage(executeBatch.error)}
          </div>
        )}
        {executeBatch.isSuccess && (
          <div
            role={
              executeBatch.data.data.failures.length > 0 ? "alert" : "status"
            }
            className="rounded-xl border border-white/[0.07] bg-[#12121e]/70 px-4 py-3 text-sm text-white/75"
          >
            <p>
              Razorpay test batch {executeBatch.data.data.payoutBatch.id} created.
              {" "}Status: {executeBatch.data.data.payoutBatch.status}. Test mode
              does not transfer real funds.
            </p>
            {executeBatch.data.data.failures.map((failure) => (
              <p key={failure.employeeId} className="mt-2 text-red-300">
                Test payout for {failure.employeeId}: {failure.message}
              </p>
            ))}
          </div>
        )}

        <section aria-label="Payout summary" className="grid gap-4 md:grid-cols-3">
          <Card className="border-white/[0.07] bg-[#12121e]/70">
            <CardHeader className="pb-2">
              <CardDescription className="text-white/45">Total unpaid amount</CardDescription>
              <CardTitle className="text-2xl text-white">{currency.format(totalUnpaid)}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-white/35">Approved claims not yet assigned to a payout batch</CardContent>
          </Card>
          <Card className="border-white/[0.07] bg-[#12121e]/70">
            <CardHeader className="pb-2">
              <CardDescription className="text-white/45">Claim count</CardDescription>
              <CardTitle className="text-2xl text-white">{claims.length}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-white/35">Claims ready to be paid</CardContent>
          </Card>
          <Card className="border-violet-500/20 bg-violet-500/[0.07]">
            <CardHeader className="pb-2">
              <CardDescription className="text-violet-200/60">Selected total</CardDescription>
              <CardTitle className="text-2xl text-white">{currency.format(selectedTotal)}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-violet-100/45">{selectedClaims.length} selected for this batch</CardContent>
          </Card>
        </section>

        <Card className="overflow-hidden border-white/[0.07] bg-[#12121e]/70">
          <CardHeader className="border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-300">
                <Wallet className="size-5" />
              </div>
              <div>
                <CardTitle className="text-lg text-white">Approved claims</CardTitle>
                <CardDescription className="mt-1 text-white/40">
                  Select one or more approved claims and submit a test payout batch.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {claimsQuery.isLoading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-white/45">
                <LoaderCircle className="size-4 animate-spin" />
                Loading approved claims...
              </div>
            ) : claimsQuery.isError ? (
              <div className="space-y-3 py-14 text-center">
                <p role="alert" className="text-sm text-red-300">{getErrorMessage(claimsQuery.error)}</p>
                <Button variant="outline" onClick={() => void claimsQuery.refetch()}>Try again</Button>
              </div>
            ) : claims.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-sm font-medium text-white/65">All caught up</p>
                <p className="mt-1 text-sm text-white/35">There are no approved claims waiting for payout.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/[0.06] hover:bg-transparent">
                    <TableHead className="w-12 pl-5">
                      <input
                        aria-label="Select all claims"
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleAll}
                        className="size-4 accent-violet-500"
                      />
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-white/45">Claim</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-white/45">Employee</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-white/45">Approved</TableHead>
                    <TableHead className="pr-5 text-right text-xs uppercase tracking-wide text-white/45">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {claims.map((claim: Claim) => (
                    <TableRow key={claim.id} className="border-white/[0.05]">
                      <TableCell className="pl-5">
                        <input
                          aria-label={`Select ${claim.title}`}
                          type="checkbox"
                          checked={selectedIds.includes(claim.id)}
                          onChange={() => toggleClaim(claim.id)}
                          className="size-4 accent-violet-500"
                        />
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-white">{claim.title}</p>
                        <p className="mt-1 max-w-xs truncate text-xs text-white/35">{claim.description || "No description"}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-white/75">{claim.employee?.name ?? "Unknown employee"}</p>
                        <p className="mt-1 text-xs text-white/35">{claim.employee?.email}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
                          {new Date(claim.updatedAt).toLocaleDateString("en-IN")}
                        </Badge>
                      </TableCell>
                      <TableCell className="pr-5 text-right font-semibold text-white">{currency.format(claim.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-white/[0.07] bg-[#12121e]/70">
          <CardHeader className="border-b border-white/[0.06]">
            <CardTitle className="text-lg text-white">Recent Razorpay test payouts</CardTitle>
            <CardDescription className="text-white/40">
              Status is updated from signed Razorpay payout webhooks. These are test-mode payouts only.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {payoutBatchesQuery.isLoading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-white/45">
                <LoaderCircle className="size-4 animate-spin" />
                Loading payout history...
              </div>
            ) : payoutBatchesQuery.isError ? (
              <div className="space-y-3 py-10 text-center">
                <p role="alert" className="text-sm text-red-300">
                  {getErrorMessage(payoutBatchesQuery.error)}
                </p>
                <Button
                  variant="outline"
                  onClick={() => void payoutBatchesQuery.refetch()}
                >
                  Try again
                </Button>
              </div>
            ) : !payoutBatchesQuery.data?.length ? (
              <p className="py-10 text-center text-sm text-white/40">
                No payouts have been submitted yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/[0.06] hover:bg-transparent">
                    <TableHead className="pl-5 text-xs uppercase tracking-wide text-white/45">Submitted</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-white/45">Employee</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-white/45">Razorpay test payout</TableHead>
                    <TableHead className="pr-5 text-right text-xs uppercase tracking-wide text-white/45">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payoutBatchesQuery.data.flatMap((batch) =>
                    batch.transactions.map((payout) => (
                      <TableRow key={payout.id} className="border-white/[0.05]">
                        <TableCell className="pl-5 text-sm text-white/70">
                          <p>{new Date(batch.createdAt).toLocaleString("en-IN")}</p>
                          <p className="mt-1 text-xs text-white/35">
                            {batch.provider === "RAZORPAYX_TEST"
                              ? "Razorpay test"
                              : "Demo"}{" "}
                            batch {batch.id.slice(0, 8)} · {batch.status}
                          </p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-white/75">
                            {payout.employee?.name ?? "Unknown employee"}
                          </p>
                          <p className="mt-1 text-xs text-white/35">
                            {payout.employee?.email}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              payout.status === "COMPLETED"
                                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                                : payout.status === "FAILED"
                                  ? "border-red-500/20 bg-red-500/10 text-red-300"
                                  : "border-amber-500/20 bg-amber-500/10 text-amber-300"
                            }
                          >
                            {payout.status}
                          </Badge>
                          <p className="mt-1 max-w-48 truncate text-xs text-white/35">
                            {payout.razorpayPayoutId ?? payout.referenceId}
                          </p>
                        </TableCell>
                        <TableCell className="pr-5 text-right font-semibold text-white">
                          {currency.format(payout.amount)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
