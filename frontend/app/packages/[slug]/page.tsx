"use client";

import { ArrowLeft, ArrowRight, PackageCheck, ShieldCheck, Star } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
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

export default function PublicPackageDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [packageItem, setPackageItem] = useState<MedicalPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadPackage = async () => {
      setLoading(true);
      setError("");

      try {
        const result = await apiRequest<MedicalPackage>(`/packages/${slug}`);
        if (active) setPackageItem(result);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Không tải được chi tiết gói khám");
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadPackage();

    return () => {
      active = false;
    };
  }, [slug]);

  const bookingUrl = useMemo(() => packageItem ? getBookingUrl(packageItem) : "/#booking", [packageItem]);

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-[#172033]">
      <header className="border-b border-[#dce3ee] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/packages" className="inline-flex items-center gap-2 text-sm font-semibold text-[#42526b] hover:text-[#0d4f8b]">
            <ArrowLeft className="h-4 w-4" />
            Danh sách gói khám
          </Link>
          <Link href={bookingUrl} className="inline-flex items-center gap-2 rounded-md bg-[#0d4f8b] px-4 py-2 text-sm font-semibold text-white hover:bg-[#083d6d]">
            Chọn gói
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {error ? <div className="rounded-md border border-[#f2b8b5] bg-[#fff3f2] px-4 py-3 text-sm text-[#b3261e]">{error}</div> : null}

        {loading ? (
          <PackageDetailSkeleton />
        ) : packageItem ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <article className="rounded-md border border-[#dce3ee] bg-white p-5 sm:p-6">
              <div className="flex flex-wrap gap-2">
                {packageItem.isPopular ? <span className="inline-flex items-center gap-1 rounded-md bg-[#fff4d6] px-2 py-1 text-xs font-semibold text-[#8a5a00]"><Star className="h-3.5 w-3.5" />Phổ biến</span> : null}
                {packageItem.isBHYTSupport ? <span className="inline-flex items-center gap-1 rounded-md bg-[#e7f6ed] px-2 py-1 text-xs font-semibold text-[#1f7a3a]"><ShieldCheck className="h-3.5 w-3.5" />Hỗ trợ BHYT</span> : null}
                {packageItem.department ? <span className="rounded-md bg-[#f1f5f9] px-2 py-1 text-xs font-semibold text-[#42526b]">{packageItem.department.name}</span> : null}
              </div>

              <h1 className="mt-4 text-4xl font-semibold">{packageItem.name}</h1>
              <p className="mt-4 text-sm leading-7 text-[#667892]">
                {packageItem.summary || packageItem.description || "Gói khám được thiết kế để giúp người bệnh chuẩn bị thông tin rõ ràng trước khi đặt lịch."}
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <PriceBox label="Tổng hạng mục" value={packageItem.basePrice} />
                <PriceBox label="Phí dịch vụ" value={packageItem.serviceFee} />
                <PriceBox label="Thành tiền" value={packageItem.finalPrice} highlight />
              </div>

              <section className="mt-8">
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <PackageCheck className="h-5 w-5 text-[#0d4f8b]" />
                  Hạng mục trong gói
                </div>
                <div className="mt-4 space-y-3">
                  {packageItem.items.length ? packageItem.items.map((item) => (
                    <div key={item.id} className="rounded-md border border-[#e5ebf3] bg-[#f8fafc] p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-semibold">{item.name}</p>
                          {item.description ? <p className="mt-1 text-sm leading-6 text-[#667892]">{item.description}</p> : null}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="whitespace-nowrap text-sm font-semibold text-[#172033]">{formatCurrency(item.price)}</span>
                          <span className={`inline-flex whitespace-nowrap rounded-md px-2 py-1 text-xs font-semibold ${item.included ? "bg-[#e7f6ed] text-[#1f7a3a]" : "bg-[#fff4d6] text-[#8a5a00]"}`}>
                            {item.included ? "Đã bao gồm" : "Tính riêng"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="rounded-md border border-dashed border-[#dce3ee] p-5 text-sm text-[#667892]">
                      Chưa có hạng mục chi tiết cho gói khám này.
                    </div>
                  )}
                </div>
              </section>

              {packageItem.note ? (
                <section className="mt-8 rounded-md border border-[#cfe4fa] bg-[#f3f8ff] p-4">
                  <p className="font-semibold text-[#0d4f8b]">Lưu ý</p>
                  <p className="mt-2 text-sm leading-6 text-[#42526b]">{packageItem.note}</p>
                </section>
              ) : null}
            </article>

            <aside className="h-fit rounded-md border border-[#dce3ee] bg-white p-5">
              <p className="text-sm font-semibold uppercase tracking-wide text-[#667892]">Tóm tắt</p>
              <p className="mt-3 text-3xl font-semibold text-[#0d4f8b]">{formatCurrency(packageItem.finalPrice)}</p>
              <div className="mt-4 space-y-2 text-sm text-[#667892]">
                <p>Chuyên khoa: <span className="font-semibold text-[#172033]">{packageItem.department?.name || "Đa chuyên khoa"}</span></p>
                <p>Hạng mục: <span className="font-semibold text-[#172033]">{packageItem.items.length}</span></p>
                <p>BHYT: <span className="font-semibold text-[#172033]">{packageItem.isBHYTSupport ? "Có hỗ trợ" : "Không áp dụng"}</span></p>
              </div>
              <Link href={bookingUrl} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#0d4f8b] px-4 py-3 text-sm font-semibold text-white hover:bg-[#083d6d]">
                Chọn gói và đặt lịch
                <ArrowRight className="h-4 w-4" />
              </Link>
              {packageItem.department?.slug ? (
                <Link href={`/departments/${packageItem.department.slug}`} className="mt-2 inline-flex w-full items-center justify-center rounded-md border border-[#cfd8e6] px-4 py-3 text-sm font-semibold text-[#42526b] hover:bg-[#f8fafc]">
                  Xem chuyên khoa
                </Link>
              ) : null}
            </aside>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function PriceBox({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-md border p-4 ${highlight ? "border-[#cfe4fa] bg-[#f3f8ff]" : "border-[#e5ebf3] bg-[#f8fafc]"}`}>
      <p className="text-sm text-[#667892]">{label}</p>
      <p className={`mt-2 text-xl font-semibold ${highlight ? "text-[#0d4f8b]" : "text-[#172033]"}`}>{formatCurrency(value)}</p>
    </div>
  );
}

function PackageDetailSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="rounded-md border border-[#dce3ee] bg-white p-6">
        <span className="skeleton-shimmer block h-6 w-32 rounded-md" />
        <span className="skeleton-shimmer mt-5 block h-10 w-2/3 rounded-md" />
        <span className="skeleton-shimmer mt-5 block h-20 w-full rounded-md" />
        <span className="skeleton-shimmer mt-6 block h-28 w-full rounded-md" />
        <span className="skeleton-shimmer mt-6 block h-56 w-full rounded-md" />
      </div>
      <div className="rounded-md border border-[#dce3ee] bg-white p-5">
        <span className="skeleton-shimmer block h-4 w-24 rounded-md" />
        <span className="skeleton-shimmer mt-4 block h-9 w-36 rounded-md" />
        <span className="skeleton-shimmer mt-4 block h-28 w-full rounded-md" />
      </div>
    </div>
  );
}
