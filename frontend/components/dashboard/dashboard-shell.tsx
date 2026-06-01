"use client";

/* eslint-disable @next/next/no-img-element */

import {
  Bot,
  Building2,
  CalendarCheck,
  CalendarClock,
  FileText,
  Hospital,
  Images,
  LayoutDashboard,
  LogOut,
  Moon,
  Package,
  Pill,
  Receipt,
  Settings,
  Stethoscope,
  Sun,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { DashboardChatbotWidget } from "@/components/dashboard/dashboard-chatbot-widget";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import type { DashboardRole, SiteSettingsValue } from "@/lib/types";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: DashboardRole[];
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Tổng quan", icon: LayoutDashboard, roles: ["ADMIN", "STAFF", "DOCTOR"] },
  { href: "/dashboard/departments", label: "Chuyên khoa", icon: Building2, roles: ["ADMIN", "STAFF", "DOCTOR"] },
  { href: "/dashboard/doctors", label: "Bác sĩ", icon: Stethoscope, roles: ["ADMIN", "STAFF", "DOCTOR"] },
  { href: "/dashboard/packages", label: "Gói khám", icon: Package, roles: ["ADMIN", "STAFF", "DOCTOR"] },
  { href: "/dashboard/schedules", label: "Lịch bác sĩ", icon: CalendarClock, roles: ["ADMIN", "STAFF", "DOCTOR"] },
  { href: "/dashboard/appointments", label: "Lịch hẹn", icon: CalendarCheck, roles: ["ADMIN", "STAFF", "DOCTOR"] },
  { href: "/dashboard/invoices", label: "Hoá đơn", icon: Receipt, roles: ["ADMIN", "STAFF"] },
  { href: "/dashboard/medical-records", label: "Hồ sơ khám", icon: FileText, roles: ["ADMIN", "STAFF", "DOCTOR"] },
  { href: "/dashboard/prescriptions", label: "Đơn thuốc", icon: Pill, roles: ["ADMIN", "STAFF", "DOCTOR"] },
  { href: "/dashboard/chatbot", label: "Chatbot", icon: Bot, roles: ["ADMIN", "STAFF"] },
  { href: "/dashboard/uploads", label: "Thư viện ảnh", icon: Images, roles: ["ADMIN", "STAFF"] },
  { href: "/dashboard/users", label: "Nhân sự", icon: Users, roles: ["ADMIN"] },
  { href: "/dashboard/site-settings", label: "Cấu hình website", icon: Settings, roles: ["ADMIN", "STAFF"] },
];

const roleLabel: Record<DashboardRole, string> = {
  ADMIN: "Quản trị",
  STAFF: "Nhân viên",
  DOCTOR: "Bác sĩ",
};

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [siteSettings, setSiteSettings] = useState<SiteSettingsValue | null>(null);
  const visibleItems = navItems.filter((item) => user && item.roles.includes(user.role));
  const ThemeIcon = theme === "dark" ? Sun : Moon;
  const hospitalName = siteSettings?.hospitalName?.trim() || "Hospital Booking";
  const logo = siteSettings?.logo?.trim();

  useEffect(() => {
    let active = true;

    void apiRequest<SiteSettingsValue>("/site-settings")
      .then((settings) => {
        if (active) setSiteSettings(settings);
      })
      .catch(() => {
        if (active) setSiteSettings(null);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-colors">
      <aside className="fixed inset-y-0 left-0 hidden w-68 border-r border-[var(--border)] bg-[var(--surface)] lg:block">
        <div className="flex h-18 items-center gap-3 border-b border-[var(--border-soft)] px-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[var(--primary-soft)] text-[var(--primary)]">
            {logo ? (
              <img src={logo} alt={hospitalName} className="h-full w-full object-contain p-1" />
            ) : (
              <Hospital className="h-5 w-5" aria-hidden="true" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
              Dashboard
            </p>
            <h1 className="truncate text-lg font-semibold" title={hospitalName}>{hospitalName}</h1>
          </div>
        </div>
        <nav className="space-y-1 px-3 py-4" aria-label="Điều hướng dashboard">
          {visibleItems.map((item) => {
            const active =
              item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-[var(--primary-soft)] text-[var(--primary)] shadow-[inset_3px_0_0_var(--primary)]"
                    : "text-[var(--text-soft)] hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)]"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="lg:pl-68">
        <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--surface)] backdrop-blur transition-colors">
          <div className="flex min-h-18 items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <div className="min-w-0">
              <p className="truncate text-sm text-[var(--text-muted)]">Hệ thống quản trị đặt lịch khám</p>
              <p className="truncate text-lg font-semibold" title={hospitalName}>{hospitalName}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold">{user?.fullName}</p>
                <p className="text-xs text-[var(--text-muted)]">
                  {user ? roleLabel[user.role] : "Đang tải"}
                </p>
              </div>
              <button
                type="button"
                onClick={toggleTheme}
                className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-sm font-medium text-[var(--text-soft)] hover:bg-[var(--surface-soft)]"
                aria-label={theme === "dark" ? "Chuyển sang nền sáng" : "Chuyển sang nền tối"}
                title={theme === "dark" ? "Chuyển sang nền sáng" : "Chuyển sang nền tối"}
              >
                <ThemeIcon className="h-4 w-4" aria-hidden="true" />
                <span>{theme === "dark" ? "Sáng" : "Tối"}</span>
              </button>
              <button
                onClick={() => void logout()}
                className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-sm font-medium text-[var(--text-soft)] hover:bg-[var(--surface-soft)]"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span>Đăng xuất</span>
              </button>
            </div>
          </div>
          <nav className="flex gap-2 overflow-x-auto border-t border-[var(--border-soft)] px-4 py-2 lg:hidden" aria-label="Điều hướng dashboard trên mobile">
            {visibleItems.map((item) => {
              const active =
                item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
                    active
                      ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                      : "text-[var(--text-soft)] hover:bg-[var(--surface-soft)]"
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </header>
        <main className="px-4 py-6 sm:px-6">{children}</main>
        <DashboardChatbotWidget />
      </div>
    </div>
  );
}
