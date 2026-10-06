"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  FileText,
  LogOut,
  ClipboardCheck,
  Receipt,
  User,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const roleColors: Record<string, string> = {
  EMPLOYEE: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  MANAGER: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  HOD: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  FINANCE: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  SUPERADMIN: "bg-rose-500/20 text-rose-400 border-rose-500/30",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  if (!user) {
    return null;
  }

  const isManager = ["MANAGER", "HOD", "FINANCE", "SUPERADMIN"].includes(
    user.role
  );

  const navItems = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      label: "My Claims",
      href: "/dashboard/claims",
      icon: FileText,
    },
    {
      label: "Submit Claim",
      href: "/dashboard/claims/new",
      icon: Receipt,
    },
    ...(isManager
      ? [
          {
            label: "Review Claims",
            href: "/dashboard/review",
            icon: ClipboardCheck,
          },
        ]
      : []),
  ];

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex">
      {/* Sidebar */}
      <aside className="w-72 bg-[#0f0f18]/80 backdrop-blur-xl border-r border-white/[0.06] flex flex-col fixed h-full z-20">
        {/* Logo */}
        <div className="p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Receipt className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">
                ReimburseFlow
              </h1>
              <p className="text-[11px] text-white/40 font-medium uppercase tracking-wider">
                Platform
              </p>
            </div>
          </div>
        </div>

        <Separator className="bg-white/[0.06]" />

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
                    isActive
                      ? "bg-gradient-to-r from-violet-500/15 to-indigo-500/10 text-white border border-violet-500/20 shadow-sm"
                      : "text-white/50 hover:text-white/80 hover:bg-white/[0.04]"
                  }`}
                >
                  <item.icon
                    className={`h-[18px] w-[18px] ${
                      isActive
                        ? "text-violet-400"
                        : "text-white/40 group-hover:text-white/60"
                    }`}
                  />
                  {item.label}
                  {isActive && (
                    <div className="ml-auto h-1.5 w-1.5 rounded-full bg-violet-400 shadow-sm shadow-violet-400/50" />
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-white/[0.06]">
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.04] transition-all duration-200 cursor-pointer">
                <Avatar className="h-9 w-9 border border-white/10">
                  <AvatarFallback className="bg-gradient-to-br from-violet-500/30 to-indigo-600/30 text-white text-xs font-bold">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {user.name}
                  </p>
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 h-4 font-semibold border ${
                      roleColors[user.role] || ""
                    }`}
                  >
                    {user.role}
                  </Badge>
                </div>
                <ChevronDown className="h-4 w-4 text-white/30" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 bg-[#16162a] border-white/10"
            >
              <div className="px-3 py-2">
                <p className="text-sm font-medium text-white">{user.name}</p>
                <p className="text-xs text-white/40">{user.email}</p>
              </div>
              <DropdownMenuSeparator className="bg-white/[0.06]" />
              <DropdownMenuItem
                onClick={logout}
                className="text-red-400 focus:text-red-400 focus:bg-red-500/10 cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-72">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
