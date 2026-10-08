"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { claimsAPI, usersAPI } from "@/lib/api";
import { Claim, Manager } from "@/lib/types";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Clock,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ClipboardCheck,
  Loader2,
  User,
  Share2,
  ArrowRightLeft,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { getRoleHomePath } from "@/lib/navigation";

const statusConfig = {
  PENDING: {
    label: "Pending",
    icon: Clock,
    color: "bg-amber-500/15 text-amber-400 border-amber-500/25",
    iconColor: "text-amber-400",
  },
  APPROVED: {
    label: "Approved",
    icon: CheckCircle2,
    color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
    iconColor: "text-emerald-400",
  },
  REJECTED: {
    label: "Rejected",
    icon: XCircle,
    color: "bg-red-500/15 text-red-400 border-red-500/25",
    iconColor: "text-red-400",
  },
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function ReviewClaimsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [hods, setHods] = useState<Manager[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [reviewComment, setReviewComment] = useState("");
  const [redirectReason, setRedirectReason] = useState("");
  const [selectedHodId, setSelectedHodId] = useState("");
  const [showRedirectForm, setShowRedirectForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL");
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }

    if (!["MANAGER", "HOD", "FINANCE", "SUPERADMIN"].includes(user.role)) {
      router.replace(getRoleHomePath(user.role));
      return;
    }

    fetchClaims();

    if (["MANAGER", "SUPERADMIN"].includes(user.role)) {
      usersAPI
        .getHODs()
        .then((res) => setHods(res.data.hods))
        .catch(() => {});
    }
  }, [user, authLoading, router]);

  const fetchClaims = async () => {
    try {
      const res = await claimsAPI.getSubordinateClaims();
      setClaims(res.data.claims);
    } catch (err) {
      console.error("Failed to fetch subordinate claims", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReview = async (status: "APPROVED" | "REJECTED") => {
    if (!selectedClaim) return;
    setIsSubmitting(true);

    try {
      await claimsAPI.reviewClaim(selectedClaim.id, {
        status,
        reviewComment: reviewComment || undefined,
      });
      closeDialog();
      fetchClaims();
    } catch (err) {
      console.error("Failed to review claim", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRedirect = async () => {
    if (!selectedClaim) return;
    setIsSubmitting(true);

    try {
      await claimsAPI.redirectClaim(selectedClaim.id, {
        redirectedToId: selectedHodId || undefined,
        reason: redirectReason || undefined,
      });
      closeDialog();
      fetchClaims();
    } catch (err) {
      console.error("Failed to redirect claim", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeDialog = () => {
    setSelectedClaim(null);
    setReviewComment("");
    setRedirectReason("");
    setSelectedHodId("");
    setShowRedirectForm(false);
  };

  if (authLoading || !user) return null;

  const filteredClaims =
    filter === "ALL" ? claims : claims.filter((c) => c.status === filter);
  const pendingCount = claims.filter((c) => c.status === "PENDING").length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Review Claims</h1>
          <p className="text-white/40 text-sm mt-1">
            {user.role === "HOD"
              ? "Review and approve/decline claims from managers and redirected employee claims"
              : "Approve, reject, or redirect reimbursement claims from your team"}
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
                filter === f
                  ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                  : "bg-white/[0.03] text-white/40 border border-white/[0.06] hover:bg-white/[0.06] hover:text-white/60"
              }`}
            >
              {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
              {f === "PENDING" && pendingCount > 0 && (
                <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-400">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        <Card className="bg-[#12121e]/60 backdrop-blur-sm border-white/[0.06]">
          <CardHeader>
            <CardTitle className="text-lg text-white">
              {user.role === "HOD" ? "Pending & Subordinate Reviews" : "Subordinate Claims"}
            </CardTitle>
            <CardDescription className="text-white/40">
              {filteredClaims.length} claim{filteredClaims.length !== 1 ? "s" : ""}{" "}
              {filter !== "ALL" && `(${filter.toLowerCase()})`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12 text-white/30">
                Loading claims...
              </div>
            ) : filteredClaims.length === 0 ? (
              <div className="text-center py-16">
                <ClipboardCheck className="h-12 w-12 text-white/10 mx-auto mb-4" />
                <p className="text-white/30 text-sm mb-2">
                  {filter === "PENDING"
                    ? "No pending claims to review"
                    : "No claims found"}
                </p>
                <p className="text-white/20 text-xs">
                  Claims from your subordinates or redirected to you will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredClaims.map((claim) => {
                  const config = statusConfig[claim.status];
                  const isManagerClaim = claim.employee?.role === "MANAGER";
                  return (
                    <div
                      key={claim.id}
                      onClick={() => {
                        setSelectedClaim(claim);
                        setReviewComment("");
                        setRedirectReason("");
                        setSelectedHodId("");
                        setShowRedirectForm(false);
                      }}
                      className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-all duration-200 cursor-pointer group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-white/[0.06] flex items-center justify-center">
                          <User className="h-5 w-5 text-white/40" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-white">
                              {claim.title}
                            </p>
                            {isManagerClaim && (
                              <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-300 border-purple-500/20">
                                Manager Claim
                              </Badge>
                            )}
                            {claim.isRedirected && (
                              <Badge variant="outline" className="text-[10px] bg-indigo-500/10 text-indigo-300 border-indigo-500/20 flex items-center gap-1">
                                <ArrowRightLeft className="h-3 w-3" /> Redirected to HOD
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-white/30 mt-0.5">
                            by {claim.employee?.name} ({claim.employee?.email}) •{" "}
                            {new Date(claim.createdAt).toLocaleDateString(
                              "en-IN",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              }
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="text-sm font-semibold text-white">
                          ₹{claim.amount.toLocaleString("en-IN")}
                        </p>
                        <Badge
                          variant="outline"
                          className={`text-xs font-medium ${config.color}`}
                        >
                          {config.label}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Review / Redirect Dialog */}
        <Dialog
          open={!!selectedClaim}
          onOpenChange={(open) => {
            if (!open) closeDialog();
          }}
        >
          <DialogContent className="bg-[#16162a] border-white/10 text-white max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-lg">
                Review: {selectedClaim?.title}
              </DialogTitle>
              <DialogDescription className="text-white/40">
                Submitted by {selectedClaim?.employee?.name} (
                {selectedClaim?.employee?.email})
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

                {selectedClaim.isRedirected && (
                  <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                    <p className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5 mb-1">
                      <ArrowRightLeft className="h-3.5 w-3.5" />
                      Redirected to HOD
                    </p>
                    <p className="text-xs text-indigo-200/80">
                      {selectedClaim.redirectReason || "Redirected by Manager to HOD for review"}
                    </p>
                    {selectedClaim.redirectedTo && (
                      <p className="text-[11px] text-indigo-300/60 mt-1">
                        Assigned HOD: {selectedClaim.redirectedTo.name}
                      </p>
                    )}
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

                {selectedClaim.status === "PENDING" && (
                  <>
                    {!showRedirectForm ? (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm text-white/60">
                            Review Comment (optional)
                          </label>
                          <Textarea
                            placeholder="Add a note for the applicant..."
                            value={reviewComment}
                            onChange={(e) => setReviewComment(e.target.value)}
                            rows={3}
                            className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 focus:border-violet-500/50 focus:ring-violet-500/20 resize-none"
                          />
                        </div>

                        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-2">
                          {/* Manager can redirect employee claim to HOD */}
                          {user.role === "MANAGER" && !selectedClaim.isRedirected && (
                            <Button
                              onClick={() => setShowRedirectForm(true)}
                              disabled={isSubmitting}
                              variant="outline"
                              className="bg-indigo-500/10 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20"
                            >
                              <Share2 className="mr-2 h-4 w-4" />
                              Redirect to HOD
                            </Button>
                          )}

                          <Button
                            onClick={() => handleReview("REJECTED")}
                            disabled={isSubmitting}
                            variant="outline"
                            className="flex-1 bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-red-300"
                          >
                            {isSubmitting ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <XCircle className="mr-2 h-4 w-4" />
                                Reject
                              </>
                            )}
                          </Button>

                          <Button
                            onClick={() => handleReview("APPROVED")}
                            disabled={isSubmitting}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white border-0"
                          >
                            {isSubmitting ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Approve
                              </>
                            )}
                          </Button>
                        </DialogFooter>
                      </div>
                    ) : (
                      /* Redirection Sub-form */
                      <div className="space-y-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                        <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                          <Share2 className="h-4 w-4 text-indigo-400" />
                          Redirect Claim to HOD
                        </h4>

                        {hods.length > 0 && (
                          <div className="space-y-2">
                            <label className="text-xs text-white/60">
                              Target HOD (Optional - default HOD will be assigned if left blank)
                            </label>
                            <Select
                              value={selectedHodId}
                              onValueChange={(v) => setSelectedHodId(v ?? "")}
                            >
                              <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white h-10">
                                <SelectValue placeholder="Select specific HOD" />
                              </SelectTrigger>
                              <SelectContent className="bg-[#16162a] border-white/10">
                                {hods.map((h) => (
                                  <SelectItem
                                    key={h.id}
                                    value={h.id}
                                    className="text-white focus:bg-violet-500/20 focus:text-white"
                                  >
                                    {h.name} ({h.email})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        <div className="space-y-2">
                          <label className="text-xs text-white/60">
                            Reason for Redirection
                          </label>
                          <Textarea
                            placeholder="Reason for redirecting this bill to HOD (e.g. amount exceeds threshold, special approval required)..."
                            value={redirectReason}
                            onChange={(e) => setRedirectReason(e.target.value)}
                            rows={2}
                            className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 text-xs focus:border-violet-500/50 resize-none"
                          />
                        </div>

                        <div className="flex gap-2 justify-end pt-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowRedirectForm(false)}
                            className="text-white/60 hover:text-white"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleRedirect}
                            disabled={isSubmitting}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white"
                          >
                            {isSubmitting ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Confirm Redirection"
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {selectedClaim.status !== "PENDING" && (
                  <div className="space-y-2">
                    {selectedClaim.reviewer && (
                      <p className="text-xs text-white/40">
                        Reviewed by: <span className="text-white/70 font-medium">{selectedClaim.reviewer.name}</span>
                      </p>
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
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
