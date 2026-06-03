"use client";

import { ArrowLeft, ArrowRight, PackageCheck, Search, ShieldCheck, Star } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api";
import type { MedicalPackage } from "@/lib/types";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value || 0);

const getBookingUrl = (item: MedicalPackage) => {
  const params = new URLSearchParams();

  if (item.department?.id) params.set("departmentId", item.department.id);
  params.set("packageId", item.id);

  return `/?${params.toString()}#booking`;
};

export default function PublicPackagesPage() {
  const [packages, setPackages] = useState<MedicalPackage[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"ALL" | "POPULAR" | "BHYT">("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadPackages = async () => {
      setLoading(true);
      setError("");

      try {
        const result = await apiRequest<MedicalPackage[]>("/packages", {
          query: {
            search: search.trim() || undefined,
            isPopular: filter === "POPULAR" ? true : undefined,
          },
        });

        const visible = filter === "BHYT" ? result.filter((item) => item.isBHYTSupport) : result;
        if (active) setPackages(visible);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Không tải được danh sách gói khám");
      } finally {
        if (active) setLoading(false);
      }
    };

    const timer = window.setTimeout(() => {
      void loadPackages();
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [filter, search]);

  const totalLabel = useMemo(() => {
    if (loading) return "Đang tải gói khám...";

    return `${packages.length} gói khám đang hiển thị`;
  }, [loading, packages.length]);

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-[#172033]">
      <header className="border-b border-[#dce3ee] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#42526b] hover:text-[#0d4f8b]">
            <ArrowLeft className="h-4 w-4" />
            Về trang chủ
          </Link>
          <Link href="/#booking" className="inline-flex items-center gap-2 rounded-md bg-[#0d4f8b] px-4 py-2 text-sm font-semibold text-white hover:bg-[#083d6d]">
            Đặt lịch
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-[#667892]">Gói khám</p>
            <h1 className="mt-2 text-4xl font-semibold">Chọn gói khám rõ chi phí trước khi đặt lịch</h1>
            <p className="mt-4 text-sm leading-6 text-[#667892]">
              Xem hạng mục, phí dịch vụ, hỗ trợ BHYT và chuyên khoa liên quan để chọn gói phù hợp.
            </p>
          </div>

          <div className="mt-6 grid gap-3 rounded-md border border-[#dce3ee] bg-[#f8fafc] p-4 lg:grid-cols-[minmax(0,1fr)_auto]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#667892]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm gói khám theo tên hoặc tóm tắt"
                className="w-full rounded-md border border-[#cfd8e6] bg-white py-3 pl-10 pr-3 text-sm outline-none focus:border-[#0d4f8b]"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                ["ALL", "Tất cả"],
                ["POPULAR", "Phổ biến"],
                ["BHYT", "Hỗ trợ BHYT"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value as typeof filter)}
                  className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
                    filter === value
                      ? "border-[#0d4f8b] bg-[#e7f0fb] text-[#0d4f8b]"
                      : "border-[#cfd8e6] bg-white text-[#42526b] hover:border-[#0d4f8b]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {error ? <div className="mb-4 rounded-md border border-[#f2b8b5] bg-[#fff3f2] px-4 py-3 text-sm text-[#b3261e]">{error}</div> : null}
        <p className="mb-4 text-sm text-[#667892]">{totalLabel}</p>

        <div className="grid gap-4 lg:grid-cols-3">
          {loading ? Array.from({ length: 6 }).map((_, index) => <PackageSkeleton key={index} />) : packages.length ? packages.map((item) => (
            <article key={item.id} className="rounded-md border border-[#dce3ee] bg-white p-5 transition hover:-translate-y-1 hover:shadow-lg">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{item.name}</h2>
                  <p className="mt-1 text-sm text-[#667892]">{item.department?.name || "Đa chuyên khoa"}</p>
                </div>
                {item.isPopular ? <span className="inline-flex items-center gap-1 rounded-md bg-[#fff4d6] px-2 py-1 text-xs font-semibold text-[#8a5a00]"><Star className="h-3.5 w-3.5" />Phổ biến</span> : null}
              </div>

              <p className="mt-4 line-clamp-3 text-sm leading-6 text-[#667892]">{item.summary || item.description || "Gói khám được thiết kế để tối ưu thời gian chuẩn bị và chi phí."}</p>

              <div className="mt-5 rounded-md bg-[#f8fafc] p-4">
                <p className="text-2xl font-semibold text-[#0d4f8b]">{formatCurrency(item.finalPrice)}</p>
                <div className="mt-2 grid gap-1 text-xs text-[#667892]">
                  <span>Giá gốc: {formatCurrency(item.basePrice)}</span>
                  <span>Phí dịch vụ: {formatCurrency(item.serviceFee)}</span>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                {item.isBHYTSupport ? <span className="inline-flex items-center gap-1 rounded-md bg-[#e7f6ed] px-2 py-1 text-[#1f7a3a]"><ShieldCheck className="h-3.5 w-3.5" />Hỗ trợ BHYT</span> : null}
                <span className="inline-flex items-center gap-1 rounded-md bg-[#f1f5f9] px-2 py-1 text-[#42526b]"><PackageCheck className="h-3.5 w-3.5" />{item.items.length} hạng mục</span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2">
                {item.slug ? (
                  <Link href={`/packages/${item.slug}`} className="rounded-md border border-[#cfd8e6] px-3 py-2.5 text-center text-sm font-semibold text-[#42526b] hover:bg-[#f8fafc]">
                    Chi tiết
                  </Link>
                ) : (
                  <span className="rounded-md border border-[#e5ebf3] px-3 py-2.5 text-center text-sm font-semibold text-[#94a3b8]">Chi tiết</span>
                )}
                <Link href={getBookingUrl(item)} className="rounded-md bg-[#0d4f8b] px-3 py-2.5 text-center text-sm font-semibold text-white hover:bg-[#083d6d]">
                  Chọn gói
                </Link>
              </div>
            </article>
          )) : (
            <div className="rounded-md border border-dashed border-[#dce3ee] bg-white p-8 text-center text-sm text-[#667892] lg:col-span-3">
              Chưa tìm thấy gói khám phù hợp.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function PackageSkeleton() {
  return (
    <article className="rounded-md border border-[#dce3ee] bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-3">
          <span className="skeleton-shimmer block h-5 w-2/3 rounded-md" />
          <span className="skeleton-shimmer block h-4 w-1/2 rounded-md" />
        </div>
        <span className="skeleton-shimmer block h-6 w-20 rounded-md" />
      </div>
      <div className="mt-5 space-y-3">
        <span className="skeleton-shimmer block h-4 w-full rounded-md" />
        <span className="skeleton-shimmer block h-4 w-11/12 rounded-md" />
        <span className="skeleton-shimmer block h-20 w-full rounded-md" />
        <span className="skeleton-shimmer block h-10 w-full rounded-md" />
      </div>
    </article>
  );
}
