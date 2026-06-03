"use client";

/* eslint-disable @next/next/no-img-element */

import { ArrowLeft, ArrowRight, Clock, Search, Stethoscope } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api";
import type { DoctorProfile } from "@/lib/types";
import type { PublicDepartment } from "@/components/public/public-home-types";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value || 0);

const doctorName = (doctor: DoctorProfile) =>
  [doctor.title, doctor.user.fullName].filter(Boolean).join(" ");

const firstLetter = (value: string) => value.trim().slice(0, 1).toUpperCase() || "B";

const getInitialDepartmentId = () => {
  if (typeof window === "undefined") return "";

  return new URLSearchParams(window.location.search).get("departmentId") || "";
};

export default function PublicDoctorsPage() {
  const [departments, setDepartments] = useState<PublicDepartment[]>([]);
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [departmentId, setDepartmentId] = useState(getInitialDepartmentId);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadDepartments = async () => {
      try {
        const result = await apiRequest<PublicDepartment[]>("/departments");
        if (active) setDepartments(result);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Không tải được chuyên khoa");
      }
    };

    void loadDepartments();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadDoctors = async () => {
      setLoading(true);
      setError("");

      try {
        const result = await apiRequest<DoctorProfile[]>("/doctors", {
          query: {
            search: search.trim() || undefined,
            departmentId: departmentId || undefined,
          },
        });

        if (active) setDoctors(result);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Không tải được danh sách bác sĩ");
      } finally {
        if (active) setLoading(false);
      }
    };

    const timer = window.setTimeout(() => {
      void loadDoctors();
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [departmentId, search]);

  const selectedDepartment = useMemo(
    () => departments.find((item) => item.id === departmentId),
    [departmentId, departments],
  );

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
            <p className="text-sm font-semibold uppercase tracking-wide text-[#667892]">Đội ngũ bác sĩ</p>
            <h1 className="mt-2 text-4xl font-semibold">Chọn bác sĩ phù hợp với nhu cầu khám</h1>
            <p className="mt-4 text-sm leading-6 text-[#667892]">
              Tìm theo tên, chuyên môn hoặc lọc theo chuyên khoa. Khi chọn bác sĩ, bạn có thể xem lịch trống và chuyển thẳng về form đặt lịch.
            </p>
          </div>

          <div className="mt-6 grid gap-3 rounded-md border border-[#dce3ee] bg-[#f8fafc] p-4 md:grid-cols-[minmax(0,1fr)_260px]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#667892]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm bác sĩ, chuyên môn hoặc chuyên khoa"
                className="w-full rounded-md border border-[#cfd8e6] bg-white py-3 pl-10 pr-3 text-sm outline-none focus:border-[#0d4f8b]"
              />
            </label>
            <select
              value={departmentId}
              onChange={(event) => setDepartmentId(event.target.value)}
              className="rounded-md border border-[#cfd8e6] bg-white px-3 py-3 text-sm outline-none focus:border-[#0d4f8b]"
            >
              <option value="">Tất cả chuyên khoa</option>
              {departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {error ? <div className="mb-4 rounded-md border border-[#f2b8b5] bg-[#fff3f2] px-4 py-3 text-sm text-[#b3261e]">{error}</div> : null}

        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-sm text-[#667892]">
            {loading ? "Đang tải bác sĩ..." : `${doctors.length} bác sĩ${selectedDepartment ? ` thuộc ${selectedDepartment.name}` : ""}`}
          </p>
          {(search || departmentId) ? (
            <button type="button" onClick={() => { setSearch(""); setDepartmentId(""); }} className="text-sm font-semibold text-[#0d4f8b]">
              Xóa lọc
            </button>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {loading ? Array.from({ length: 6 }).map((_, index) => <DoctorSkeleton key={index} />) : doctors.length ? doctors.map((doctor) => (
            <article key={doctor.id} className="rounded-md border border-[#dce3ee] bg-white p-4 transition hover:-translate-y-1 hover:shadow-lg">
              <div className="flex items-start gap-4">
                {doctor.user.avatar ? (
                  <img src={doctor.user.avatar} alt={doctor.user.fullName} className="h-20 w-20 shrink-0 rounded-md object-cover" />
                ) : (
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md bg-[#e7f0fb] text-2xl font-semibold text-[#0d4f8b]">
                    {firstLetter(doctor.user.fullName)}
                  </div>
                )}
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold">{doctorName(doctor)}</h2>
                  <p className="mt-1 text-sm text-[#667892]">{doctor.department.name}</p>
                  <p className="mt-3 font-semibold text-[#0d4f8b]">{formatCurrency(doctor.consultationFee)}</p>
                </div>
              </div>
              <div className="mt-4 space-y-2 text-sm text-[#667892]">
                <p className="flex items-center gap-2"><Stethoscope className="h-4 w-4 text-[#0d4f8b]" />{doctor.specialization || "Khám chuyên khoa"}</p>
                <p className="flex items-center gap-2"><Clock className="h-4 w-4 text-[#0d4f8b]" />{doctor.experience || 0} năm kinh nghiệm</p>
              </div>
              <p className="mt-4 line-clamp-3 text-sm leading-6 text-[#667892]">{doctor.bio || "Bác sĩ đang tiếp nhận lịch khám và tư vấn theo chuyên khoa."}</p>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <Link href={`/doctors/${doctor.id}`} className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-[#cfd8e6] px-4 py-2.5 text-sm font-semibold text-[#42526b] hover:bg-[#f8fafc]">
                  Xem chi tiết
                </Link>
                <Link href={`/?departmentId=${doctor.department.id}&doctorId=${doctor.id}#booking`} className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-[#0d4f8b] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#083d6d]">
                  Đặt lịch
                </Link>
              </div>
            </article>
          )) : (
            <div className="rounded-md border border-dashed border-[#dce3ee] bg-white p-8 text-center text-sm text-[#667892] sm:col-span-2 xl:col-span-3">
              Chưa tìm thấy bác sĩ phù hợp.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function DoctorSkeleton() {
  return (
    <article className="rounded-md border border-[#dce3ee] bg-white p-4">
      <div className="flex items-start gap-4">
        <span className="skeleton-shimmer h-20 w-20 shrink-0 rounded-md" />
        <div className="flex-1 space-y-3">
          <span className="skeleton-shimmer block h-5 w-2/3 rounded-md" />
          <span className="skeleton-shimmer block h-4 w-1/2 rounded-md" />
          <span className="skeleton-shimmer block h-5 w-28 rounded-md" />
        </div>
      </div>
      <div className="mt-5 space-y-3">
        <span className="skeleton-shimmer block h-4 w-full rounded-md" />
        <span className="skeleton-shimmer block h-4 w-5/6 rounded-md" />
        <span className="skeleton-shimmer block h-10 w-full rounded-md" />
      </div>
    </article>
  );
}
