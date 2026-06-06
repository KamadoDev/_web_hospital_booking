"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatVietnamDate, getVietnamDateInput, isVietnamSlotStartInPast } from "@/lib/date";
import { VietnamDateInput } from "@/components/ui/vietnam-date-input";
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
  { value: "0", label: "Chủ nhật" },
  { value: "1", label: "Thứ 2" },
  { value: "2", label: "Thứ 3" },
  { value: "3", label: "Thứ 4" },
  { value: "4", label: "Thứ 5" },
  { value: "5", label: "Thứ 6" },
  { value: "6", label: "Thứ 7" },
];

const slotStatuses: { value: "" | TimeSlotStatus; label: string }[] = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "AVAILABLE", label: "Còn trống" },
  { value: "BOOKED", label: "Đã đặt" },
  { value: "LOCKED", label: "Đã khoá" },
  { value: "CANCELLED", label: "Đã huỷ" },
];

const statusClass: Record<TimeSlotStatus, string> = {
  AVAILABLE: "bg-[#e7f6ed] text-[#1f7a3a]",
  BOOKED: "bg-[#e7f0fb] text-[#0d4f8b]",
  LOCKED: "bg-[#fff4d6] text-[#8a5a00]",
  CANCELLED: "bg-[#eef2f7] text-[#667892]",
};

const statusLabel: Record<TimeSlotStatus, string> = {
  AVAILABLE: "Còn trống",
  BOOKED: "Đã đặt",
  LOCKED: "Đã khoá",
  CANCELLED: "Đã huỷ",
};

const effectiveSlotStatus = (slot: DoctorTimeSlot) => {
  if (slot.status === "AVAILABLE" && isVietnamSlotStartInPast(slot.date, slot.startTime)) {
    return {
      label: "Đã qua giờ",
      className: "bg-[#eef2f7] text-[#667892]",
      note: "Ẩn trên website người dùng",
    };
  }

  return {
    label: statusLabel[slot.status],
    className: statusClass[slot.status],
    note: "",
  };
};

const today = () => getVietnamDateInput();

