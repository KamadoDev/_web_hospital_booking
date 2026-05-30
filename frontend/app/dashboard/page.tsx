"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";

const workItems = [
  {
    title: "Du lieu nen",
    description: "Quan ly chuyen khoa, bac si va goi kham truoc khi mo lich hen.",
    href: "/dashboard/departments",
    cta: "Mo chuyen khoa",
  },
  {
    title: "Lich va slot kham",
    description: "Tao lich lam viec, sinh slot, khoa hoac mo slot theo ngay.",
    href: "/dashboard/schedules",
    cta: "Chuan bi tiep",
  },
  {
    title: "Van hanh lich hen",
    description: "Xac nhan, check-in, bat dau kham va hoan tat lich hen.",
    href: "/dashboard/appointments",
    cta: "Chuan bi tiep",
  },
];

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <section className="rounded-md border border-[#dce3ee] bg-white p-6">
        <p className="text-sm font-medium text-[#55708f]">Xin chao, {user?.fullName}</p>
        <h2 className="mt-2 text-2xl font-semibold text-[#172033]">
          Bat dau tu nhom API nen cua dashboard
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#667892]">
          Khung auth, phan quyen va layout da san sang. Module chuyen khoa la mau CRUD dau tien;
          cac man bac si, goi kham, lich va slot se duoc mo rong theo cung pattern nay.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {workItems.map((item) => (
          <div key={item.title} className="rounded-md border border-[#dce3ee] bg-white p-5">
            <h3 className="text-base font-semibold">{item.title}</h3>
            <p className="mt-2 min-h-16 text-sm leading-6 text-[#667892]">{item.description}</p>
            <Link
              href={item.href}
              className="mt-4 inline-flex rounded-md bg-[#0d4f8b] px-3 py-2 text-sm font-medium text-white hover:bg-[#083d6d]"
            >
              {item.cta}
            </Link>
          </div>
        ))}
      </section>
    </div>
  );
}
