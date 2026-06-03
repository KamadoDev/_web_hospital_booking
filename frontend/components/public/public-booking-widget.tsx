"use client";

import { Dispatch, SetStateAction, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, CheckCircle2, Clock, CreditCard, Loader2, Send, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import type { Appointment } from "@/lib/types";
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

const today = () => {
  const date = new Date();
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);

  return offsetDate.toISOString().slice(0, 10);
};

const yesterday = () => {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);

  return offsetDate.toISOString().slice(0, 10);
};

const initialDraft: BookingDraft = {
  date: today(),
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

const getInitialDraft = (): BookingDraft => {
  if (typeof window === "undefined") return initialDraft;

  const params = new URLSearchParams(window.location.search);

  return {
    ...initialDraft,
    date: params.get("date") || initialDraft.date,
    timeSlotId: params.get("timeSlotId") || initialDraft.timeSlotId,
  };
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
  const [draft, setDraft] = useState<BookingDraft>(getInitialDraft);
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

  const selectedDepartment = data.departments.find((item) => item.id === selection.departmentId);
  const selectedDoctor = data.doctors.find((item) => item.id === selection.doctorId);
  const selectedPackage = data.packages.find((item) => item.id === selection.packageId);
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
    if (draft.date < today()) return "Ngày khám không được nhỏ hơn ngày hiện tại.";
    if (!draft.timeSlotId) return "Vui lòng chọn khung giờ khám.";
    if (draft.patientName.trim().length < 2) return "Họ tên bệnh nhân tối thiểu 2 ký tự.";
    if (!phoneRegex.test(draft.patientPhone.trim())) return "Số điện thoại không hợp lệ.";
    if (draft.patientEmail.trim() && !emailRegex.test(draft.patientEmail.trim())) return "Email không hợp lệ.";
    if (draft.otpChannel === "EMAIL" && !draft.patientEmail.trim()) return "Email là bắt buộc khi xác thực OTP qua email.";
    if (draft.dateOfBirth && draft.dateOfBirth >= today()) return "Ngày sinh phải nhỏ hơn ngày hiện tại.";
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

  return (
    <section id="booking" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-10 sm:px-6 lg:px-8">
      <ScrollReveal>
        <div className="grid gap-6 rounded-md border border-[#dce3ee] bg-white p-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#667892]">Đặt lịch nhanh</p>
            <h2 className="mt-2 text-2xl font-semibold">Chọn lịch khám và xác thực OTP</h2>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <select
                value={selection.departmentId}
                onChange={(event) => {
                  updateSelection({ departmentId: event.target.value, doctorId: "", packageId: "" });
                  updateDraft({ timeSlotId: "" });
                }}
                className="rounded-md border border-[#cfd8e6] px-3 py-3 text-sm outline-none focus:border-[#0d4f8b]"
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
                className="rounded-md border border-[#cfd8e6] px-3 py-3 text-sm outline-none focus:border-[#0d4f8b]"
                disabled={loading || !selection.departmentId}
              >
                <option value="">Chọn bác sĩ</option>
                {filteredDoctors.map((item) => <option key={item.id} value={item.id}>{doctorName(item)}</option>)}
              </select>
              <select
                value={selection.packageId}
                onChange={(event) => updateSelection({ packageId: event.target.value })}
                className="rounded-md border border-[#cfd8e6] px-3 py-3 text-sm outline-none focus:border-[#0d4f8b]"
                disabled={loading}
              >
                <option value="">Chọn gói khám</option>
                {filteredPackages.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
              <label className="block">
                <span className="text-sm font-medium text-[#334155]">Ngày khám</span>
                <input
                  type="date"
                  min={today()}
                  value={draft.date}
                  onChange={(event) => updateDraft({ date: event.target.value, timeSlotId: "" })}
                  className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2.5 text-sm outline-none focus:border-[#0d4f8b]"
                />
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
                          ? "border-[#0d4f8b] bg-[#e7f0fb] text-[#0d4f8b]"
                          : "border-[#cfd8e6] text-[#42526b] hover:border-[#0d4f8b]"
                      }`}
                    >
                      <Clock className="h-4 w-4" />
                      {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                    </button>
                  )) : (
                    <span className="rounded-md border border-dashed border-[#dce3ee] px-3 py-2 text-sm text-[#667892]">Chưa có khung giờ trống trong ngày này.</span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-md border border-[#e5ebf3] bg-[#fbfdff] p-4">
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
                  <input value={draft.patientName} onChange={(event) => updateDraft({ patientName: event.target.value })} className="mt-1 w-full rounded-md border border-[#cfd8e6] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#0d4f8b]" required />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-[#334155]">Số điện thoại</span>
                  <input value={draft.patientPhone} onChange={(event) => updateDraft({ patientPhone: event.target.value })} placeholder="0901234567" className="mt-1 w-full rounded-md border border-[#cfd8e6] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#0d4f8b]" required />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-[#334155]">Kênh OTP</span>
                  <select value={draft.otpChannel} onChange={(event) => updateDraft({ otpChannel: event.target.value as BookingDraft["otpChannel"] })} className="mt-1 w-full rounded-md border border-[#cfd8e6] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#0d4f8b]">
                    <option value="SMS">SMS</option>
                    <option value="EMAIL">Email</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-[#334155]">Email {draft.otpChannel === "EMAIL" ? "(bắt buộc)" : "(không bắt buộc)"}</span>
                  <input value={draft.patientEmail} onChange={(event) => updateDraft({ patientEmail: event.target.value })} placeholder="Nhập nếu xác thực qua email" className="mt-1 w-full rounded-md border border-[#cfd8e6] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#0d4f8b]" />
                </label>
                <label className="block md:col-span-2">
                  <span className="text-sm font-medium text-[#334155]">Lý do khám</span>
                  <textarea value={draft.reason} onChange={(event) => updateDraft({ reason: event.target.value })} rows={3} placeholder="Ví dụ: đau đầu, tái khám, tư vấn kết quả..." className="mt-1 w-full rounded-md border border-[#cfd8e6] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#0d4f8b]" />
                </label>
              </div>
            </div>

            <div className="mt-4 rounded-md border border-[#dce3ee] bg-white">
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
                    <input type="date" max={yesterday()} value={draft.dateOfBirth} onChange={(event) => updateDraft({ dateOfBirth: event.target.value })} className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2.5 text-sm outline-none focus:border-[#0d4f8b]" />
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
              <div className="mt-5 rounded-md border border-[#f2b8b5] bg-[#fff3f2] px-4 py-3 text-sm font-medium text-[#b3261e]">
                {error}
              </div>
            ) : null}

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => void createAppointment()}
                disabled={submitting || loading}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0d4f8b] px-5 py-3 text-sm font-semibold text-white hover:bg-[#083d6d] disabled:opacity-60"
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

          <aside ref={resultRef} className="scroll-mt-24 rounded-md bg-[#f8fafc] p-4">
            <p className="text-sm font-semibold text-[#172033]">Tóm tắt lịch hẹn</p>
            <div className="mt-3 space-y-2 text-sm text-[#667892]">
              <p>{selectedSummary.departmentName}</p>
              <p>{selectedSummary.doctorName}</p>
              <p>{selectedSummary.packageName}</p>
              <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4" />{draft.date || "Chưa chọn ngày"}</p>
            </div>
            <p className="mt-4 text-lg font-semibold text-[#0d4f8b]">{selectedSummary.amount ? formatCurrency(selectedSummary.amount) : "Sẽ tính theo lựa chọn"}</p>

            {message ? <div className="mt-4 rounded-md border border-[#bde5c8] bg-[#f0fff4] px-3 py-2 text-sm text-[#1f7a3a]">{message}</div> : null}

            {pending ? (
              <div className="mt-5 rounded-md border border-[#cfe4fa] bg-white p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#0d4f8b]">
                  <ShieldCheck className="h-4 w-4" />
                  Xác thực OTP
                </div>
                <p className="mt-2 text-sm text-[#667892]">Mã đặt lịch: <span className="font-semibold text-[#172033]">{pending.bookingCode}</span></p>
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
              </div>
            ) : null}

            {verifiedAppointment ? (
              <div className="mt-5 rounded-md border border-[#bde5c8] bg-white p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#1f7a3a]">
                  <CheckCircle2 className="h-4 w-4" />
                  Đặt lịch thành công
                </div>
                <div className="mt-3 space-y-2 text-sm text-[#667892]">
                  <p>Mã lịch: <span className="font-semibold text-[#172033]">{verifiedAppointment.bookingCode}</span></p>
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
