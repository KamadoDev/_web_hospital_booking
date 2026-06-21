"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { useAuth } from "@/lib/auth";
import type { DashboardRole } from "@/lib/types";

const roleRoutes: Record<DashboardRole, string[]> = {
  ADMIN: [
    "/dashboard",
    "/dashboard/appointments",
    "/dashboard/chatbot",
    "/dashboard/consultation-requests",
    "/dashboard/reviews",
    "/dashboard/departments",
    "/dashboard/doctors",
    "/dashboard/invoices",
    "/dashboard/medical-records",
    "/dashboard/packages",
    "/dashboard/prescriptions",
    "/dashboard/schedules",
    "/dashboard/site-settings",
    "/dashboard/uploads",
    "/dashboard/users",
  ],
  STAFF: [
    "/dashboard",
    "/dashboard/appointments",
    "/dashboard/chatbot",
    "/dashboard/consultation-requests",
    "/dashboard/reviews",
    "/dashboard/departments",
    "/dashboard/doctors",
    "/dashboard/invoices",
    "/dashboard/medical-records",
    "/dashboard/packages",
    "/dashboard/prescriptions",
    "/dashboard/schedules",
    "/dashboard/site-settings",
    "/dashboard/uploads",
  ],
  DOCTOR: [
    "/dashboard",
    "/dashboard/appointments",
    "/dashboard/medical-records",
    "/dashboard/prescriptions",
    "/dashboard/reviews",
    "/dashboard/schedules",
  ],
};

const canAccessPath = (role: DashboardRole, pathname: string) =>
  roleRoutes[role].some((route) =>
    route === "/dashboard" ? pathname === route : pathname === route || pathname.startsWith(`${route}/`),
  );

export function DashboardAuthLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, router, user]);

  useEffect(() => {
    if (!loading && user && !canAccessPath(user.role, pathname)) {
      router.replace("/dashboard");
    }
  }, [loading, pathname, router, user]);

  if (loading || !user || !canAccessPath(user.role, pathname)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f8fb] text-sm text-[#667892]">
        Đang tải dashboard...
      </div>
    );
  }

  return <DashboardShell>{children}</DashboardShell>;
}
