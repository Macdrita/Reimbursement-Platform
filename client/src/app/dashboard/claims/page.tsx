"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { claimsAPI } from "@/lib/api";
import { Claim } from "@/lib/types";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  ExternalLink,
} from "lucide-react";
import { useRouter } from "next/navigation";

const statusConfig = {
  PENDING: {
    label: "Pending",
    icon: Clock,
    color: "bg-amber-500/15 text-amber-400 border-amber-500/25",
  },
  APPROVED: {
    label: "Approved",
    icon: CheckCircle2,
    color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  },
  REJECTED: {
    label: "Rejected",
    icon: XCircle,
    color: "bg-red-500/15 text-red-400 border-red-500/25",
  },
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function MyClaimsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }

    claimsAPI
      .getMyClaims()
      .then((res) => setClaims(res.data.claims))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [user, authLoading, router]);

  if (authLoading || !user) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">My Claims</h1>
            <p className="text-white/40 text-sm mt-1">
              Track all your reimbursement submissions
            </p>
          </div>
          <button
            onClick={() => router.push("/dashboard/claims/new")}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-medium hover:from-violet-500 hover:to-indigo-500 transition-all duration-200 shadow-lg shadow-violet-500/20 cursor-pointer"
          >
            + New Claim
          </button>
        </div>

        <Card className="bg-[#12121e]/60 backdrop-blur-sm border-white/[0.06]">
          <CardHeader>
            <CardTitle className="text-lg text-white">
              All Submissions
            </CardTitle>
            <CardDescription className="text-white/40">
              {claims.length} total claim{claims.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12 text-white/30">
                Loading claims...
              </div>
            ) : claims.length === 0 ? (
              <div className="text-center py-16">
                <FileText className="h-12 w-12 text-white/10 mx-auto mb-4" />
                <p className="text-white/30 text-sm mb-2">No claims found</p>
                <p className="text-white/20 text-xs">
                  Submit your first reimbursement request
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-white/[0.06] overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/[0.06] hover:bg-transparent">
                      <TableHead className="text-white/50 font-medium text-xs uppercase tracking-wider">
                        Title
                      </TableHead>
                      <TableHead className="text-white/50 font-medium text-xs uppercase tracking-wider">
                        Amount
                      </TableHead>
                      <TableHead className="text-white/50 font-medium text-xs uppercase tracking-wider">
                        Date
                      </TableHead>
                      <TableHead className="text-white/50 font-medium text-xs uppercase tracking-wider">
                        Status
                      </TableHead>
                      <TableHead className="text-white/50 font-medium text-xs uppercase tracking-wider">
                        Reviewer
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {claims.map((claim) => {
                      const config = statusConfig[claim.status];
                      return (
                        <TableRow
                          key={claim.id}
                          className="border-white/[0.04] hover:bg-white/[0.03] cursor-pointer transition-colors"
                          onClick={() => setSelectedClaim(claim)}
                        >
                          <TableCell className="font-medium text-white text-sm">
                            {claim.title}
                          </TableCell>
                          <TableCell className="text-white/80 text-sm font-semibold">
                            ₹{claim.amount.toLocaleString("en-IN")}
                          </TableCell>
                          <TableCell className="text-white/40 text-sm">
                            {new Date(claim.createdAt).toLocaleDateString(
                              "en-IN",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              }
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-xs font-medium ${config.color}`}
                            >
                              {config.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-white/40 text-sm">
                            {claim.reviewer?.name || "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Claim Detail Dialog */}
        <Dialog
          open={!!selectedClaim}
          onOpenChange={() => setSelectedClaim(null)}
        >
          <DialogContent className="bg-[#16162a] border-white/10 text-white max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-lg">
                {selectedClaim?.title}
              </DialogTitle>
              <DialogDescription className="text-white/40">
                Submitted on{" "}
                {selectedClaim &&
                  new Date(selectedClaim.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
              </DialogDescription>
            </DialogHeader>

            {selectedClaim && (
              <div className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                    <p className="text-xs text-white/40 mb-1">Amount</p>
                    <p className="text-lg font-bold text-white">
                      ₹{selectedClaim.amount.toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                    <p className="text-xs text-white/40 mb-1">Status</p>
                    <Badge
                      variant="outline"
                      className={`text-xs font-medium ${statusConfig[selectedClaim.status].color}`}
                    >
                      {statusConfig[selectedClaim.status].label}
                    </Badge>
                  </div>
                </div>

                {selectedClaim.description && (
                  <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                    <p className="text-xs text-white/40 mb-1">Description</p>
                    <p className="text-sm text-white/70">
                      {selectedClaim.description}
                    </p>
                  </div>
                )}

                {selectedClaim.reviewer && (
                  <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                    <p className="text-xs text-white/40 mb-1">Reviewed by</p>
                    <p className="text-sm text-white/70">
                      {selectedClaim.reviewer.name} (
                      {selectedClaim.reviewer.email})
                    </p>
                  </div>
                )}

                {selectedClaim.reviewComment && (
                  <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                    <p className="text-xs text-white/40 mb-1">
                      Review Comment
                    </p>
                    <p className="text-sm text-white/70 italic">
                      &quot;{selectedClaim.reviewComment}&quot;
                    </p>
                  </div>
                )}

                <a
                  href={`${API_BASE}${selectedClaim.receiptUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  View Receipt
                </a>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
