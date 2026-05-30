"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type {
  DoctorProfile,
  DoctorSchedule,
  DoctorTimeSlot,
  ListResult,
  TimeSlotStatus,
} from "@/lib/types";

type ScheduleForm = {
  doctorId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  slotDuration: string;
  maxPatients: string;
  isActive: boolean;
};

const emptyScheduleForm: ScheduleForm = {
  doctorId: "",
  dayOfWeek: "1",
  startTime: "08:00",
  endTime: "11:30",
  slotDuration: "30",
  maxPatients: "1",
  isActive: true,
};

const dayOptions = [
  { value: "0", label: "Chu nhat" },
  { value: "1", label: "Thu 2" },
  { value: "2", label: "Thu 3" },
  { value: "3", label: "Thu 4" },
  { value: "4", label: "Thu 5" },
  { value: "5", label: "Thu 6" },
  { value: "6", label: "Thu 7" },
];

const slotStatuses: { value: "" | TimeSlotStatus; label: string }[] = [
  { value: "", label: "Tat ca trang thai" },
  { value: "AVAILABLE", label: "Con trong" },
  { value: "BOOKED", label: "Da dat" },
  { value: "LOCKED", label: "Da khoa" },
  { value: "CANCELLED", label: "Da huy" },
];

const statusClass: Record<TimeSlotStatus, string> = {
  AVAILABLE: "bg-[#e7f6ed] text-[#1f7a3a]",
  BOOKED: "bg-[#e7f0fb] text-[#0d4f8b]",
  LOCKED: "bg-[#fff4d6] text-[#8a5a00]",
  CANCELLED: "bg-[#eef2f7] text-[#667892]",
};

const statusLabel: Record<TimeSlotStatus, string> = {
  AVAILABLE: "Con trong",
  BOOKED: "Da dat",
  LOCKED: "Da khoa",
  CANCELLED: "Da huy",
};

const today = () => new Date().toISOString().slice(0, 10);

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("vi-VN").format(new Date(value));

const doctorName = (doctor: DoctorSchedule["doctor"] | DoctorProfile) =>
  [doctor.title, doctor.user.fullName].filter(Boolean).join(" ");

const toScheduleForm = (schedule: DoctorSchedule): ScheduleForm => ({
  doctorId: schedule.doctor.id,
  dayOfWeek: String(schedule.dayOfWeek),
  startTime: schedule.startTime,
  endTime: schedule.endTime,
  slotDuration: String(schedule.slotDuration),
  maxPatients: String(schedule.maxPatients),
  isActive: schedule.isActive,
});

const buildCreateSchedulePayload = (form: ScheduleForm) => ({
  doctorId: form.doctorId,
  dayOfWeek: Number(form.dayOfWeek),
  startTime: form.startTime,
  endTime: form.endTime,
  slotDuration: Number(form.slotDuration || 30),
  maxPatients: Number(form.maxPatients || 1),
  isActive: form.isActive,
});

const buildUpdateSchedulePayload = (form: ScheduleForm) => ({
  dayOfWeek: Number(form.dayOfWeek),
  startTime: form.startTime,
  endTime: form.endTime,
  slotDuration: Number(form.slotDuration || 30),
  maxPatients: Number(form.maxPatients || 1),
  isActive: form.isActive,
});

