"use client";

/* eslint-disable @next/next/no-img-element */

import { CalendarDays, Clock, Loader2, Stethoscope } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { apiRequest } from "@/lib/api";
import type { DoctorProfile } from "@/lib/types";

export type PublicSlot = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
};

type DoctorDetailClientProps = {
  doctor: DoctorProfile;
  initialDate: string;
  initialSlots: PublicSlot[];
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value || 0);

const doctorName = (doctor: DoctorProfile) => [doctor.title, doctor.user.fullName].filter(Boolean).join(" ");
const firstLetter = (value: string) => value.trim().slice(0, 1).toUpperCase() || "B";
const formatTime = (value: string) => value.slice(0, 5);

export function DoctorDetailClient({ doctor, initialDate, initialSlots }: DoctorDetailClientProps) {
  const [slots, setSlots] = useState<PublicSlot[]>(initialSlots);
  const [date, setDate] = useState(initialDate);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotError, setSlotError] = useState("");
  const bookingUrl = `/?departmentId=${doctor.department.id}&doctorId=${doctor.id}#booking`;

  const loadSlots = async (nextDate: string) => {
    setDate(nextDate);
    setLoadingSlots(true);
    setSlotError("");

    try {
      const result = await apiRequest<PublicSlot[]>(`/doctors/${doctor.id}/available-slots`, {
        query: { date: nextDate },
      });
      setSlots(result);
    } catch (err) {
      setSlots([]);
      setSlotError(err instanceof Error ? err.message : "Không tải được khung giờ khám");
    } finally {
      setLoadingSlots(false);
    }
  };

  const getSlotBookingUrl = (slot: PublicSlot) =>
    `/?departmentId=${doctor.department.id}&doctorId=${doctor.id}&date=${slot.date}&timeSlotId=${slot.id}#booking`;

  return (
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
          min={initialDate}
          value={date}
          onChange={(event) => void loadSlots(event.target.value)}
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
  );
}
