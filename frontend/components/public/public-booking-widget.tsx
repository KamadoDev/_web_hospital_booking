"use client";

import { Dispatch, SetStateAction, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, CheckCircle2, Clock, Copy, CreditCard, Info, Loader2, Send, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import { formatVietnamDate, getVietnamDateInput, getVietnamTimeInput, getVietnamYesterdayDateInput } from "@/lib/date";
import type { Appointment } from "@/lib/types";
import { VietnamDateInput } from "@/components/ui/vietnam-date-input";
import type { HomeSelection, PublicHomeData } from "./public-home-types";
import { ScrollReveal } from "./scroll-reveal";

type PublicSlot = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
};

type BookingDraft = {
  date: string;
  timeSlotId: string;
  patientName: string;
  patientPhone: string;
  patientEmail: string;
  otpChannel: "SMS" | "EMAIL";
  reason: string;
  gender: "" | "MALE" | "FEMALE" | "OTHER";
  dateOfBirth: string;
  address: string;
  cccd: string;
  hasBHYT: boolean;
  healthInsuranceCode: string;
  registeredHospital: string;
  allergies: string;
  medicalHistory: string;
  familyHistory: string;
};

type PendingAppointment = {
  appointmentId: string;
  bookingCode: string;
  patientPhone: string;
  expiresIn: number;
};

type PublicBookingWidgetProps = {
  data: PublicHomeData;
  loading: boolean;
  selection: HomeSelection;
  setSelection: Dispatch<SetStateAction<HomeSelection>>;
};

const phoneRegex = /^(0|\+84)[0-9]{9,10}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const initialDraft: BookingDraft = {
  date: getVietnamDateInput(),
  timeSlotId: "",
  patientName: "",
  patientPhone: "",
  patientEmail: "",
  otpChannel: "SMS",
  reason: "",
  gender: "",
  dateOfBirth: "",
  address: "",
  cccd: "",
  hasBHYT: false,
  healthInsuranceCode: "",
  registeredHospital: "",
  allergies: "",
  medicalHistory: "",
  familyHistory: "",
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value || 0);

const doctorName = (doctor: PublicHomeData["doctors"][number]) =>
  [doctor.title, doctor.user.fullName].filter(Boolean).join(" ");

const formatTime = (value: string) => value.slice(0, 5);

