"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Appointment, AppointmentStatus, DoctorProfile, ListResult } from "@/lib/types";

const statusOptions: { value: "" | AppointmentStatus; label: string }[] = [
  { value: "", label: "Tat ca trang thai" },
  { value: "PENDING_OTP", label: "Cho OTP" },
  { value: "PENDING_CONFIRM", label: "Cho xac nhan" },
  { value: "CONFIRMED", label: "Da xac nhan" },
  { value: "CHECKED_IN", label: "Da check-in" },
  { value: "IN_PROGRESS", label: "Dang kham" },
  { value: "COMPLETED", label: "Hoan thanh" },
  { value: "NO_SHOW", label: "Khong den" },
  { value: "CANCELLED_BY_ADMIN", label: "Admin huy" },
  { value: "CANCELLED_BY_DOCTOR", label: "Bac si huy" },
  { value: "CANCELLED_BY_PATIENT", label: "Benh nhan huy" },
];

const statusLabel: Record<AppointmentStatus, string> = {
  PENDING_OTP: "Cho OTP",
  PENDING_CONFIRM: "Cho xac nhan",
  CONFIRMED: "Da xac nhan",
  CHECKED_IN: "Da check-in",
  IN_PROGRESS: "Dang kham",
  COMPLETED: "Hoan thanh",
  RESCHEDULED: "Da doi lich",
  CANCELLED_BY_PATIENT: "BN huy",
  CANCELLED_BY_DOCTOR: "BS huy",
  CANCELLED_BY_ADMIN: "Admin huy",
  NO_SHOW: "Khong den",
};

const statusClass: Record<AppointmentStatus, string> = {
  PENDING_OTP: "bg-[#fff4d6] text-[#8a5a00]",
  PENDING_CONFIRM: "bg-[#fff4d6] text-[#8a5a00]",
  CONFIRMED: "bg-[#e7f0fb] text-[#0d4f8b]",
  CHECKED_IN: "bg-[#e7f0fb] text-[#0d4f8b]",
  IN_PROGRESS: "bg-[#f1e9ff] text-[#673ab7]",
  COMPLETED: "bg-[#e7f6ed] text-[#1f7a3a]",
  RESCHEDULED: "bg-[#eef2f7] text-[#667892]",
  CANCELLED_BY_PATIENT: "bg-[#fff3f2] text-[#b3261e]",
  CANCELLED_BY_DOCTOR: "bg-[#fff3f2] text-[#b3261e]",
  CANCELLED_BY_ADMIN: "bg-[#fff3f2] text-[#b3261e]",
  NO_SHOW: "bg-[#fff3f2] text-[#b3261e]",
};

const today = () => new Date().toISOString().slice(0, 10);

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("vi-VN").format(new Date(value));

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

const doctorName = (doctor: DoctorProfile | Appointment["doctor"]) =>
  [doctor.title, doctor.user.fullName].filter(Boolean).join(" ");

const isCancelled = (status: AppointmentStatus) => status.startsWith("CANCELLED");