const formatDate = (value: string) => formatVietnamDate(value);

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
  const [deleteScheduleTarget, setDeleteScheduleTarget] = useState<DoctorSchedule | null>(null);
  const [deleteSlotTarget, setDeleteSlotTarget] = useState<DoctorTimeSlot | null>(null);
  const [lockSlotTarget, setLockSlotTarget] = useState<DoctorTimeSlot | null>(null);
  const [lockReason, setLockReason] = useState("");
  const [scheduleForm, setScheduleForm] = useState<ScheduleForm>(emptyScheduleForm);
  const [generateDoctorId, setGenerateDoctorId] = useState("");
  const [generateDate, setGenerateDate] = useState(today());
  const formPanelRef = useRef<HTMLElement | null>(null);
  const scheduleListRef = useRef<HTMLElement | null>(null);
  const slotListRef = useRef<HTMLElement | null>(null);

  const canWrite = user?.role === "ADMIN" || user?.role === "STAFF";
  const isDoctor = user?.role === "DOCTOR";

  const scheduleQuery = useMemo(
    () => ({
      doctorId: isDoctor ? undefined : doctorId || undefined,
      dayOfWeek: dayOfWeek || undefined,
      isActive: scheduleActive || undefined,
      page: schedulePage,
      limit: 20,
    }),
    [dayOfWeek, doctorId, isDoctor, scheduleActive, schedulePage],
  );

  const slotQuery = useMemo(
    () => ({
      doctorId: isDoctor ? undefined : slotDoctorId || undefined,
      date: slotDate || undefined,
      status: slotStatus || undefined,
      page: slotPage,
      limit: 30,
    }),
    [isDoctor, slotDate, slotDoctorId, slotPage, slotStatus],
  );

  const loadDoctors = useCallback(async () => {
    if (isDoctor) {
      setDoctors([]);
      return;
    }

    try {
      const result = await apiRequest<ListResult<DoctorProfile>>("/dashboard/doctors", {
        query: { isAvailable: true, limit: 100 },
      });
      setDoctors(result.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được danh sách bác sĩ");
    }
  }, [isDoctor]);

  const loadSchedules = useCallback(async () => {
    setLoadingSchedules(true);
    try {
      const result = await apiRequest<ListResult<DoctorSchedule>>("/dashboard/doctor-schedules", {
        query: scheduleQuery,
      });
      setSchedules(result.items);
      setSchedulePagination(result.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được lịch làm việc");
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
      setError(err instanceof Error ? err.message : "Không tải được slot khám");
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

  const setSlotQuickFilter = (status: "" | TimeSlotStatus, date = today()) => {
    setSlotStatus(status);
    setSlotDate(date);
    setSlotPage(1);
    scrollTo(slotListRef);
  };

  const slotSummary = useMemo(
    () => ({
      total: slots.length,
      available: slots.filter((slot) => slot.status === "AVAILABLE" && !isVietnamSlotStartInPast(slot.date, slot.startTime)).length,
      booked: slots.filter((slot) => slot.status === "BOOKED").length,
      locked: slots.filter((slot) => slot.status === "LOCKED").length,
    }),
    [slots],
  );

  const startCreate = () => {
    setEditingSchedule(null);
    setDeleteScheduleTarget(null);
    setScheduleForm(emptyScheduleForm);
    setError("");
    setNotice("");
    scrollTo(formPanelRef);
  };

  const startEdit = (schedule: DoctorSchedule) => {
    setEditingSchedule(schedule);
    setDeleteScheduleTarget(null);
    setScheduleForm(toScheduleForm(schedule));
    setError("");
    setNotice("");
    scrollTo(formPanelRef);
  };

  const startLockSlot = (slot: DoctorTimeSlot) => {
    setLockSlotTarget(slot);
    setDeleteSlotTarget(null);
    setLockReason(slot.lockReason || "");
    setError("");
    setNotice("");
    scrollTo(slotListRef);
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
        setNotice("Đã cập nhật lịch làm việc");
      } else {
        await apiRequest<DoctorSchedule>("/dashboard/doctor-schedules", {
          method: "POST",
          body: buildCreateSchedulePayload(scheduleForm),
        });
        setNotice("Đã tạo lịch làm việc");
      }
      setEditingSchedule(null);
      setScheduleForm(emptyScheduleForm);
      await loadSchedules();
      scrollTo(scheduleListRef);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được lịch làm việc");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSchedule = async () => {
    if (!canWrite || !deleteScheduleTarget) return;
    setError("");
    setNotice("");
    try {
      await apiRequest<DoctorSchedule>(`/dashboard/doctor-schedules/${deleteScheduleTarget.id}`, { method: "DELETE" });
      setNotice("Đã xoá lịch làm việc");
      setDeleteScheduleTarget(null);
      await loadSchedules();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không xoá được lịch làm việc");
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
      setNotice(`Đã sinh ${result.generatedCount} slot, tổng hiện có ${result.total} slot`);
      await loadSlots();
      scrollTo(slotListRef);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không sinh được slot");
    } finally {
      setSaving(false);
    }
  };

  const handleSlotStatus = async (slot: DoctorTimeSlot, status: TimeSlotStatus) => {
    if (!canWrite) return;
    const reason = status === "LOCKED" ? lockReason.trim() : null;
    if (status === "LOCKED" && (!reason || reason.length < 2)) {
      setError("Lý do khoá slot tối thiểu 2 ký tự");
      return;
    }

    setError("");
    setNotice("");
    try {
      await apiRequest<DoctorTimeSlot>(`/dashboard/doctor-time-slots/${slot.id}/status`, {
        method: "PATCH",
        body: { status, lockReason: reason },
      });
      setNotice("Đã cập nhật slot");
      setLockSlotTarget(null);
      setLockReason("");
      await loadSlots();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không cập nhật được slot");
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
      setNotice("Đã mở khoá slot");
      await loadSlots();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không mở khoá được slot");
    }
  };

  const handleDeleteSlot = async () => {
    if (!canWrite || !deleteSlotTarget) return;
    setError("");
    setNotice("");
    try {
      await apiRequest<DoctorTimeSlot>(`/dashboard/doctor-time-slots/${deleteSlotTarget.id}`, { method: "DELETE" });
      setNotice("Đã xoá slot");
      setDeleteSlotTarget(null);
      await loadSlots();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không xoá được slot");
    }
  };

  return (
    <div className={`grid gap-6 ${canWrite ? "xl:grid-cols-[minmax(0,1fr)_380px]" : ""}`}>
      {notice || error ? (
        <div className="fixed right-4 top-4 z-50 w-[calc(100%-2rem)] max-w-md sm:right-6 sm:top-6">
          <div className={`rounded-md border px-4 py-3 shadow-lg ${error ? "border-[#f2b8b5] bg-[#fff3f2] text-[#b3261e]" : "border-[#a8dab5] bg-[#f0fff4] text-[#1f7a3a]"}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{error ? "Có lỗi xảy ra" : "Thành công"}</p>
                <p className="mt-1 text-sm">{error || notice}</p>
              </div>
              <button type="button" onClick={() => { setError(""); setNotice(""); }} className="rounded-md px-2 text-lg leading-none opacity-70 hover:bg-black/5 hover:opacity-100" aria-label="Đóng thông báo">x</button>
            </div>
          </div>
        </div>
      ) : null}

      <section className="min-w-0 space-y-6">
        <section ref={scheduleListRef} className="scroll-mt-24 rounded-md border border-[#dce3ee] bg-white">
          <div className="flex flex-col gap-3 border-b border-[#e5ebf3] p-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-medium text-[#55708f]">{isDoctor ? "Lịch làm việc của tôi" : "Lịch mẫu theo tuần"}</p>
              <h2 className="mt-1 text-2xl font-semibold">Lịch làm việc bác sĩ</h2>
              <p className="mt-2 text-sm text-[#667892]">
                {isDoctor ? "Xem khung giờ làm việc cố định theo tuần. Việc tạo hoặc chỉnh lịch do Admin/Staff thực hiện." : "Tạo khung giờ lặp lại theo thứ để sinh slot khám theo ngày."}
              </p>
            </div>
            {canWrite ? <button onClick={startCreate} className="rounded-md bg-[#0d4f8b] px-4 py-2 text-sm font-semibold text-white hover:bg-[#083d6d]">Tạo lịch mẫu</button> : null}
          </div>
          <div className={`grid gap-3 border-b border-[#e5ebf3] p-4 ${isDoctor ? "lg:grid-cols-[160px_160px]" : "lg:grid-cols-[1fr_160px_160px]"}`}>
            {!isDoctor ? (
              <select value={doctorId} onChange={(e) => { setDoctorId(e.target.value); setSchedulePage(1); }} className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]">
                <option value="">Tất cả bác sĩ</option>
                {doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctorName(doctor)}</option>)}
              </select>
            ) : null}
            <select value={dayOfWeek} onChange={(e) => { setDayOfWeek(e.target.value); setSchedulePage(1); }} className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]">
              <option value="">Tất cả thứ</option>
              {dayOptions.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}
            </select>
            <select value={scheduleActive} onChange={(e) => { setScheduleActive(e.target.value); setSchedulePage(1); }} className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]">
              <option value="">Tất cả trạng thái</option>
              <option value="true">Đang dùng</option>
              <option value="false">Tạm tắt</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="text-[#667892]">
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Bác sĩ</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Thứ</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Giờ</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Slot</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Trạng thái</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loadingSchedules ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-[#667892]">Đang tải lịch...</td></tr>
                ) : schedules.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-[#667892]">Chưa có lịch mẫu</td></tr>
                ) : schedules.map((schedule) => (
                  <tr key={schedule.id}>
                    <td className="border-b border-[#eef2f7] px-4 py-3">
                      <p className="font-semibold">{doctorName(schedule.doctor)}</p>
                      <p className="mt-1 text-xs text-[#667892]">{schedule.doctor.department.name}</p>
                    </td>
                    <td className="border-b border-[#eef2f7] px-4 py-3">{dayOptions.find((day) => day.value === String(schedule.dayOfWeek))?.label}</td>
                    <td className="border-b border-[#eef2f7] px-4 py-3">{schedule.startTime} - {schedule.endTime}</td>
                    <td className="border-b border-[#eef2f7] px-4 py-3">{schedule.slotDuration} phút / tối đa {schedule.maxPatients}</td>
                    <td className="border-b border-[#eef2f7] px-4 py-3">
                      <span className={`rounded-md px-2 py-1 text-xs font-semibold ${schedule.isActive ? "bg-[#e7f6ed] text-[#1f7a3a]" : "bg-[#eef2f7] text-[#667892]"}`}>{schedule.isActive ? "Đang dùng" : "Tạm tắt"}</span>
                    </td>
                    <td className="border-b border-[#eef2f7] px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {canWrite ? (
                          <>
                            <button onClick={() => startEdit(schedule)} className="rounded-md border border-[#cfd8e6] px-3 py-1.5 text-xs font-medium text-[#42526b]">Sửa</button>
                            <button onClick={() => setDeleteScheduleTarget(schedule)} className="rounded-md border border-[#f2b8b5] px-3 py-1.5 text-xs font-medium text-[#b3261e]">Xoá</button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {deleteScheduleTarget ? (
            <div className="border-t border-[#f2d4d2] bg-[#fff8f7] p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#8f1d18]">Xoá lịch làm việc?</p>
                  <p className="mt-1 text-sm text-[#667892]">
                    {doctorName(deleteScheduleTarget.doctor)} - {dayOptions.find((day) => day.value === String(deleteScheduleTarget.dayOfWeek))?.label}, {deleteScheduleTarget.startTime} - {deleteScheduleTarget.endTime}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setDeleteScheduleTarget(null)} className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm font-medium text-[#42526b]">Giữ lại</button>
                  <button type="button" onClick={() => void handleDeleteSchedule()} className="rounded-md bg-[#b3261e] px-3 py-2 text-sm font-semibold text-white hover:bg-[#8f1d18]">Xoá lịch</button>
                </div>
              </div>
            </div>
          ) : null}
          <div className="flex items-center justify-between border-t border-[#e5ebf3] px-4 py-3 text-sm text-[#667892]">
            <span>{schedulePagination.total} kết quả, trang {schedulePagination.page}/{schedulePagination.totalPages || 1}</span>
            <div className="flex gap-2">
              <button disabled={schedulePage <= 1} onClick={() => setSchedulePage((current) => Math.max(current - 1, 1))} className="rounded-md border border-[#cfd8e6] px-3 py-1.5 font-medium disabled:opacity-50">Trước</button>
              <button disabled={schedulePage >= schedulePagination.totalPages} onClick={() => setSchedulePage((current) => current + 1)} className="rounded-md border border-[#cfd8e6] px-3 py-1.5 font-medium disabled:opacity-50">Sau</button>
            </div>
          </div>
        </section>

        <section ref={slotListRef} className="scroll-mt-24 rounded-md border border-[#dce3ee] bg-white">
          <div className="border-b border-[#e5ebf3] p-5">
            <p className="text-sm font-medium text-[#55708f]">{isDoctor ? "Slot khám của tôi" : "Slot khám theo ngày"}</p>
            <h2 className="mt-1 text-2xl font-semibold">Slot khám</h2>
            <p className="mt-2 text-sm text-[#667892]">
              {isDoctor ? "Theo dõi slot khám theo ngày, trạng thái đặt lịch và lý do khóa nếu có." : "Sinh slot từ lịch mẫu, khoá/mở khoá, huỷ hoặc xoá slot chưa được đặt."}
            </p>
          </div>
          {isDoctor ? (
            <div className="grid gap-3 border-b border-[#e5ebf3] p-4 sm:grid-cols-2 xl:grid-cols-4">
              <button type="button" onClick={() => setSlotQuickFilter("", today())} className="rounded-md border border-[#cfe4fa] bg-[#f3f8ff] p-4 text-left text-[#0d4f8b] transition hover:-translate-y-0.5 hover:shadow-sm"><p className="text-sm font-medium opacity-80">Slot đang lọc</p><p className="mt-2 text-2xl font-semibold">{slotSummary.total}</p><p className="mt-1 text-xs opacity-75">Toàn bộ slot trong ngày</p></button>
              <button type="button" onClick={() => setSlotQuickFilter("AVAILABLE", today())} className="rounded-md border border-[#c7ead0] bg-[#f0fff4] p-4 text-left text-[#1f7a3a] transition hover:-translate-y-0.5 hover:shadow-sm"><p className="text-sm font-medium opacity-80">Còn trống</p><p className="mt-2 text-2xl font-semibold">{slotSummary.available}</p><p className="mt-1 text-xs opacity-75">Có thể nhận đặt lịch</p></button>
              <button type="button" onClick={() => setSlotQuickFilter("BOOKED", today())} className="rounded-md border border-[#cfe4fa] bg-[#f3f8ff] p-4 text-left text-[#0d4f8b] transition hover:-translate-y-0.5 hover:shadow-sm"><p className="text-sm font-medium opacity-80">Đã đặt</p><p className="mt-2 text-2xl font-semibold">{slotSummary.booked}</p><p className="mt-1 text-xs opacity-75">Có lịch hẹn liên quan</p></button>
              <button type="button" onClick={() => setSlotQuickFilter("LOCKED", today())} className="rounded-md border border-[#f4d7a1] bg-[#fff8eb] p-4 text-left text-[#946200] transition hover:-translate-y-0.5 hover:shadow-sm"><p className="text-sm font-medium opacity-80">Đã khóa</p><p className="mt-2 text-2xl font-semibold">{slotSummary.locked}</p><p className="mt-1 text-xs opacity-75">Không nhận đặt lịch</p></button>
            </div>
          ) : null}
          <div className={`grid gap-3 border-b border-[#e5ebf3] p-4 ${isDoctor ? "lg:grid-cols-[160px_190px]" : "lg:grid-cols-[1fr_160px_190px]"}`}>
            {!isDoctor ? (
            <select value={slotDoctorId} onChange={(e) => { setSlotDoctorId(e.target.value); setSlotPage(1); }} className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]">
              <option value="">Tất cả bác sĩ</option>
              {doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctorName(doctor)}</option>)}
            </select>
            ) : null}
            <VietnamDateInput value={slotDate} onChange={(value) => { setSlotDate(value); setSlotPage(1); }} ariaLabel="Ngày lọc slot" className="w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" />
            <select value={slotStatus} onChange={(e) => { setSlotStatus(e.target.value); setSlotPage(1); }} className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]">
              {slotStatuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="text-[#667892]">
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Ngày</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Bác sĩ</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Giờ</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Trạng thái</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Lịch hẹn</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loadingSlots ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-[#667892]">Đang tải slot...</td></tr>
                ) : slots.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-[#667892]">Chưa có slot phù hợp</td></tr>
                ) : slots.map((slot) => {
                  const status = effectiveSlotStatus(slot);

                  return (
                    <tr key={slot.id}>
                      <td className="border-b border-[#eef2f7] px-4 py-3">{formatDate(slot.date)}</td>
                      <td className="border-b border-[#eef2f7] px-4 py-3">
                        <p className="font-semibold">{doctorName(slot.doctor)}</p>
                        <p className="mt-1 text-xs text-[#667892]">{slot.doctor.department.name}</p>
                      </td>
                      <td className="border-b border-[#eef2f7] px-4 py-3">{slot.startTime} - {slot.endTime}</td>
                      <td className="border-b border-[#eef2f7] px-4 py-3">
                        <span className={`rounded-md px-2 py-1 text-xs font-semibold ${status.className}`}>{status.label}</span>
                        {status.note ? <p className="mt-1 text-xs text-[#667892]">{status.note}</p> : null}
                        {slot.lockReason ? <p className="mt-1 text-xs text-[#667892]">{slot.lockReason}</p> : null}
                      </td>
                      <td className="border-b border-[#eef2f7] px-4 py-3">{slot.appointment?.bookingCode || "-"}</td>
                      <td className="border-b border-[#eef2f7] px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {canWrite && !slot.appointment && slot.status !== "BOOKED" ? (
                            <>
                              {slot.status === "LOCKED" ? (
                                <button onClick={() => void handleUnlockSlot(slot)} className="rounded-md border border-[#cfd8e6] px-3 py-1.5 text-xs font-medium text-[#42526b]">Mở khoá</button>
                              ) : (
                                <button onClick={() => startLockSlot(slot)} className="rounded-md border border-[#cfd8e6] px-3 py-1.5 text-xs font-medium text-[#42526b]">Khoá</button>
                              )}
                              {slot.status !== "CANCELLED" ? <button onClick={() => void handleSlotStatus(slot, "CANCELLED")} className="rounded-md border border-[#cfd8e6] px-3 py-1.5 text-xs font-medium text-[#42526b]">Huỷ</button> : null}
                              {slot.status !== "AVAILABLE" ? <button onClick={() => void handleSlotStatus(slot, "AVAILABLE")} className="rounded-md border border-[#cfd8e6] px-3 py-1.5 text-xs font-medium text-[#42526b]">Trống</button> : null}
                              <button onClick={() => { setDeleteSlotTarget(slot); setLockSlotTarget(null); }} className="rounded-md border border-[#f2b8b5] px-3 py-1.5 text-xs font-medium text-[#b3261e]">Xoá</button>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {lockSlotTarget ? (
            <form
              className="border-t border-[#dce3ee] bg-[#f8fbff] p-4"
              onSubmit={(event) => {
                event.preventDefault();
                void handleSlotStatus(lockSlotTarget, "LOCKED");
              }}
            >
              <div className="grid gap-3 lg:grid-cols-[1fr_2fr_auto] lg:items-end">
                <div>
                  <p className="text-sm font-semibold text-[#0d4f8b]">Khoá slot khám</p>
                  <p className="mt-1 text-sm text-[#667892]">{formatDate(lockSlotTarget.date)} - {lockSlotTarget.startTime} đến {lockSlotTarget.endTime}</p>
                </div>
                <label className="block">
                  <span className="text-sm font-medium text-[#334155]">Lý do khoá</span>
                  <input
                    value={lockReason}
                    onChange={(event) => setLockReason(event.target.value)}
                    className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]"
                    placeholder="Ví dụ: bác sĩ bận họp chuyên môn"
                    required
                    minLength={2}
                  />
                </label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setLockSlotTarget(null); setLockReason(""); }} className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm font-medium text-[#42526b]">Huỷ</button>
                  <button type="submit" className="rounded-md bg-[#0d4f8b] px-3 py-2 text-sm font-semibold text-white hover:bg-[#083d6d]">Khoá slot</button>
                </div>
              </div>
            </form>
          ) : null}
          {deleteSlotTarget ? (
            <div className="border-t border-[#f2d4d2] bg-[#fff8f7] p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#8f1d18]">Xoá slot khám?</p>
                  <p className="mt-1 text-sm text-[#667892]">
                    {formatDate(deleteSlotTarget.date)} - {deleteSlotTarget.startTime} đến {deleteSlotTarget.endTime}, {doctorName(deleteSlotTarget.doctor)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setDeleteSlotTarget(null)} className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm font-medium text-[#42526b]">Giữ lại</button>
                  <button type="button" onClick={() => void handleDeleteSlot()} className="rounded-md bg-[#b3261e] px-3 py-2 text-sm font-semibold text-white hover:bg-[#8f1d18]">Xoá slot</button>
                </div>
              </div>
            </div>
          ) : null}
          <div className="flex items-center justify-between border-t border-[#e5ebf3] px-4 py-3 text-sm text-[#667892]">
            <span>{slotPagination.total} kết quả, trang {slotPagination.page}/{slotPagination.totalPages || 1}</span>
            <div className="flex gap-2">
              <button disabled={slotPage <= 1} onClick={() => setSlotPage((current) => Math.max(current - 1, 1))} className="rounded-md border border-[#cfd8e6] px-3 py-1.5 font-medium disabled:opacity-50">Trước</button>
              <button disabled={slotPage >= slotPagination.totalPages} onClick={() => setSlotPage((current) => current + 1)} className="rounded-md border border-[#cfd8e6] px-3 py-1.5 font-medium disabled:opacity-50">Sau</button>
            </div>
          </div>
        </section>
      </section>

      {canWrite ? (
        <aside className="space-y-4">
          <section ref={formPanelRef} className="scroll-mt-24 rounded-md border border-[#dce3ee] bg-white p-5">
            <h3 className="text-lg font-semibold">{editingSchedule ? "Cập nhật lịch mẫu" : "Tạo lịch mẫu"}</h3>
            <form className="mt-5 space-y-4" onSubmit={handleScheduleSubmit}>
              <label className="block">
                <span className="text-sm font-medium text-[#334155]">Bác sĩ</span>
                {editingSchedule ? (
                  <input value={doctorName(editingSchedule.doctor)} disabled className="mt-1 w-full rounded-md border border-[#cfd8e6] bg-[#f6f8fb] px-3 py-2 text-sm text-[#667892]" />
                ) : (
                  <select value={scheduleForm.doctorId} onChange={(e) => setScheduleForm((current) => ({ ...current, doctorId: e.target.value }))} className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" required>
                    <option value="">Chọn bác sĩ</option>
                    {doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctorName(doctor)}</option>)}
                  </select>
                )}
              </label>
              <label className="block">
                <span className="text-sm font-medium text-[#334155]">Thứ trong tuần</span>
                <select value={scheduleForm.dayOfWeek} onChange={(e) => setScheduleForm((current) => ({ ...current, dayOfWeek: e.target.value }))} className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" required>
                  {dayOptions.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}
                </select>
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-[#334155]">Bắt đầu</span>
                  <input type="time" value={scheduleForm.startTime} onChange={(e) => setScheduleForm((current) => ({ ...current, startTime: e.target.value }))} className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" required />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-[#334155]">Kết thúc</span>
                  <input type="time" value={scheduleForm.endTime} onChange={(e) => setScheduleForm((current) => ({ ...current, endTime: e.target.value }))} className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" required />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-[#334155]">Thời lượng slot</span>
                  <input value={scheduleForm.slotDuration} onChange={(e) => setScheduleForm((current) => ({ ...current, slotDuration: e.target.value.replace(/\D/g, "") }))} inputMode="numeric" className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" required />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-[#334155]">Tối đa BN</span>
                  <input value={scheduleForm.maxPatients} onChange={(e) => setScheduleForm((current) => ({ ...current, maxPatients: e.target.value.replace(/\D/g, "") }))} inputMode="numeric" className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" required />
                </label>
              </div>
              <label className="flex items-center justify-between rounded-md border border-[#e5ebf3] px-3 py-2">
                <span className="text-sm font-medium text-[#334155]">Đang dùng</span>
                <input type="checkbox" checked={scheduleForm.isActive} onChange={(e) => setScheduleForm((current) => ({ ...current, isActive: e.target.checked }))} className="h-4 w-4 accent-[#0d4f8b]" />
              </label>
              <div className="flex gap-2">
                <button disabled={saving} className="flex-1 rounded-md bg-[#0d4f8b] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#083d6d] disabled:opacity-60">{saving ? "Đang lưu..." : editingSchedule ? "Lưu lịch" : "Tạo lịch"}</button>
                {editingSchedule ? <button type="button" onClick={startCreate} className="rounded-md border border-[#cfd8e6] px-4 py-2.5 text-sm font-medium text-[#42526b]">Huỷ</button> : null}
              </div>
            </form>
          </section>

          <section className="rounded-md border border-[#dce3ee] bg-white p-5">
            <h3 className="text-lg font-semibold">Sinh slot theo ngày</h3>
            <p className="mt-2 text-sm leading-6 text-[#667892]">Chọn bác sĩ và ngày. Backend sẽ sinh slot từ lịch mẫu đúng với thứ của ngày đó.</p>
            <form className="mt-5 space-y-4" onSubmit={handleGenerateSlots}>
              <label className="block">
                <span className="text-sm font-medium text-[#334155]">Bác sĩ</span>
                <select value={generateDoctorId} onChange={(e) => setGenerateDoctorId(e.target.value)} className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" required>
                  <option value="">Chọn bác sĩ</option>
                  {doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctorName(doctor)}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-[#334155]">Ngày sinh slot</span>
                <VietnamDateInput value={generateDate} onChange={setGenerateDate} required ariaLabel="Ngày sinh slot" className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" />
              </label>
              <button disabled={saving} className="w-full rounded-md bg-[#0d4f8b] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#083d6d] disabled:opacity-60">{saving ? "Đang sinh..." : "Sinh slot"}</button>
            </form>
          </section>
        </aside>
      ) : null}
    </div>
  );
}
