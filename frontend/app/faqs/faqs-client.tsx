"use client";

import { ArrowLeft, ArrowRight, HelpCircle, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { usePublicFAQs } from "@/lib/public-faq-query";
import type { PublicFAQ } from "@/lib/types";

const categories = [
  { value: "", label: "Tất cả" },
  { value: "booking", label: "Đặt lịch" },
  { value: "payment", label: "Thanh toán" },
  { value: "doctor", label: "Bác sĩ" },
  { value: "insurance", label: "BHYT" },
  { value: "general", label: "Chung" },
];

export function FAQsClient({ initialFAQs, initialCategory = "" }: { initialFAQs: PublicFAQ[]; initialCategory?: string }) {
  const [category, setCategory] = useState(initialCategory);
  const [search, setSearch] = useState("");
  const faqsQuery = usePublicFAQs(category, initialFAQs, initialCategory);
  const faqs = useMemo(() => faqsQuery.data || [], [faqsQuery.data]);
  const loading = faqsQuery.isLoading;
  const error = faqsQuery.error instanceof Error ? faqsQuery.error.message : "";

  const visibleFAQs = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return faqs;

    return faqs.filter((item) =>
      `${item.question} ${item.answer} ${item.category || ""}`.toLowerCase().includes(keyword),
    );
  }, [faqs, search]);

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-[#172033]">
      <header className="border-b border-[#dce3ee] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#42526b] hover:text-[#0d4f8b]">
            <ArrowLeft className="h-4 w-4" />
            Về trang chủ
          </Link>
          <Link href="/guide/booking" className="inline-flex items-center gap-2 rounded-md bg-[#0d4f8b] px-4 py-2 text-sm font-semibold text-white hover:bg-[#083d6d]">
            Hướng dẫn đặt lịch
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-[#667892]">Hỏi đáp</p>
            <h1 className="mt-2 text-4xl font-semibold">Câu hỏi thường gặp</h1>
            <p className="mt-4 text-sm leading-6 text-[#667892]">
              Tìm nhanh các câu hỏi về đặt lịch, bác sĩ, thanh toán, bảo hiểm và quy trình khám.
            </p>
          </div>

          <div className="mt-6 grid gap-3 rounded-md border border-[#dce3ee] bg-[#f8fafc] p-4 lg:grid-cols-[minmax(0,1fr)_auto]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#667892]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm theo câu hỏi hoặc nội dung trả lời"
                className="w-full rounded-md border border-[#cfd8e6] bg-white py-3 pl-10 pr-3 text-sm outline-none focus:border-[#0d4f8b]"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map((item) => (
                <button
                  key={item.value || "all"}
                  type="button"
                  onClick={() => setCategory(item.value)}
                  className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
                    category === item.value
                      ? "border-[#0d4f8b] bg-[#e7f0fb] text-[#0d4f8b]"
                      : "border-[#cfd8e6] bg-white text-[#42526b] hover:border-[#0d4f8b]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-8">
        <div>
          {error ? <div className="mb-4 rounded-md border border-[#f2b8b5] bg-[#fff3f2] px-4 py-3 text-sm text-[#b3261e]">{error}</div> : null}
          <p className="mb-4 text-sm text-[#667892]">{loading ? "Đang tải câu hỏi..." : `${visibleFAQs.length} câu hỏi đang hiển thị`}</p>

          <div className="space-y-3">
            {loading ? Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="rounded-md border border-[#dce3ee] bg-white p-4">
                <span className="skeleton-shimmer block h-5 w-3/4 rounded-md" />
                <span className="skeleton-shimmer mt-4 block h-4 w-full rounded-md" />
                <span className="skeleton-shimmer mt-2 block h-4 w-5/6 rounded-md" />
              </div>
            )) : visibleFAQs.length ? visibleFAQs.map((item) => (
              <details key={item.id} className="rounded-md border border-[#dce3ee] bg-white p-4 transition hover:border-[#0d4f8b]">
                <summary className="cursor-pointer font-semibold">{item.question}</summary>
                <p className="mt-3 text-sm leading-7 text-[#667892]">{item.answer}</p>
                {item.category ? <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">{item.category}</p> : null}
              </details>
            )) : (
              <div className="rounded-md border border-dashed border-[#dce3ee] bg-white p-8 text-center text-sm text-[#667892]">
                Chưa tìm thấy câu hỏi phù hợp.
              </div>
            )}
          </div>
        </div>

        <aside className="h-fit rounded-md border border-[#dce3ee] bg-white p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#172033]">
            <HelpCircle className="h-4 w-4 text-[#0d4f8b]" />
            Cần thao tác nhanh?
          </div>
          <div className="mt-4 space-y-2">
            <Link href="/#booking" className="block rounded-md bg-[#0d4f8b] px-4 py-3 text-center text-sm font-semibold text-white hover:bg-[#083d6d]">
              Đặt lịch khám
            </Link>
            <Link href="/appointments/lookup" className="block rounded-md border border-[#cfd8e6] px-4 py-3 text-center text-sm font-semibold text-[#42526b] hover:bg-[#f8fafc]">
              Tra cứu lịch hẹn
            </Link>
            <Link href="/guide/booking" className="block rounded-md border border-[#cfd8e6] px-4 py-3 text-center text-sm font-semibold text-[#42526b] hover:bg-[#f8fafc]">
              Xem hướng dẫn đặt lịch
            </Link>
          </div>
        </aside>
      </section>
    </main>
  );
}
