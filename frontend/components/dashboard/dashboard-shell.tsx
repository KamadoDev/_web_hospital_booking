"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import type { DashboardRole } from "@/lib/types";

type NavItem = {
  href: string;
  label: string;
  roles: DashboardRole[];
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Tong quan", roles: ["ADMIN", "STAFF", "DOCTOR"] },
  { href: "/dashboard/departments", label: "Chuyen khoa", roles: ["ADMIN", "STAFF", "DOCTOR"] },
  { href: "/dashboard/doctors", label: "Bac si", roles: ["ADMIN", "STAFF", "DOCTOR"] },
  { href: "/dashboard/packages", label: "Goi kham", roles: ["ADMIN", "STAFF", "DOCTOR"] },
  { href: "/dashboard/schedules", label: "Lich bac si", roles: ["ADMIN", "STAFF", "DOCTOR"] },
  { href: "/dashboard/appointments", label: "Lich hen", roles: ["ADMIN", "STAFF", "DOCTOR"] },
  { href: "/dashboard/invoices", label: "Hoa don", roles: ["ADMIN", "STAFF"] },
  { href: "/dashboard/medical-records", label: "Ho so kham", roles: ["ADMIN", "STAFF", "DOCTOR"] },
  { href: "/dashboard/prescriptions", label: "Don thuoc", roles: ["ADMIN", "STAFF", "DOCTOR"] },
  { href: "/dashboard/chatbot", label: "Chatbot", roles: ["ADMIN", "STAFF"] },
  { href: "/dashboard/users", label: "Nhan su", roles: ["ADMIN"] },
];

const roleLabel: Record<DashboardRole, string> = {
  ADMIN: "Quan tri",
  STAFF: "Nhan vien",
  DOCTOR: "Bac si",
};

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const visibleItems = navItems.filter((item) => user && item.roles.includes(user.role));

  return (
    <div className="min-h-screen bg-[#f6f8fb] text-[#172033]">
      <aside className="fixed inset-y-0 left-0 hidden w-68 border-r border-[#dce3ee] bg-white lg:block">
        <div className="flex h-18 items-center border-b border-[#e5ebf3] px-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[#55708f]">
              Hospital
            </p>
            <h1 className="text-xl font-semibold">Dashboard</h1>
          </div>
        </div>
        <nav className="space-y-1 px-3 py-4">
          {visibleItems.map((item) => {
            const active =
              item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-md px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-[#e7f0fb] text-[#0d4f8b]"
                    : "text-[#42526b] hover:bg-[#f1f5f9] hover:text-[#172033]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="lg:pl-68">
        <header className="sticky top-0 z-20 border-b border-[#dce3ee] bg-white/95 backdrop-blur">
          <div className="flex min-h-18 items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <div>
              <p className="text-sm text-[#667892]">He thong quan tri dat lich kham</p>
              <p className="text-lg font-semibold">Van hanh phong kham</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold">{user?.fullName}</p>
                <p className="text-xs text-[#667892]">
                  {user ? roleLabel[user.role] : "Dang tai"}
                </p>
              </div>
              <button
                onClick={() => void logout()}
                className="rounded-md border border-[#cfd8e6] bg-white px-3 py-2 text-sm font-medium text-[#42526b] hover:bg-[#f6f8fb]"
              >
                Dang xuat
              </button>
            </div>
          </div>
          <nav className="flex gap-2 overflow-x-auto border-t border-[#eef2f7] px-4 py-2 lg:hidden">
            {visibleItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 rounded-md px-3 py-2 text-sm font-medium ${
                  pathname === item.href || pathname.startsWith(`${item.href}/`)
                    ? "bg-[#e7f0fb] text-[#0d4f8b]"
                    : "text-[#42526b]"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