export default function AppointmentsPage() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [status, setStatus] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [date, setDate] = useState(today());
  const [phone, setPhone] = useState("");
  const [bookingCode, setBookingCode] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<Appointment | null>(null);
  const listRef = useRef<HTMLElement | null>(null);
  const detailRef = useRef<HTMLElement | null>(null);

  const canStaffActions = user?.role === "ADMIN" || user?.role === "STAFF";

  const query = useMemo(
    () => ({
      status: status || undefined,
      doctorId: doctorId || undefined,
      date: date || undefined,
      phone: phone.trim() || undefined,
      bookingCode: bookingCode.trim() || undefined,
      page,
      limit: 20,
    }),
    [bookingCode, date, doctorId, page, phone, status],
  );

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await apiRequest<ListResult<Appointment>>("/dashboard/appointments", {
        query,
      });
      setAppointments(result.items);
      setPagination(result.pagination);
      setSelected((current) =>
        current ? result.items.find((item) => item.id === current.id) || current : current,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong tai duoc lich hen");
    } finally {
      setLoading(false);
    }
  }, [query]);

  const loadDoctors = useCallback(async () => {
    try {
      const result = await apiRequest<ListResult<DoctorProfile>>("/dashboard/doctors", {
        query: { limit: 100 },
      });
      setDoctors(result.items);
    } catch {
      setDoctors([]);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadAppointments();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadAppointments]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDoctors();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadDoctors]);

  useEffect(() => {
    if (!notice && !error) return;
    const timeoutId = window.setTimeout(() => {
      setNotice("");
      setError("");
    }, 4500);
    return () => window.clearTimeout(timeoutId);
  }, [error, notice]);

  const scrollTo = (ref: React.RefObject<HTMLElement | null>) => {
    window.setTimeout(() => {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const runAction = async (appointment: Appointment, path: string, message: string, body?: unknown) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const updated = await apiRequest<Appointment>(`/dashboard/appointments/${appointment.id}${path}`, {
        method: "PATCH",
        body,
      });
      setSelected(updated);
      setNotice(message);
      await loadAppointments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong thuc hien duoc thao tac");
    } finally {
      setBusy(false);
    }
  };

  const cancelAppointment = async (appointment: Appointment) => {
    const reason = window.prompt("Nhap ly do huy lich", "");
    if (!reason || reason.trim().length < 2) return;
    await runAction(appointment, "/cancel", "Da huy lich hen", { reason });
  };

  const cleanupExpiredOtp = async () => {
    if (!canStaffActions) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await apiRequest<{ expiredBefore: string; count: number }>(
        "/dashboard/appointments/cleanup-expired-otp",
        { method: "POST" },
      );
      setNotice(`Da cleanup ${result.count} lich qua han OTP`);
      await loadAppointments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong cleanup duoc lich OTP");
    } finally {
      setBusy(false);
    }
  };

  const openDetail = (appointment: Appointment) => {
    setSelected(appointment);
    scrollTo(detailRef);
  };

  const renderActions = (appointment: Appointment) => {
    if (busy || isCancelled(appointment.status) || appointment.status === "COMPLETED") return null;

    return (
      <>
        {canStaffActions && appointment.status === "PENDING_CONFIRM" ? (
          <button onClick={() => void runAction(appointment, "/confirm", "Da xac nhan lich")} className="rounded-md border border-[#cfd8e6] px-3 py-1.5 text-xs font-medium text-[#42526b]">Xac nhan</button>
        ) : null}
        {canStaffActions && appointment.status === "CONFIRMED" ? (
          <button onClick={() => void runAction(appointment, "/check-in", "Da check-in")} className="rounded-md border border-[#cfd8e6] px-3 py-1.5 text-xs font-medium text-[#42526b]">Check-in</button>
        ) : null}
        {appointment.status === "CHECKED_IN" ? (
          <button onClick={() => void runAction(appointment, "/start", "Da bat dau kham")} className="rounded-md border border-[#cfd8e6] px-3 py-1.5 text-xs font-medium text-[#42526b]">Bat dau</button>
        ) : null}
        {appointment.status === "IN_PROGRESS" ? (
          <button onClick={() => void runAction(appointment, "/complete", "Da hoan thanh")} className="rounded-md border border-[#cfd8e6] px-3 py-1.5 text-xs font-medium text-[#42526b]">Hoan thanh</button>
        ) : null}
        {canStaffActions && ["CONFIRMED", "CHECKED_IN"].includes(appointment.status) ? (
          <button onClick={() => void runAction(appointment, "/no-show", "Da danh dau no-show")} className="rounded-md border border-[#cfd8e6] px-3 py-1.5 text-xs font-medium text-[#42526b]">No-show</button>
        ) : null}
        {appointment.status !== "PENDING_OTP" ? (
          <button onClick={() => void cancelAppointment(appointment)} className="rounded-md border border-[#f2b8b5] px-3 py-1.5 text-xs font-medium text-[#b3261e]">Huy</button>
        ) : null}
      </>
    );
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      {notice || error ? (
        <div className="fixed right-4 top-4 z-50 w-[calc(100%-2rem)] max-w-md sm:right-6 sm:top-6">
          <div className={`rounded-md border px-4 py-3 shadow-lg ${error ? "border-[#f2b8b5] bg-[#fff3f2] text-[#b3261e]" : "border-[#a8dab5] bg-[#f0fff4] text-[#1f7a3a]"}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{error ? "Co loi xay ra" : "Thanh cong"}</p>
                <p className="mt-1 text-sm">{error || notice}</p>
              </div>
              <button type="button" onClick={() => { setError(""); setNotice(""); }} className="rounded-md px-2 text-lg leading-none opacity-70 hover:bg-black/5 hover:opacity-100" aria-label="Dong thong bao">x</button>
            </div>
          </div>
        </div>
      ) : null}

      <section ref={listRef} className="min-w-0 scroll-mt-24 space-y-4">
        <div className="flex flex-col gap-3 rounded-md border border-[#dce3ee] bg-white p-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-[#55708f]">Van hanh kham benh</p>
            <h2 className="mt-1 text-2xl font-semibold">Lich hen</h2>
            <p className="mt-2 text-sm text-[#667892]">Theo doi va chuyen trang thai lich hen trong ngay.</p>
          </div>
          {canStaffActions ? (
            <button disabled={busy} onClick={() => void cleanupExpiredOtp()} className="rounded-md border border-[#cfd8e6] px-4 py-2 text-sm font-semibold text-[#42526b] hover:bg-[#f6f8fb] disabled:opacity-60">Cleanup OTP qua han</button>
          ) : null}
        </div>

        <div className="rounded-md border border-[#dce3ee] bg-white">
          <div className="grid gap-3 border-b border-[#e5ebf3] p-4 lg:grid-cols-[170px_1fr_150px_150px_150px]">
            <input type="date" value={date} onChange={(e) => { setDate(e.target.value); setPage(1); }} className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" />
            <select value={doctorId} onChange={(e) => { setDoctorId(e.target.value); setPage(1); }} className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]">
              <option value="">Tat ca bac si</option>
              {doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctorName(doctor)}</option>)}
            </select>
            <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]">
              {statusOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            <input value={phone} onChange={(e) => { setPhone(e.target.value); setPage(1); }} placeholder="So dien thoai" className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" />
            <input value={bookingCode} onChange={(e) => { setBookingCode(e.target.value); setPage(1); }} placeholder="Ma lich" className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="text-[#667892]">
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Ma lich</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Benh nhan</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Thoi gian</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Bac si</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Dich vu</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Trang thai</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 text-right font-semibold">Thao tac</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-[#667892]">Dang tai lich hen...</td></tr>
                ) : appointments.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-[#667892]">Chua co lich hen phu hop</td></tr>
                ) : appointments.map((appointment) => (
                  <tr key={appointment.id} className="align-top">
                    <td className="border-b border-[#eef2f7] px-4 py-3">
                      <button onClick={() => openDetail(appointment)} className="font-semibold text-[#0d4f8b] hover:underline">{appointment.bookingCode}</button>
                      <p className="mt-1 text-xs text-[#667892]">{formatCurrency(appointment.finalAmount)}</p>
                    </td>
                    <td className="border-b border-[#eef2f7] px-4 py-3">
                      <p className="font-semibold">{appointment.patientName}</p>
                      <p className="mt-1 text-xs text-[#667892]">{appointment.patientPhone}</p>
                    </td>
                    <td className="border-b border-[#eef2f7] px-4 py-3">{formatDate(appointment.appointmentDate)}<p className="mt-1 text-xs text-[#667892]">{appointment.startTime} - {appointment.endTime}</p></td>
                    <td className="border-b border-[#eef2f7] px-4 py-3">{doctorName(appointment.doctor)}<p className="mt-1 text-xs text-[#667892]">{appointment.department.name}</p></td>
                    <td className="border-b border-[#eef2f7] px-4 py-3">{appointment.package?.name || "Kham bac si"}<p className="mt-1 text-xs text-[#667892]">{appointment.reason || "Khong co ly do"}</p></td>
                    <td className="border-b border-[#eef2f7] px-4 py-3"><span className={`rounded-md px-2 py-1 text-xs font-semibold ${statusClass[appointment.status]}`}>{statusLabel[appointment.status]}</span></td>
                    <td className="border-b border-[#eef2f7] px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button onClick={() => openDetail(appointment)} className="rounded-md border border-[#cfd8e6] px-3 py-1.5 text-xs font-medium text-[#42526b]">Chi tiet</button>
                        {renderActions(appointment)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-[#e5ebf3] px-4 py-3 text-sm text-[#667892]">
            <span>{pagination.total} ket qua, trang {pagination.page}/{pagination.totalPages || 1}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage((current) => Math.max(current - 1, 1))} className="rounded-md border border-[#cfd8e6] px-3 py-1.5 font-medium disabled:opacity-50">Truoc</button>
              <button disabled={page >= pagination.totalPages} onClick={() => setPage((current) => current + 1)} className="rounded-md border border-[#cfd8e6] px-3 py-1.5 font-medium disabled:opacity-50">Sau</button>
            </div>
          </div>
        </div>
      </section>

      <aside ref={detailRef} className="scroll-mt-24 rounded-md border border-[#dce3ee] bg-white p-5 xl:sticky xl:top-24 xl:self-start">
        {selected ? (
          <div className="space-y-5">
            <div>
              <p className="text-sm font-medium text-[#55708f]">Chi tiet lich hen</p>
              <h3 className="mt-1 text-xl font-semibold">{selected.bookingCode}</h3>
              <span className={`mt-3 inline-flex rounded-md px-2 py-1 text-xs font-semibold ${statusClass[selected.status]}`}>{statusLabel[selected.status]}</span>
            </div>
            <div className="space-y-3 text-sm">
              <div><p className="text-[#667892]">Benh nhan</p><p className="font-semibold">{selected.patientName}</p><p>{selected.patientPhone}</p><p>{selected.patientEmail || "-"}</p></div>
              <div><p className="text-[#667892]">Thoi gian</p><p className="font-semibold">{formatDate(selected.appointmentDate)} - {selected.startTime} den {selected.endTime}</p></div>
              <div><p className="text-[#667892]">Bac si</p><p className="font-semibold">{doctorName(selected.doctor)}</p><p>{selected.department.name}</p></div>
              <div><p className="text-[#667892]">Dich vu</p><p className="font-semibold">{selected.package?.name || "Kham bac si"}</p><p>{selected.reason || "Khong co ly do kham"}</p></div>
              <div><p className="text-[#667892]">Thanh tien</p><p className="font-semibold">{formatCurrency(selected.finalAmount)}</p><p className="text-xs text-[#667892]">Gia {formatCurrency(selected.estimatedPrice)} + phi {formatCurrency(selected.serviceFee)} - BHYT {formatCurrency(selected.bhytDiscount)}</p></div>
              <div><p className="text-[#667892]">BHYT</p><p>{selected.hasBHYT ? selected.healthInsuranceCode || "Co BHYT" : "Khong"}</p></div>
              <div><p className="text-[#667892]">Ghi chu suc khoe</p><p>Di ung: {selected.allergies || "-"}</p><p>Tien su: {selected.medicalHistory || "-"}</p><p>Gia dinh: {selected.familyHistory || "-"}</p></div>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-[#e5ebf3] pt-4">{renderActions(selected)}</div>
          </div>
        ) : (
          <div>
            <p className="text-sm font-medium text-[#55708f]">Chi tiet lich hen</p>
            <h3 className="mt-1 text-xl font-semibold">Chon mot lich hen</h3>
            <p className="mt-2 text-sm leading-6 text-[#667892]">Bam vao ma lich hoac nut chi tiet de xem thong tin benh nhan, gia tien va thao tac phu hop.</p>
          </div>
        )}
      </aside>
    </div>
  );
}
