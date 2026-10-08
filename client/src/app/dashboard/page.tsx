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
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  IndianRupee,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { getRoleHomePath } from "@/lib/navigation";

const statusConfig = {
  PENDING: {
    label: "Pending",
    icon: Clock,
    color: "bg-amber-500/15 text-amber-400 border-amber-500/25",
    iconColor: "text-amber-400",
    bgGlow: "from-amber-500/10 to-amber-500/5",
  },
  APPROVED: {
    label: "Approved",
    icon: CheckCircle2,
    color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
    iconColor: "text-emerald-400",
    bgGlow: "from-emerald-500/10 to-emerald-500/5",
  },
  REJECTED: {
    label: "Rejected",
    icon: XCircle,
    color: "bg-red-500/15 text-red-400 border-red-500/25",
    iconColor: "text-red-400",
    bgGlow: "from-red-500/10 to-red-500/5",
  },
};

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [subordinateClaims, setSubordinateClaims] = useState<Claim[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const isManager = user
    ? ["MANAGER", "HOD", "FINANCE"].includes(user.role)
    : false;

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    if (["FINANCE_ADMIN", "SUPERADMIN"].includes(user.role)) {
      router.replace(getRoleHomePath(user.role));
      return;
    }

    const fetchData = async () => {
      try {
        const [myClaimsRes, ...rest] = await Promise.all([
          claimsAPI.getMyClaims(),
          ...(isManager ? [claimsAPI.getSubordinateClaims()] : []),
        ]);
        setClaims(myClaimsRes.data.claims);
        if (rest[0]) setSubordinateClaims(rest[0].data.claims);
      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, authLoading, isManager, router]);

  if (
    authLoading ||
    !user ||
    ["FINANCE_ADMIN", "SUPERADMIN"].includes(user.role)
  ) {
    return null;
  }

  const totalAmount = claims.reduce((sum, c) => sum + c.amount, 0);
  const approvedAmount = claims
    .filter((c) => c.status === "APPROVED")
    .reduce((sum, c) => sum + c.amount, 0);
  const pendingCount = claims.filter((c) => c.status === "PENDING").length;
  const pendingReview = subordinateClaims.filter(
    (c) => c.status === "PENDING"
  ).length;

  const stats = [
    {
      title: "Total Claims",
      value: claims.length,
      icon: FileText,
      description: "All time submissions",
      gradient: "from-violet-500 to-indigo-500",
      iconBg: "bg-violet-500/15",
      iconColor: "text-violet-400",
    },
    {
      title: "Total Amount",
      value: `₹${totalAmount.toLocaleString("en-IN")}`,
      icon: IndianRupee,
      description: "Submitted for reimbursement",
      gradient: "from-blue-500 to-cyan-500",
      iconBg: "bg-blue-500/15",
      iconColor: "text-blue-400",
    },
    {
      title: "Approved",
      value: `₹${approvedAmount.toLocaleString("en-IN")}`,
      icon: TrendingUp,
      description: `${claims.filter((c) => c.status === "APPROVED").length} claims approved`,
      gradient: "from-emerald-500 to-green-500",
      iconBg: "bg-emerald-500/15",
      iconColor: "text-emerald-400",
    },
    {
      title: "Pending",
      value: pendingCount,
      icon: Clock,
      description: "Awaiting review",
      gradient: "from-amber-500 to-orange-500",
      iconBg: "bg-amber-500/15",
      iconColor: "text-amber-400",
    },
  ];

  const recentClaims = claims.slice(0, 5);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">
            Welcome back, {user.name.split(" ")[0]}
          </h1>
          <p className="text-white/40 text-sm mt-1">
            Here&apos;s an overview of your reimbursement activity
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card
              key={stat.title}
              className="bg-[#12121e]/60 backdrop-blur-sm border-white/[0.06] hover:border-white/[0.12] transition-all duration-300 group"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-white/40 uppercase tracking-wider">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold text-white mt-2">
                      {isLoading ? "—" : stat.value}
                    </p>
                    <p className="text-xs text-white/30 mt-1">
                      {stat.description}
                    </p>
                  </div>
                  <div
                    className={`h-10 w-10 rounded-xl ${stat.iconBg} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}
                  >
                    <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Manager: Pending Reviews Alert */}
        {isManager && pendingReview > 0 && (
          <Card className="bg-gradient-to-r from-violet-500/10 to-indigo-500/10 border-violet-500/20">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-violet-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">
                    {pendingReview} claim{pendingReview > 1 ? "s" : ""} awaiting
                    your review
                  </p>
                  <p className="text-xs text-white/40">
                    Subordinate reimbursement requests need your attention
                  </p>
                </div>
              </div>
              <button
                onClick={() => router.push("/dashboard/review")}
                className="px-4 py-2 rounded-lg bg-violet-500/20 text-violet-300 text-sm font-medium hover:bg-violet-500/30 transition-colors cursor-pointer"
              >
                Review now
              </button>
            </CardContent>
          </Card>
        )}

        {/* Recent Claims */}
        <Card className="bg-[#12121e]/60 backdrop-blur-sm border-white/[0.06]">
          <CardHeader>
            <CardTitle className="text-lg text-white">
              Recent Claims
            </CardTitle>
            <CardDescription className="text-white/40">
              Your latest reimbursement submissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-white/30">Loading...</div>
            ) : recentClaims.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-10 w-10 text-white/15 mx-auto mb-3" />
                <p className="text-white/30 text-sm">
                  No claims yet. Submit your first reimbursement claim!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentClaims.map((claim) => {
                  const config = statusConfig[claim.status];
                  const StatusIcon = config.icon;
                  return (
                    <div
                      key={claim.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-all duration-200"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`h-9 w-9 rounded-lg bg-gradient-to-br ${config.bgGlow} flex items-center justify-center`}
                        >
                          <StatusIcon
                            className={`h-4 w-4 ${config.iconColor}`}
                          />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">
                            {claim.title}
                          </p>
                          <p className="text-xs text-white/30">
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
      </div>
    </DashboardLayout>
  );
}