export function PublicBookingWidget({ data, loading, selection, setSelection }: PublicBookingWidgetProps) {
  const [draft, setDraft] = useState<BookingDraft>(initialDraft);
  const [slots, setSlots] = useState<PublicSlot[]>([]);
  const [slotLoading, setSlotLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState<PendingAppointment | null>(null);
  const [otp, setOtp] = useState("");
  const [verifiedAppointment, setVerifiedAppointment] = useState<Appointment | null>(null);
  const [showAdditionalInfo, setShowAdditionalInfo] = useState(false);
  const resultRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const date = params.get("date");
      const timeSlotId = params.get("timeSlotId");

      if (!date && !timeSlotId) return;

      setDraft((current) => ({
        ...current,
        date: date || current.date,
        timeSlotId: timeSlotId || current.timeSlotId,
      }));
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const selectedDepartment = data.departments.find((item) => item.id === selection.departmentId);
  const selectedDoctor = data.doctors.find((item) => item.id === selection.doctorId);
  const selectedPackage = data.packages.find((item) => item.id === selection.packageId);
  const selectedSlot = slots.find((slot) => slot.id === draft.timeSlotId);
  const filteredDoctors = selection.departmentId
    ? data.doctors.filter((item) => item.department.id === selection.departmentId)
    : data.doctors;
  const filteredPackages = selection.departmentId
    ? data.packages.filter((item) => !item.department?.id || item.department.id === selection.departmentId)
    : data.packages;

  const selectedSummary = useMemo(() => {
    const amount = selectedPackage?.finalPrice || selectedDoctor?.consultationFee || 0;

    return {
      departmentName: selectedDepartment?.name || "Chưa chọn chuyên khoa",
      doctorName: selectedDoctor ? doctorName(selectedDoctor) : "Chưa chọn bác sĩ",
      packageName: selectedPackage?.name || "Khám theo bác sĩ",
      amount,
    };
  }, [selectedDepartment, selectedDoctor, selectedPackage]);

  useEffect(() => {
    if (!selection.doctorId || !draft.date) {
      return;
    }

    let active = true;

    const loadSlots = async () => {
      setSlotLoading(true);
      setError("");

      try {
        const result = await apiRequest<PublicSlot[]>(`/doctors/${selection.doctorId}/available-slots`, {
          query: { date: draft.date },
        });

        if (!active) return;
        setSlots(result);
        setDraft((current) => ({
          ...current,
          timeSlotId: result.some((slot) => slot.id === current.timeSlotId) ? current.timeSlotId : "",
        }));
      } catch (err) {
        if (active) {
          setSlots([]);
          setDraft((current) => ({ ...current, timeSlotId: "" }));
          setError(err instanceof Error ? err.message : "Không tải được khung giờ khám");
        }
      } finally {
        if (active) setSlotLoading(false);
      }
    };

    void loadSlots();

    return () => {
      active = false;
    };
  }, [draft.date, selection.doctorId]);

  useEffect(() => {
    if (pending || verifiedAppointment) {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [pending, verifiedAppointment]);

  const updateSelection = (patch: Partial<HomeSelection>) => {
    setPending(null);
    setVerifiedAppointment(null);
    setOtp("");
    setMessage("");
    setError("");
    if (patch.doctorId === "") {
      setSlots([]);
    }
    setSelection((current) => ({ ...current, ...patch }));
  };

  const updateDraft = (patch: Partial<BookingDraft>) => {
    setPending(null);
    setVerifiedAppointment(null);
    setOtp("");
    setMessage("");
    setError("");
    setDraft((current) => ({ ...current, ...patch }));
  };

  const validateDraft = () => {
    if (!selection.departmentId) return "Vui lòng chọn chuyên khoa.";
    if (!selection.doctorId) return "Vui lòng chọn bác sĩ.";
    if (!draft.date) return "Vui lòng chọn ngày khám.";
    if (draft.date < getVietnamDateInput()) return "Ngày khám không được nhỏ hơn ngày hiện tại.";
    if (!draft.timeSlotId) return "Vui lòng chọn khung giờ khám.";
    if (draft.patientName.trim().length < 2) return "Họ tên bệnh nhân tối thiểu 2 ký tự.";
    if (!phoneRegex.test(draft.patientPhone.trim())) return "Số điện thoại không hợp lệ.";
    if (draft.patientEmail.trim() && !emailRegex.test(draft.patientEmail.trim())) return "Email không hợp lệ.";
    if (draft.otpChannel === "EMAIL" && !draft.patientEmail.trim()) return "Email là bắt buộc khi xác thực OTP qua email.";
    if (draft.dateOfBirth && draft.dateOfBirth >= getVietnamDateInput()) return "Ngày sinh phải nhỏ hơn ngày hiện tại.";
    if (draft.hasBHYT && !draft.healthInsuranceCode.trim()) return "Vui lòng nhập mã thẻ BHYT.";

    return "";
  };

  const createAppointment = async () => {
    setError("");
    setMessage("");

    const validationError = validateDraft();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);

    try {
      const result = await apiRequest<PendingAppointment>("/appointments", {
        method: "POST",
        body: {
          packageId: selection.packageId || null,
          departmentId: selection.departmentId,
          doctorId: selection.doctorId,
          timeSlotId: draft.timeSlotId,
          patientName: draft.patientName.trim(),
          patientPhone: draft.patientPhone.trim(),
          patientEmail: draft.patientEmail.trim() || null,
          otpChannel: draft.otpChannel,
          reason: draft.reason.trim() || null,
          gender: draft.gender || null,
          dateOfBirth: draft.dateOfBirth || null,
          cccd: draft.cccd.trim() || null,
          address: draft.address.trim() || null,
          hasBHYT: draft.hasBHYT,
          healthInsuranceCode: draft.healthInsuranceCode.trim() || null,
          registeredHospital: draft.registeredHospital.trim() || null,
          allergies: draft.allergies.trim() || null,
          medicalHistory: draft.medicalHistory.trim() || null,
          familyHistory: draft.familyHistory.trim() || null,
        },
      });

      setPending(result);
      setMessage(`Đã gửi OTP xác nhận cho lịch ${result.bookingCode}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tạo được lịch hẹn");
    } finally {
      setSubmitting(false);
    }
  };

  const verifyOtp = async () => {
    if (!pending) return;
    setError("");
    setMessage("");

    if (!/^[0-9]{6}$/.test(otp)) {
      setError("OTP phải gồm đúng 6 chữ số.");
      return;
    }

    setSubmitting(true);

    try {
      const result = await apiRequest<Appointment>(`/appointments/${pending.appointmentId}/verify-otp`, {
        method: "POST",
        body: { otp },
      });

      setVerifiedAppointment(result);
      setPending(null);
      setMessage("Xác thực OTP thành công. Lịch hẹn đang chờ bệnh viện xác nhận.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xác thực OTP thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  const resendOtp = async () => {
    if (!pending) return;
    setError("");
    setMessage("");
    setSubmitting(true);

    try {
      const result = await apiRequest<{ expiresIn: number }>(`/appointments/${pending.appointmentId}/resend-otp`, {
        method: "POST",
      });

      setPending((current) => (current ? { ...current, expiresIn: result.expiresIn } : current));
      setMessage("OTP đã được gửi lại.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không gửi lại được OTP");
    } finally {
      setSubmitting(false);
    }
  };

  const copyBookingCode = async (bookingCode: string) => {
    try {
      await navigator.clipboard.writeText(bookingCode);
      setMessage("Đã sao chép mã lịch. Vui lòng lưu lại để tra cứu hoặc xác thực sau.");
    } catch {
      setMessage(`Mã lịch của bạn là ${bookingCode}. Vui lòng lưu lại để tra cứu hoặc xác thực sau.`);
    }
  };

  return (
    <section id="booking" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-10 sm:px-6 lg:px-8">
      <ScrollReveal>
        <div className="grid gap-6 rounded-md border border-[#cfe0f3] bg-gradient-to-b from-[#f4f9ff] via-white to-white p-4 shadow-[0_18px_50px_rgba(13,79,139,0.10)] ring-1 ring-[#e7f0fb] sm:p-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <div className="flex items-start gap-3 rounded-md border border-[#d8e9ff] bg-white/80 p-4 shadow-sm">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-[#e7f0fb] text-[#0d4f8b]">
                <CalendarDays className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-[#0d4f8b]">Đặt lịch nhanh</p>
                <h2 className="mt-1 text-2xl font-semibold text-[#172033]">Chọn lịch khám và xác thực OTP</h2>
                <p className="mt-2 text-sm leading-6 text-[#667892]">Chọn chuyên khoa, bác sĩ và khung giờ phù hợp. Sau đó nhập thông tin để bệnh viện gửi OTP giữ lịch.</p>
              </div>
            </div>

            <div className="mt-5 rounded-md border border-[#d8e9ff] bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#172033]">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[#e7f0fb] text-[#0d4f8b]">
                  <CalendarDays className="h-4 w-4" aria-hidden="true" />
                </span>
                Lựa chọn lịch khám
              </div>
            <div className="grid gap-3 md:grid-cols-3">
              <select
                value={selection.departmentId}
                onChange={(event) => {
                  updateSelection({ departmentId: event.target.value, doctorId: "", packageId: "" });
                  updateDraft({ timeSlotId: "" });
                }}
                className="rounded-md border border-[#cfd8e6] bg-[#fbfdff] px-3 py-3 text-sm outline-none transition focus:border-[#0d4f8b] focus:bg-white focus:ring-2 focus:ring-[#cfe4fa]"
                disabled={loading}
              >
                <option value="">Chọn chuyên khoa</option>
                {data.departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <select
                value={selection.doctorId}
                onChange={(event) => {
                  updateSelection({ doctorId: event.target.value });
                  updateDraft({ timeSlotId: "" });
                }}
                className="rounded-md border border-[#cfd8e6] bg-[#fbfdff] px-3 py-3 text-sm outline-none transition focus:border-[#0d4f8b] focus:bg-white focus:ring-2 focus:ring-[#cfe4fa]"
                disabled={loading || !selection.departmentId}
              >
                <option value="">Chọn bác sĩ</option>
                {filteredDoctors.map((item) => <option key={item.id} value={item.id}>{doctorName(item)}</option>)}
              </select>
              <select
                value={selection.packageId}
                onChange={(event) => updateSelection({ packageId: event.target.value })}
                className="rounded-md border border-[#cfd8e6] bg-[#fbfdff] px-3 py-3 text-sm outline-none transition focus:border-[#0d4f8b] focus:bg-white focus:ring-2 focus:ring-[#cfe4fa]"
                disabled={loading}
              >
                <option value="">Chọn gói khám</option>
                {filteredPackages.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </div>

            <div className="mt-4 grid gap-4 rounded-md border border-[#e5ebf3] bg-[#f8fbff] p-3 md:grid-cols-[220px_minmax(0,1fr)]">
              <label className="block">
                <span className="text-sm font-medium text-[#334155]">Ngày khám</span>
                <VietnamDateInput
                  value={draft.date}
                  min={getVietnamDateInput()}
                  onChange={(value) => updateDraft({ date: value, timeSlotId: "" })}
                  ariaLabel="Ngày khám"
                  className="mt-1 w-full rounded-md border border-[#cfd8e6] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]"
                />
                <span className="mt-1 block text-xs text-[#667892]">Hiển thị theo ngày/tháng/năm, múi giờ Việt Nam</span>
              </label>
              <div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-[#334155]">Khung giờ trống</span>
                  {slotLoading ? (
                    <span className="inline-flex items-center gap-1 text-xs text-[#667892]">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Đang tải
                    </span>
                  ) : null}
                </div>
                <div className="mt-2 flex min-h-11 flex-wrap gap-2">
                  {!selection.doctorId ? (
                    <span className="rounded-md border border-dashed border-[#dce3ee] px-3 py-2 text-sm text-[#667892]">Chọn bác sĩ để xem slot.</span>
                  ) : slotLoading ? (
                    Array.from({ length: 4 }).map((_, index) => <span key={index} className="skeleton-shimmer h-10 w-24 rounded-md" />)
                  ) : slots.length ? slots.map((slot) => (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => updateDraft({ timeSlotId: slot.id })}
                      className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition ${
                        draft.timeSlotId === slot.id
                      ? "border-[#0d4f8b] bg-[#e7f0fb] text-[#0d4f8b] shadow-[0_8px_18px_rgba(13,79,139,0.14)] ring-2 ring-[#cfe4fa]"
                      : "border-[#cfd8e6] bg-white text-[#42526b] hover:border-[#0d4f8b] hover:bg-[#f8fbff]"
                      }`}
                    >
                      <Clock className="h-4 w-4" />
                      {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                    </button>
                  )) : (
                    <span className="rounded-md border border-dashed border-[#dce3ee] px-3 py-2 text-sm text-[#667892]">
                      {draft.date === getVietnamDateInput()
                        ? `Không còn khung giờ khả dụng hôm nay sau ${getVietnamTimeInput()}. Các slot đã qua giờ sẽ không hiển thị cho người bệnh.`
                        : `Chưa có khung giờ trống trong ngày ${formatVietnamDate(draft.date)}.`}
                    </span>
                  )}
                </div>
              </div>
            </div>
            </div>

            <div className="mt-5 rounded-md border border-[#d8e9ff] bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#e7f0fb] text-[#0d4f8b]">
                  <UserRound className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#172033]">Thông tin bắt buộc</p>
                  <p className="mt-1 text-sm text-[#667892]">Chỉ cần đủ thông tin liên hệ để bệnh viện gửi OTP và xác nhận lịch.</p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-[#334155]">Họ tên bệnh nhân</span>
                  <input value={draft.patientName} onChange={(event) => updateDraft({ patientName: event.target.value })} className="mt-1 w-full rounded-md border border-[#cfd8e6] bg-[#fbfdff] px-3 py-2.5 text-sm outline-none transition focus:border-[#0d4f8b] focus:bg-white focus:ring-2 focus:ring-[#cfe4fa]" required />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-[#334155]">Số điện thoại</span>
                  <input value={draft.patientPhone} onChange={(event) => updateDraft({ patientPhone: event.target.value })} placeholder="0901234567" className="mt-1 w-full rounded-md border border-[#cfd8e6] bg-[#fbfdff] px-3 py-2.5 text-sm outline-none transition focus:border-[#0d4f8b] focus:bg-white focus:ring-2 focus:ring-[#cfe4fa]" required />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-[#334155]">Kênh OTP</span>
                  <select value={draft.otpChannel} onChange={(event) => updateDraft({ otpChannel: event.target.value as BookingDraft["otpChannel"] })} className="mt-1 w-full rounded-md border border-[#cfd8e6] bg-[#fbfdff] px-3 py-2.5 text-sm outline-none transition focus:border-[#0d4f8b] focus:bg-white focus:ring-2 focus:ring-[#cfe4fa]">
                    <option value="SMS">SMS</option>
                    <option value="EMAIL">Email</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-[#334155]">Email {draft.otpChannel === "EMAIL" ? "(bắt buộc)" : "(không bắt buộc)"}</span>
                  <input value={draft.patientEmail} onChange={(event) => updateDraft({ patientEmail: event.target.value })} placeholder="Nhập nếu xác thực qua email" className="mt-1 w-full rounded-md border border-[#cfd8e6] bg-[#fbfdff] px-3 py-2.5 text-sm outline-none transition focus:border-[#0d4f8b] focus:bg-white focus:ring-2 focus:ring-[#cfe4fa]" />
                </label>
                <label className="block md:col-span-2">
                  <span className="text-sm font-medium text-[#334155]">Lý do khám</span>
                  <textarea value={draft.reason} onChange={(event) => updateDraft({ reason: event.target.value })} rows={3} placeholder="Ví dụ: đau đầu, tái khám, tư vấn kết quả..." className="mt-1 w-full rounded-md border border-[#cfd8e6] bg-[#fbfdff] px-3 py-2.5 text-sm outline-none transition focus:border-[#0d4f8b] focus:bg-white focus:ring-2 focus:ring-[#cfe4fa]" />
                </label>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-md border border-[#d8e9ff] bg-white shadow-sm">
              <button
                type="button"
                onClick={() => setShowAdditionalInfo((current) => !current)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
              >
                <span>
                  <span className="block text-sm font-semibold text-[#172033]">Thông tin bổ sung</span>
                  <span className="mt-1 block text-sm text-[#667892]">Ngày sinh, BHYT và tiền sử bệnh. Có thể nhập để hồ sơ khám đầy đủ hơn.</span>
                </span>
                <span className="shrink-0 rounded-md border border-[#cfd8e6] px-3 py-1.5 text-xs font-semibold text-[#42526b]">
                  {showAdditionalInfo ? "Ẩn bớt" : "Nhập thêm"}
                </span>
              </button>

              {showAdditionalInfo ? (
                <div className="grid gap-3 border-t border-[#e5ebf3] p-4 md:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium text-[#334155]">Giới tính</span>
                    <select value={draft.gender} onChange={(event) => updateDraft({ gender: event.target.value as BookingDraft["gender"] })} className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2.5 text-sm outline-none focus:border-[#0d4f8b]">
                      <option value="">Chưa chọn</option>
                      <option value="MALE">Nam</option>
                      <option value="FEMALE">Nữ</option>
                      <option value="OTHER">Khác</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-[#334155]">Ngày sinh</span>
                    <VietnamDateInput max={getVietnamYesterdayDateInput()} value={draft.dateOfBirth} onChange={(value) => updateDraft({ dateOfBirth: value })} ariaLabel="Ngày sinh" className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2.5 text-sm outline-none focus:border-[#0d4f8b]" />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-[#334155]">CCCD</span>
                    <input value={draft.cccd} onChange={(event) => updateDraft({ cccd: event.target.value })} className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2.5 text-sm outline-none focus:border-[#0d4f8b]" />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-[#334155]">Địa chỉ</span>
                    <input value={draft.address} onChange={(event) => updateDraft({ address: event.target.value })} className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2.5 text-sm outline-none focus:border-[#0d4f8b]" />
                  </label>
                  <label className="flex items-center gap-2 rounded-md border border-[#dce3ee] px-3 py-2 text-sm text-[#42526b]">
                    <input type="checkbox" checked={draft.hasBHYT} onChange={(event) => updateDraft({ hasBHYT: event.target.checked })} />
                    Có bảo hiểm y tế
                  </label>
                  {draft.hasBHYT ? (
                    <>
                      <input value={draft.healthInsuranceCode} onChange={(event) => updateDraft({ healthInsuranceCode: event.target.value })} placeholder="Mã thẻ BHYT" className="rounded-md border border-[#cfd8e6] px-3 py-2.5 text-sm outline-none focus:border-[#0d4f8b]" />
                      <input value={draft.registeredHospital} onChange={(event) => updateDraft({ registeredHospital: event.target.value })} placeholder="Nơi đăng ký khám chữa bệnh ban đầu" className="rounded-md border border-[#cfd8e6] px-3 py-2.5 text-sm outline-none focus:border-[#0d4f8b] md:col-span-2" />
                    </>
                  ) : null}
                  <label className="block md:col-span-2">
                    <span className="text-sm font-medium text-[#334155]">Dị ứng</span>
                    <textarea value={draft.allergies} onChange={(event) => updateDraft({ allergies: event.target.value })} rows={2} placeholder="Thuốc, thức ăn hoặc tác nhân từng gây dị ứng" className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2.5 text-sm outline-none focus:border-[#0d4f8b]" />
                  </label>
                  <label className="block md:col-span-2">
                    <span className="text-sm font-medium text-[#334155]">Tiền sử bệnh</span>
                    <textarea value={draft.medicalHistory} onChange={(event) => updateDraft({ medicalHistory: event.target.value })} rows={2} placeholder="Bệnh nền, phẫu thuật, thuốc đang dùng..." className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2.5 text-sm outline-none focus:border-[#0d4f8b]" />
                  </label>
                  <label className="block md:col-span-2">
                    <span className="text-sm font-medium text-[#334155]">Tiền sử gia đình</span>
                    <textarea value={draft.familyHistory} onChange={(event) => updateDraft({ familyHistory: event.target.value })} rows={2} placeholder="Các bệnh di truyền hoặc bệnh thường gặp trong gia đình" className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2.5 text-sm outline-none focus:border-[#0d4f8b]" />
                  </label>
                </div>
              ) : null}
            </div>

            {error ? (
              <div className="mt-5 flex items-start gap-2 rounded-md border border-[#f2b8b5] bg-[#fff3f2] px-4 py-3 text-sm font-medium text-[#b3261e] shadow-sm">
                <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </div>
            ) : null}

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => void createAppointment()}
                disabled={submitting || loading}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0d4f8b] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(13,79,139,0.22)] transition hover:-translate-y-0.5 hover:bg-[#083d6d] disabled:translate-y-0 disabled:opacity-60"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Tạo lịch và gửi OTP
              </button>
              <span className="text-sm text-[#667892]">
                Sau khi xác thực OTP, lịch sẽ chuyển sang trạng thái chờ xác nhận.{" "}
                <Link href="/guide/booking" className="font-semibold text-[#0d4f8b]">Cần hướng dẫn?</Link>
              </span>
            </div>
          </div>

          <aside ref={resultRef} className="scroll-mt-24 rounded-md border border-[#d8e9ff] bg-white p-4 shadow-sm lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-md border border-[#e5ebf3] bg-[#f8fbff] p-4">
              <p className="text-sm font-semibold text-[#172033]">Tóm tắt lịch hẹn</p>
              <div className="mt-3 space-y-2 text-sm">
                <SummaryLink
                  label="Chuyên khoa"
                  value={selectedSummary.departmentName}
                  hint={selectedDepartment ? "Bấm để xem nhanh thông tin khoa" : "Chọn khoa để hệ thống lọc bác sĩ và gói khám"}
                  href={selectedDepartment ? selectedDepartment.slug ? `/departments/${selectedDepartment.slug}` : `/departments` : undefined}
                />
                <SummaryLink
                  label="Bác sĩ"
                  value={selectedSummary.doctorName}
                  hint={selectedDoctor ? "Bấm để xem nhanh hồ sơ bác sĩ" : "Chọn bác sĩ để xem lịch trống"}
                  href={selectedDoctor ? `/doctors/${selectedDoctor.id}` : undefined}
                />
                <SummaryLink
                  label="Gói khám"
                  value={selectedSummary.packageName}
                  hint={selectedPackage ? "Bấm để xem nhanh hạng mục và giá gói" : "Nếu không chọn gói, giá tạm tính theo phí khám bác sĩ"}
                  href={selectedPackage ? `/packages/${selectedPackage.slug || selectedPackage.id}` : undefined}
                />
                <div className="rounded-md border border-[#e5ebf3] bg-white px-3 py-2">
                  <span className="text-xs font-medium text-[#667892]">Ngày khám</span>
                  <p className="mt-1 flex items-center gap-2 font-semibold text-[#172033]">
                    <CalendarDays className="h-4 w-4 text-[#0d4f8b]" />
                    {draft.date ? formatVietnamDate(draft.date) : "Chưa chọn ngày"}
                  </p>
                </div>
                <div className="rounded-md border border-[#e5ebf3] bg-white px-3 py-2">
                  <span className="text-xs font-medium text-[#667892]">Giờ khám</span>
                  <p className="mt-1 flex items-center gap-2 font-semibold text-[#172033]">
                    <Clock className="h-4 w-4 text-[#0d4f8b]" />
                    {selectedSlot ? `${formatTime(selectedSlot.startTime)} - ${formatTime(selectedSlot.endTime)}` : "Chưa chọn khung giờ"}
                  </p>
                </div>
              </div>
              <div className="mt-4 rounded-md border border-[#cfe4fa] bg-white px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#667892]">Tạm tính</p>
                <p className="mt-1 text-lg font-semibold text-[#0d4f8b]">
                  {selectedSummary.amount ? formatCurrency(selectedSummary.amount) : "Sẽ tính theo lựa chọn"}
                </p>
                <p className="mt-2 text-xs leading-5 text-[#667892]">
                  {selectedPackage
                    ? "Giá tạm tính dựa trên gói khám đã chọn, bao gồm các hạng mục đang được cấu hình trong gói."
                    : selectedDoctor
                      ? "Giá tạm tính dựa trên phí khám của bác sĩ đã chọn. Chi phí cuối cùng có thể thay đổi sau khi bệnh viện xác nhận."
                      : "Giá sẽ hiển thị sau khi bạn chọn gói khám hoặc bác sĩ."}
                </p>
              </div>
            </div>

            {message ? (
              <div className="mt-4 flex items-start gap-2 rounded-md border border-[#bde5c8] bg-[#f0fff4] px-3 py-2 text-sm text-[#1f7a3a] shadow-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{message}</span>
              </div>
            ) : null}

            {pending ? (
              <div className="mt-5 rounded-md border border-[#cfe4fa] bg-[#fbfdff] p-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#0d4f8b]">
                  <ShieldCheck className="h-4 w-4" />
                  Xác thực OTP
                </div>
                <div className="mt-3 rounded-md border border-[#cfe4fa] bg-[#f3f8ff] p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#667892]">Mã đặt lịch cần lưu</p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="break-all text-lg font-semibold text-[#172033]">{pending.bookingCode}</span>
                    <button
                      type="button"
                      onClick={() => void copyBookingCode(pending.bookingCode)}
                      className="inline-flex shrink-0 items-center gap-1 rounded-md border border-[#cfd8e6] bg-white px-2 py-1.5 text-xs font-semibold text-[#42526b] hover:bg-[#f8fafc]"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex items-start gap-2 rounded-md border border-[#b8d7f4] bg-[#eef7ff] px-3 py-2.5 text-[#0d4f8b]">
                  <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white text-[#0d4f8b] shadow-sm">
                    <Info className="h-4 w-4" />
                  </span>
                  <p className="text-xs font-medium leading-5">
                    Nếu lỡ thoát màn hình này, hãy vào{" "}
                    <Link href={`/appointments/lookup?bookingCode=${pending.bookingCode}&phone=${pending.patientPhone}`} className="font-semibold underline underline-offset-2">
                      Tra cứu lịch hẹn
                    </Link>
                    , nhập mã lịch và số điện thoại để xác thực OTP lại.
                  </p>
                </div>
                <input
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  placeholder="000000"
                  className="mt-3 w-full rounded-md border border-[#cfd8e6] px-3 py-2.5 text-center text-xl font-semibold tracking-[0.25em] outline-none focus:border-[#0d4f8b]"
                />
                <button
                  type="button"
                  onClick={() => void verifyOtp()}
                  disabled={submitting || otp.length !== 6}
                  className="mt-3 w-full rounded-md bg-[#0d4f8b] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#083d6d] disabled:opacity-60"
                >
                  Xác nhận OTP
                </button>
                <button type="button" onClick={() => void resendOtp()} disabled={submitting} className="mt-2 w-full rounded-md border border-[#cfd8e6] px-4 py-2.5 text-sm font-medium text-[#42526b] hover:bg-[#f6f8fb] disabled:opacity-60">
                  Gửi lại OTP
                </button>
                <Link
                  href={`/appointments/lookup?bookingCode=${pending.bookingCode}&phone=${pending.patientPhone}`}
                  className="mt-2 inline-flex w-full items-center justify-center rounded-md border border-[#cfd8e6] px-4 py-2.5 text-sm font-semibold text-[#42526b] hover:bg-[#f8fafc]"
                >
                  Xác thực lại qua tra cứu
                </Link>
              </div>
            ) : null}

            {verifiedAppointment ? (
              <div className="mt-5 rounded-md border border-[#bde5c8] bg-[#fbfffc] p-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#1f7a3a]">
                  <CheckCircle2 className="h-4 w-4" />
                  Đặt lịch thành công
                </div>
                <div className="mt-3 space-y-2 text-sm text-[#667892]">
                  <div className="rounded-md border border-[#bde5c8] bg-[#f0fff4] p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#1f7a3a]">Mã lịch cần lưu</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="break-all text-lg font-semibold text-[#172033]">{verifiedAppointment.bookingCode}</span>
                      <button
                        type="button"
                        onClick={() => void copyBookingCode(verifiedAppointment.bookingCode)}
                        className="inline-flex shrink-0 items-center gap-1 rounded-md border border-[#bde5c8] bg-white px-2 py-1.5 text-xs font-semibold text-[#1f7a3a] hover:bg-[#f8fafc]"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copy
                      </button>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[#667892]">
                      Hãy lưu mã này để tra cứu lịch, thanh toán, hủy lịch hoặc xem kết quả khám sau này.
                    </p>
                  </div>
                  <p>Trạng thái: <span className="font-semibold text-[#172033]">{verifiedAppointment.status}</span></p>
                  <p>Giờ khám: {formatTime(verifiedAppointment.startTime)} - {formatTime(verifiedAppointment.endTime)}</p>
                  <p>Phí dự kiến: {formatCurrency(verifiedAppointment.finalAmount)}</p>
                </div>
                <div className="mt-4 rounded-md border border-[#e5ebf3] bg-[#f8fafc] p-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#172033]">
                    <CreditCard className="h-4 w-4 text-[#0d4f8b]" />
                    Hóa đơn sau khi khám
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#667892]">
                    Hóa đơn và thanh toán online sẽ hiển thị trong trang tra cứu sau khi bệnh viện hoàn tất khám và phát hành hóa đơn.
                  </p>
                </div>
                <Link
                  href={`/appointments/lookup?bookingCode=${verifiedAppointment.bookingCode}&phone=${verifiedAppointment.patientPhone}`}
                  className="mt-4 inline-flex w-full items-center justify-center rounded-md border border-[#cfd8e6] px-4 py-2.5 text-sm font-semibold text-[#42526b] hover:bg-[#f8fafc]"
                >
                  Tra cứu lịch hẹn
                </Link>
              </div>
            ) : null}
          </aside>
        </div>
      </ScrollReveal>
    </section>
  );
}

function SummaryLink({ label, value, hint, href }: { label: string; value: string; hint: string; href?: string }) {
  const content = (
    <>
      <span className="text-xs font-medium text-[#667892]">{label}</span>
      <span className="mt-1 block font-semibold text-[#172033]">{value}</span>
      <span className="mt-1 block text-xs leading-5 text-[#667892]">{hint}</span>
    </>
  );

  if (!href) {
    return <div className="rounded-md border border-[#e5ebf3] bg-white px-3 py-2">{content}</div>;
  }

  return (
    <Link
      href={href}
      className="block rounded-md border border-[#e5ebf3] bg-white px-3 py-2 transition hover:border-[#0d4f8b] hover:bg-[#f8fbff]"
    >
      {content}
    </Link>
  );
}
