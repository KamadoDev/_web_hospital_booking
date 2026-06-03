"use client";

/* eslint-disable @next/next/no-img-element */

import { ArrowLeft, CalendarDays, Clock, Loader2, Stethoscope } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api";
import type { DoctorProfile } from "@/lib/types";

type PublicSlot = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
};

const today = () => {
  const date = new Date();
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);

  return offsetDate.toISOString().slice(0, 10);
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value || 0);

const doctorName = (doctor: DoctorProfile) =>
  [doctor.title, doctor.user.fullName].filter(Boolean).join(" ");

const firstLetter = (value: string) => value.trim().slice(0, 1).toUpperCase() || "B";
const formatTime = (value: string) => value.slice(0, 5);

export default function PublicDoctorDetailPage() {
  const params = useParams<{ id: string }>();
  const doctorId = params.id;
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [slots, setSlots] = useState<PublicSlot[]>([]);
  const [date, setDate] = useState(today());
  const [loadingDoctor, setLoadingDoctor] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState("");
  const [slotError, setSlotError] = useState("");

  useEffect(() => {
    let active = true;

    const loadDoctor = async () => {
      setLoadingDoctor(true);
      setError("");

      try {
        const result = await apiRequest<DoctorProfile>(`/doctors/${doctorId}`);
        if (active) setDoctor(result);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Không tải được thông tin bác sĩ");
      } finally {
        if (active) setLoadingDoctor(false);
      }
    };

    void loadDoctor();

    return () => {
      active = false;
    };
  }, [doctorId]);

  useEffect(() => {
    let active = true;

    const loadSlots = async () => {
      setLoadingSlots(true);
      setSlotError("");

      try {
        const result = await apiRequest<PublicSlot[]>(`/doctors/${doctorId}/available-slots`, {
          query: { date },
        });
        if (active) setSlots(result);
      } catch (err) {
        if (active) {
          setSlots([]);
          setSlotError(err instanceof Error ? err.message : "Không tải được khung giờ khám");
        }
      } finally {
        if (active) setLoadingSlots(false);
      }
    };

    void loadSlots();

    return () => {
      active = false;
    };
  }, [date, doctorId]);

  const bookingUrl = useMemo(() => {
    if (!doctor) return "/#booking";

    return `/?departmentId=${doctor.department.id}&doctorId=${doctor.id}#booking`;
  }, [doctor]);

  const getSlotBookingUrl = (slot: PublicSlot) => {
    if (!doctor) return "/#booking";

    return `/?departmentId=${doctor.department.id}&doctorId=${doctor.id}&date=${slot.date}&timeSlotId=${slot.id}#booking`;
  };

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-[#172033]">
      <header className="border-b border-[#dce3ee] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/doctors" className="inline-flex items-center gap-2 text-sm font-semibold text-[#42526b] hover:text-[#0d4f8b]">
            <ArrowLeft className="h-4 w-4" />
            Danh sách bác sĩ
          </Link>
          <Link href={bookingUrl} className="inline-flex items-center gap-2 rounded-md bg-[#0d4f8b] px-4 py-2 text-sm font-semibold text-white hover:bg-[#083d6d]">
            Đặt lịch
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {error ? <div className="rounded-md border border-[#f2b8b5] bg-[#fff3f2] px-4 py-3 text-sm text-[#b3261e]">{error}</div> : null}

        {loadingDoctor ? (
          <DoctorDetailSkeleton />
        ) : doctor ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <article className="rounded-md border border-[#dce3ee] bg-white p-5">
              <div className="flex flex-col gap-5 sm:flex-row">
                {doctor.user.avatar ? (
                  <img src={doctor.user.avatar} alt={doctor.user.fullName} className="h-36 w-36 rounded-md object-cover" />
                ) : (
                  <div className="flex h-36 w-36 shrink-0 items-center justify-center rounded-md bg-[#e7f0fb] text-5xl font-semibold text-[#0d4f8b]">
                    {firstLetter(doctor.user.fullName)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold uppercase tracking-wide text-[#667892]">{doctor.department.name}</p>
                  <h1 className="mt-2 text-3xl font-semibold">{doctorName(doctor)}</h1>
                  <div className="mt-4 flex flex-wrap gap-2 text-sm text-[#667892]">
                    <span className="inline-flex items-center gap-2 rounded-md bg-[#f1f5f9] px-3 py-2">
                      <Stethoscope className="h-4 w-4 text-[#0d4f8b]" />
                      {doctor.specialization || "Khám chuyên khoa"}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-md bg-[#f1f5f9] px-3 py-2">
                      <Clock className="h-4 w-4 text-[#0d4f8b]" />
                      {doctor.experience || 0} năm kinh nghiệm
                    </span>
                  </div>
                  <p className="mt-5 text-2xl font-semibold text-[#0d4f8b]">{formatCurrency(doctor.consultationFee)}</p>
                </div>
              </div>

              <div className="mt-6 border-t border-[#e5ebf3] pt-5">
                <h2 className="text-lg font-semibold">Giới thiệu</h2>
                <p className="mt-3 text-sm leading-7 text-[#667892]">
                  {doctor.bio || "Bác sĩ đang tiếp nhận lịch khám và tư vấn theo chuyên khoa. Bạn có thể chọn ngày để xem khung giờ trống trước khi đặt lịch."}
                </p>
              </div>
            </article>

            <aside className="rounded-md border border-[#dce3ee] bg-white p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#172033]">
                <CalendarDays className="h-4 w-4 text-[#0d4f8b]" />
                Lịch trống theo ngày
              </div>
              <input
                type="date"
                min={today()}
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="mt-4 w-full rounded-md border border-[#cfd8e6] px-3 py-2.5 text-sm outline-none focus:border-[#0d4f8b]"
              />

              {slotError ? <div className="mt-3 rounded-md border border-[#f2b8b5] bg-[#fff3f2] px-3 py-2 text-sm text-[#b3261e]">{slotError}</div> : null}

              <div className="mt-4 min-h-20 space-y-2">
                {loadingSlots ? (
                  <div className="flex items-center gap-2 text-sm text-[#667892]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang tải khung giờ
                  </div>
                ) : slots.length ? slots.map((slot) => (
                  <Link
                    key={slot.id}
                    href={getSlotBookingUrl(slot)}
                    className="flex items-center justify-between rounded-md border border-[#cfd8e6] px-3 py-2.5 text-sm font-semibold text-[#42526b] transition hover:border-[#0d4f8b] hover:text-[#0d4f8b]"
                  >
                    <span>{formatTime(slot.startTime)} - {formatTime(slot.endTime)}</span>
                    <span>Chọn</span>
                  </Link>
                )) : (
                  <div className="rounded-md border border-dashed border-[#dce3ee] px-3 py-4 text-sm text-[#667892]">
                    Chưa có khung giờ trống trong ngày này.
                  </div>
                )}
              </div>

              <Link href={bookingUrl} className="mt-5 inline-flex w-full items-center justify-center rounded-md bg-[#0d4f8b] px-4 py-3 text-sm font-semibold text-white hover:bg-[#083d6d]">
                Đặt lịch với bác sĩ này
              </Link>
            </aside>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function DoctorDetailSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="rounded-md border border-[#dce3ee] bg-white p-5">
        <div className="flex gap-5">
          <span className="skeleton-shimmer h-36 w-36 shrink-0 rounded-md" />
          <div className="flex-1 space-y-4">
            <span className="skeleton-shimmer block h-4 w-32 rounded-md" />
            <span className="skeleton-shimmer block h-9 w-2/3 rounded-md" />
            <span className="skeleton-shimmer block h-10 w-full rounded-md" />
            <span className="skeleton-shimmer block h-8 w-36 rounded-md" />
          </div>
        </div>
        <span className="skeleton-shimmer mt-8 block h-28 w-full rounded-md" />
      </div>
      <div className="rounded-md border border-[#dce3ee] bg-white p-5">
        <span className="skeleton-shimmer block h-5 w-40 rounded-md" />
        <span className="skeleton-shimmer mt-4 block h-11 w-full rounded-md" />
        <span className="skeleton-shimmer mt-4 block h-24 w-full rounded-md" />
      </div>
    </div>
  );
}