export default function SchedulesPage() {
  const { user } = useAuth();
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [schedules, setSchedules] = useState<DoctorSchedule[]>([]);
  const [slots, setSlots] = useState<DoctorTimeSlot[]>([]);
  const [schedulePagination, setSchedulePagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [slotPagination, setSlotPagination] = useState({ page: 1, limit: 30, total: 0, totalPages: 1 });
  const [doctorId, setDoctorId] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState("");
  const [scheduleActive, setScheduleActive] = useState("");
  const [slotDoctorId, setSlotDoctorId] = useState("");
  const [slotDate, setSlotDate] = useState(today());
  const [slotStatus, setSlotStatus] = useState("");
  const [schedulePage, setSchedulePage] = useState(1);
  const [slotPage, setSlotPage] = useState(1);
  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editingSchedule, setEditingSchedule] = useState<DoctorSchedule | null>(null);
  const [scheduleForm, setScheduleForm] = useState<ScheduleForm>(emptyScheduleForm);
  const [generateDoctorId, setGenerateDoctorId] = useState("");
  const [generateDate, setGenerateDate] = useState(today());
  const formPanelRef = useRef<HTMLElement | null>(null);
  const scheduleListRef = useRef<HTMLElement | null>(null);
  const slotListRef = useRef<HTMLElement | null>(null);

  const canWrite = user?.role === "ADMIN" || user?.role === "STAFF";

  const scheduleQuery = useMemo(
    () => ({
      doctorId: doctorId || undefined,
      dayOfWeek: dayOfWeek || undefined,
      isActive: scheduleActive || undefined,
      page: schedulePage,
      limit: 20,
    }),
    [dayOfWeek, doctorId, scheduleActive, schedulePage],
  );

  const slotQuery = useMemo(
    () => ({
      doctorId: slotDoctorId || undefined,
      date: slotDate || undefined,
      status: slotStatus || undefined,
      page: slotPage,
      limit: 30,
    }),
    [slotDate, slotDoctorId, slotPage, slotStatus],
  );

  const loadDoctors = useCallback(async () => {
    try {
      const result = await apiRequest<ListResult<DoctorProfile>>("/dashboard/doctors", {
        query: { isAvailable: true, limit: 100 },
      });
      setDoctors(result.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong tai duoc danh sach bac si");
    }
  }, []);

  const loadSchedules = useCallback(async () => {
    setLoadingSchedules(true);
    try {
      const result = await apiRequest<ListResult<DoctorSchedule>>("/dashboard/doctor-schedules", {
        query: scheduleQuery,
      });
      setSchedules(result.items);
      setSchedulePagination(result.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong tai duoc lich lam viec");
    } finally {
      setLoadingSchedules(false);
    }
  }, [scheduleQuery]);

  const loadSlots = useCallback(async () => {
    setLoadingSlots(true);
    try {
      const result = await apiRequest<ListResult<DoctorTimeSlot>>("/dashboard/doctor-time-slots", {
        query: slotQuery,
      });
      setSlots(result.items);
      setSlotPagination(result.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong tai duoc slot kham");
    } finally {
      setLoadingSlots(false);
    }
  }, [slotQuery]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDoctors();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadDoctors]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadSchedules();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadSchedules]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadSlots();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadSlots]);

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

  const startCreate = () => {
    setEditingSchedule(null);
    setScheduleForm(emptyScheduleForm);
    setError("");
    setNotice("");
    scrollTo(formPanelRef);
  };

  const startEdit = (schedule: DoctorSchedule) => {
    setEditingSchedule(schedule);
    setScheduleForm(toScheduleForm(schedule));
    setError("");
    setNotice("");
    scrollTo(formPanelRef);
  };

  const handleScheduleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canWrite) return;

    setSaving(true);
    setError("");
    setNotice("");

    try {
      if (editingSchedule) {
        await apiRequest<DoctorSchedule>(`/dashboard/doctor-schedules/${editingSchedule.id}`, {
          method: "PATCH",
          body: buildUpdateSchedulePayload(scheduleForm),
        });
        setNotice("Da cap nhat lich lam viec");
      } else {
        await apiRequest<DoctorSchedule>("/dashboard/doctor-schedules", {
          method: "POST",
          body: buildCreateSchedulePayload(scheduleForm),
        });
        setNotice("Da tao lich lam viec");
      }
      setEditingSchedule(null);
      setScheduleForm(emptyScheduleForm);
      await loadSchedules();
      scrollTo(scheduleListRef);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong luu duoc lich lam viec");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSchedule = async (schedule: DoctorSchedule) => {
    if (!canWrite || !window.confirm(`Xoa lich ${doctorName(schedule.doctor)}?`)) return;
    setError("");
    setNotice("");
    try {
      await apiRequest<DoctorSchedule>(`/dashboard/doctor-schedules/${schedule.id}`, { method: "DELETE" });
      setNotice("Da xoa lich lam viec");
      await loadSchedules();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong xoa duoc lich lam viec");
    }
  };

  const handleGenerateSlots = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canWrite) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const result = await apiRequest<{ items: DoctorTimeSlot[]; generatedCount: number; total: number }>(
        "/dashboard/doctor-time-slots/generate",
        {
          method: "POST",
          body: { doctorId: generateDoctorId, date: generateDate },
        },
      );
      setSlotDoctorId(generateDoctorId);
      setSlotDate(generateDate);
      setSlotPage(1);
      setNotice(`Da sinh ${result.generatedCount} slot, tong hien co ${result.total} slot`);
      await loadSlots();
      scrollTo(slotListRef);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong sinh duoc slot");
    } finally {
      setSaving(false);
    }
  };

  const handleSlotStatus = async (slot: DoctorTimeSlot, status: TimeSlotStatus) => {
    if (!canWrite) return;
    const lockReason =
      status === "LOCKED" ? window.prompt("Nhap ly do khoa slot", slot.lockReason || "") : null;
    if (status === "LOCKED" && (!lockReason || lockReason.trim().length < 2)) return;

    setError("");
    setNotice("");
    try {
      await apiRequest<DoctorTimeSlot>(`/dashboard/doctor-time-slots/${slot.id}/status`, {
        method: "PATCH",
        body: { status, lockReason },
      });
      setNotice("Da cap nhat slot");
      await loadSlots();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong cap nhat duoc slot");
    }
  };

  const handleUnlockSlot = async (slot: DoctorTimeSlot) => {
    if (!canWrite) return;
    setError("");
    setNotice("");
    try {
      await apiRequest<DoctorTimeSlot>(`/dashboard/doctor-time-slots/${slot.id}/unlock`, {
        method: "PATCH",
      });
      setNotice("Da mo khoa slot");
      await loadSlots();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong mo khoa duoc slot");
    }
  };

  const handleDeleteSlot = async (slot: DoctorTimeSlot) => {
    if (!canWrite || !window.confirm(`Xoa slot ${slot.startTime} - ${slot.endTime}?`)) return;
    setError("");
    setNotice("");
    try {
      await apiRequest<DoctorTimeSlot>(`/dashboard/doctor-time-slots/${slot.id}`, { method: "DELETE" });
      setNotice("Da xoa slot");
      await loadSlots();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong xoa duoc slot");
    }
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

      <section className="min-w-0 space-y-6">
        <section ref={scheduleListRef} className="scroll-mt-24 rounded-md border border-[#dce3ee] bg-white">
          <div className="flex flex-col gap-3 border-b border-[#e5ebf3] p-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-medium text-[#55708f]">Lich mau theo tuan</p>
              <h2 className="mt-1 text-2xl font-semibold">Lich lam viec bac si</h2>
              <p className="mt-2 text-sm text-[#667892]">Tao khung gio lap lai theo thu de sinh slot kham theo ngay.</p>
            </div>
            {canWrite ? <button onClick={startCreate} className="rounded-md bg-[#0d4f8b] px-4 py-2 text-sm font-semibold text-white hover:bg-[#083d6d]">Tao lich mau</button> : null}
          </div>
          <div className="grid gap-3 border-b border-[#e5ebf3] p-4 lg:grid-cols-[1fr_160px_160px]">
            <select value={doctorId} onChange={(e) => { setDoctorId(e.target.value); setSchedulePage(1); }} className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]">
              <option value="">Tat ca bac si</option>
              {doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctorName(doctor)}</option>)}
            </select>
            <select value={dayOfWeek} onChange={(e) => { setDayOfWeek(e.target.value); setSchedulePage(1); }} className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]">
              <option value="">Tat ca thu</option>
              {dayOptions.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}
            </select>
            <select value={scheduleActive} onChange={(e) => { setScheduleActive(e.target.value); setSchedulePage(1); }} className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]">
              <option value="">Tat ca trang thai</option>
              <option value="true">Dang dung</option>
              <option value="false">Tam tat</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="text-[#667892]">
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Bac si</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Thu</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Gio</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Slot</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Trang thai</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 text-right font-semibold">Thao tac</th>
                </tr>
              </thead>
              <tbody>
                {loadingSchedules ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-[#667892]">Dang tai lich...</td></tr>
                ) : schedules.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-[#667892]">Chua co lich mau</td></tr>
                ) : schedules.map((schedule) => (
                  <tr key={schedule.id}>
                    <td className="border-b border-[#eef2f7] px-4 py-3">
                      <p className="font-semibold">{doctorName(schedule.doctor)}</p>
                      <p className="mt-1 text-xs text-[#667892]">{schedule.doctor.department.name}</p>
                    </td>
                    <td className="border-b border-[#eef2f7] px-4 py-3">{dayOptions.find((day) => day.value === String(schedule.dayOfWeek))?.label}</td>
                    <td className="border-b border-[#eef2f7] px-4 py-3">{schedule.startTime} - {schedule.endTime}</td>
                    <td className="border-b border-[#eef2f7] px-4 py-3">{schedule.slotDuration} phut / toi da {schedule.maxPatients}</td>
                    <td className="border-b border-[#eef2f7] px-4 py-3">
                      <span className={`rounded-md px-2 py-1 text-xs font-semibold ${schedule.isActive ? "bg-[#e7f6ed] text-[#1f7a3a]" : "bg-[#eef2f7] text-[#667892]"}`}>{schedule.isActive ? "Dang dung" : "Tam tat"}</span>
                    </td>
                    <td className="border-b border-[#eef2f7] px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {canWrite ? (
                          <>
                            <button onClick={() => startEdit(schedule)} className="rounded-md border border-[#cfd8e6] px-3 py-1.5 text-xs font-medium text-[#42526b]">Sua</button>
                            <button onClick={() => void handleDeleteSchedule(schedule)} className="rounded-md border border-[#f2b8b5] px-3 py-1.5 text-xs font-medium text-[#b3261e]">Xoa</button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-[#e5ebf3] px-4 py-3 text-sm text-[#667892]">
            <span>{schedulePagination.total} ket qua, trang {schedulePagination.page}/{schedulePagination.totalPages || 1}</span>
            <div className="flex gap-2">
              <button disabled={schedulePage <= 1} onClick={() => setSchedulePage((current) => Math.max(current - 1, 1))} className="rounded-md border border-[#cfd8e6] px-3 py-1.5 font-medium disabled:opacity-50">Truoc</button>
              <button disabled={schedulePage >= schedulePagination.totalPages} onClick={() => setSchedulePage((current) => current + 1)} className="rounded-md border border-[#cfd8e6] px-3 py-1.5 font-medium disabled:opacity-50">Sau</button>
            </div>
          </div>
        </section>

        <section ref={slotListRef} className="scroll-mt-24 rounded-md border border-[#dce3ee] bg-white">
          <div className="border-b border-[#e5ebf3] p-5">
            <p className="text-sm font-medium text-[#55708f]">Slot kham theo ngay</p>
            <h2 className="mt-1 text-2xl font-semibold">Slot kham</h2>
            <p className="mt-2 text-sm text-[#667892]">Sinh slot tu lich mau, khoa/mo khoa, huy hoac xoa slot chua duoc dat.</p>
          </div>
          <div className="grid gap-3 border-b border-[#e5ebf3] p-4 lg:grid-cols-[1fr_160px_190px]">
            <select value={slotDoctorId} onChange={(e) => { setSlotDoctorId(e.target.value); setSlotPage(1); }} className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]">
              <option value="">Tat ca bac si</option>
              {doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctorName(doctor)}</option>)}
            </select>
            <input type="date" value={slotDate} onChange={(e) => { setSlotDate(e.target.value); setSlotPage(1); }} className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" />
            <select value={slotStatus} onChange={(e) => { setSlotStatus(e.target.value); setSlotPage(1); }} className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]">
              {slotStatuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="text-[#667892]">
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Ngay</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Bac si</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Gio</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Trang thai</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Lich hen</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 text-right font-semibold">Thao tac</th>
                </tr>
              </thead>
              <tbody>
                {loadingSlots ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-[#667892]">Dang tai slot...</td></tr>
                ) : slots.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-[#667892]">Chua co slot phu hop</td></tr>
                ) : slots.map((slot) => (
                  <tr key={slot.id}>
                    <td className="border-b border-[#eef2f7] px-4 py-3">{formatDate(slot.date)}</td>
                    <td className="border-b border-[#eef2f7] px-4 py-3">
                      <p className="font-semibold">{doctorName(slot.doctor)}</p>
                      <p className="mt-1 text-xs text-[#667892]">{slot.doctor.department.name}</p>
                    </td>
                    <td className="border-b border-[#eef2f7] px-4 py-3">{slot.startTime} - {slot.endTime}</td>
                    <td className="border-b border-[#eef2f7] px-4 py-3">
                      <span className={`rounded-md px-2 py-1 text-xs font-semibold ${statusClass[slot.status]}`}>{statusLabel[slot.status]}</span>
                      {slot.lockReason ? <p className="mt-1 text-xs text-[#667892]">{slot.lockReason}</p> : null}
                    </td>
                    <td className="border-b border-[#eef2f7] px-4 py-3">{slot.appointment?.bookingCode || "-"}</td>
                    <td className="border-b border-[#eef2f7] px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {canWrite && !slot.appointment && slot.status !== "BOOKED" ? (
                          <>
                            {slot.status === "LOCKED" ? (
                              <button onClick={() => void handleUnlockSlot(slot)} className="rounded-md border border-[#cfd8e6] px-3 py-1.5 text-xs font-medium text-[#42526b]">Mo khoa</button>
                            ) : (
                              <button onClick={() => void handleSlotStatus(slot, "LOCKED")} className="rounded-md border border-[#cfd8e6] px-3 py-1.5 text-xs font-medium text-[#42526b]">Khoa</button>
                            )}
                            {slot.status !== "CANCELLED" ? <button onClick={() => void handleSlotStatus(slot, "CANCELLED")} className="rounded-md border border-[#cfd8e6] px-3 py-1.5 text-xs font-medium text-[#42526b]">Huy</button> : null}
                            {slot.status !== "AVAILABLE" ? <button onClick={() => void handleSlotStatus(slot, "AVAILABLE")} className="rounded-md border border-[#cfd8e6] px-3 py-1.5 text-xs font-medium text-[#42526b]">Trong</button> : null}
                            <button onClick={() => void handleDeleteSlot(slot)} className="rounded-md border border-[#f2b8b5] px-3 py-1.5 text-xs font-medium text-[#b3261e]">Xoa</button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-[#e5ebf3] px-4 py-3 text-sm text-[#667892]">
            <span>{slotPagination.total} ket qua, trang {slotPagination.page}/{slotPagination.totalPages || 1}</span>
            <div className="flex gap-2">
              <button disabled={slotPage <= 1} onClick={() => setSlotPage((current) => Math.max(current - 1, 1))} className="rounded-md border border-[#cfd8e6] px-3 py-1.5 font-medium disabled:opacity-50">Truoc</button>
              <button disabled={slotPage >= slotPagination.totalPages} onClick={() => setSlotPage((current) => current + 1)} className="rounded-md border border-[#cfd8e6] px-3 py-1.5 font-medium disabled:opacity-50">Sau</button>
            </div>
          </div>
        </section>
      </section>

      <aside className="space-y-4">
        {canWrite ? (
          <section ref={formPanelRef} className="scroll-mt-24 rounded-md border border-[#dce3ee] bg-white p-5 xl:sticky xl:top-24">
            <h3 className="text-lg font-semibold">{editingSchedule ? "Cap nhat lich mau" : "Tao lich mau"}</h3>
            <form className="mt-5 space-y-4" onSubmit={handleScheduleSubmit}>
              <label className="block">
                <span className="text-sm font-medium text-[#334155]">Bac si</span>
                {editingSchedule ? (
                  <input value={doctorName(editingSchedule.doctor)} disabled className="mt-1 w-full rounded-md border border-[#cfd8e6] bg-[#f6f8fb] px-3 py-2 text-sm text-[#667892]" />
                ) : (
                  <select value={scheduleForm.doctorId} onChange={(e) => setScheduleForm((current) => ({ ...current, doctorId: e.target.value }))} className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" required>
                    <option value="">Chon bac si</option>
                    {doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctorName(doctor)}</option>)}
                  </select>
                )}
              </label>
              <label className="block">
                <span className="text-sm font-medium text-[#334155]">Thu trong tuan</span>
                <select value={scheduleForm.dayOfWeek} onChange={(e) => setScheduleForm((current) => ({ ...current, dayOfWeek: e.target.value }))} className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" required>
                  {dayOptions.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}
                </select>
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-[#334155]">Bat dau</span>
                  <input type="time" value={scheduleForm.startTime} onChange={(e) => setScheduleForm((current) => ({ ...current, startTime: e.target.value }))} className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" required />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-[#334155]">Ket thuc</span>
                  <input type="time" value={scheduleForm.endTime} onChange={(e) => setScheduleForm((current) => ({ ...current, endTime: e.target.value }))} className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" required />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-[#334155]">Thoi luong slot</span>
                  <input value={scheduleForm.slotDuration} onChange={(e) => setScheduleForm((current) => ({ ...current, slotDuration: e.target.value.replace(/\D/g, "") }))} inputMode="numeric" className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" required />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-[#334155]">Toi da BN</span>
                  <input value={scheduleForm.maxPatients} onChange={(e) => setScheduleForm((current) => ({ ...current, maxPatients: e.target.value.replace(/\D/g, "") }))} inputMode="numeric" className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" required />
                </label>
              </div>
              <label className="flex items-center justify-between rounded-md border border-[#e5ebf3] px-3 py-2">
                <span className="text-sm font-medium text-[#334155]">Dang dung</span>
                <input type="checkbox" checked={scheduleForm.isActive} onChange={(e) => setScheduleForm((current) => ({ ...current, isActive: e.target.checked }))} className="h-4 w-4 accent-[#0d4f8b]" />
              </label>
              <div className="flex gap-2">
                <button disabled={saving} className="flex-1 rounded-md bg-[#0d4f8b] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#083d6d] disabled:opacity-60">{saving ? "Dang luu..." : editingSchedule ? "Luu lich" : "Tao lich"}</button>
                {editingSchedule ? <button type="button" onClick={startCreate} className="rounded-md border border-[#cfd8e6] px-4 py-2.5 text-sm font-medium text-[#42526b]">Huy</button> : null}
              </div>
            </form>
          </section>
        ) : null}

        {canWrite ? (
          <section className="rounded-md border border-[#dce3ee] bg-white p-5">
            <h3 className="text-lg font-semibold">Sinh slot theo ngay</h3>
            <p className="mt-2 text-sm leading-6 text-[#667892]">Chon bac si va ngay. Backend se sinh slot tu lich mau dung voi thu cua ngay do.</p>
            <form className="mt-5 space-y-4" onSubmit={handleGenerateSlots}>
              <label className="block">
                <span className="text-sm font-medium text-[#334155]">Bac si</span>
                <select value={generateDoctorId} onChange={(e) => setGenerateDoctorId(e.target.value)} className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" required>
                  <option value="">Chon bac si</option>
                  {doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctorName(doctor)}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-[#334155]">Ngay sinh slot</span>
                <input type="date" value={generateDate} onChange={(e) => setGenerateDate(e.target.value)} className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" required />
              </label>
              <button disabled={saving} className="w-full rounded-md bg-[#0d4f8b] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#083d6d] disabled:opacity-60">{saving ? "Dang sinh..." : "Sinh slot"}</button>
            </form>
          </section>
        ) : null}
      </aside>
    </div>
  );
}
