"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Hospital,
  Loader2,
  LockKeyhole,
  Mail,
  Phone,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { SiteSettingsValue } from "@/lib/types";

type LoginStep = "credentials" | "otp";
type OtpDeliveryStatus = "PENDING" | "SENT" | "FAILED";

const buildOtpNotice = (channel: "SMS" | "EMAIL", target: string, status?: OtpDeliveryStatus) => {
  const targetLabel = channel === "EMAIL" ? "email" : "số điện thoại";

  if (status === "SENT") {
    return `Đã gửi mã OTP đến ${targetLabel} ${target}.`;
  }

  if (status === "FAILED") {
    return `Chưa gửi được mã OTP đến ${targetLabel} ${target}. Vui lòng thử gửi lại.`;
  }

  return `Yêu cầu gửi OTP đã được tiếp nhận. Vui lòng kiểm tra ${targetLabel} ${target} trong giây lát.`;
};

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, login, verifyOtp } = useAuth();
  const [siteSettings, setSiteSettings] = useState<SiteSettingsValue | null>(null);
  const [step, setStep] = useState<LoginStep>("credentials");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [otpTarget, setOtpTarget] = useState("");
  const [otpChannel, setOtpChannel] = useState<"SMS" | "EMAIL">("SMS");
  const [otpDeliveryStatus, setOtpDeliveryStatus] = useState<OtpDeliveryStatus>("PENDING");
  const [expiresIn, setExpiresIn] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const phoneInputRef = useRef<HTMLInputElement>(null);

  const hospitalName = siteSettings?.hospitalName?.trim() || "Hospital Booking";
  const logo = siteSettings?.logo?.trim();
  const hotline = siteSettings?.hotline?.trim() || siteSettings?.emergencyHotline?.trim() || "1900 0000";
  const otpTargetLabel = otpChannel === "EMAIL" ? "email" : "số điện thoại";
  const otpTargetText = otpTarget || phone;
  const otpDescription =
    otpDeliveryStatus === "SENT"
      ? `Mã OTP đã gửi đến ${otpTargetLabel} ${otpTargetText}.`
      : otpDeliveryStatus === "FAILED"
        ? `Chưa gửi được mã OTP đến ${otpTargetLabel} ${otpTargetText}.`
        : `Mã OTP đang được gửi đến ${otpTargetLabel} ${otpTargetText}.`;

  useEffect(() => {
    let active = true;

    apiRequest<SiteSettingsValue>("/site-settings")
      .then((result) => {
        if (active) setSiteSettings(result);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [loading, router, user]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const result = await login(phone.trim(), password);
      setChallengeId(result.challengeId);
      setOtpTarget(result.otpTarget || result.email || result.phone);
      setOtpChannel(result.otpChannel || "SMS");
      setOtpDeliveryStatus(result.otpDeliveryStatus || "PENDING");
      setExpiresIn(result.otpExpiresIn);
      setSuccessMessage(
        buildOtpNotice(
          result.otpChannel || "SMS",
          result.otpTarget || result.email || result.phone,
          result.otpDeliveryStatus,
        ),
      );
      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng nhập thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");
    setSubmitting(true);

    try {
      await verifyOtp(challengeId, otp.trim());
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xác thực OTP thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangePhone = () => {
    setStep("credentials");
    setPhone("");
    setPassword("");
    setOtp("");
    setChallengeId("");
    setOtpTarget("");
    setOtpChannel("SMS");
    setOtpDeliveryStatus("PENDING");
    setExpiresIn(null);
    setSubmitting(false);
    setError("");
    setSuccessMessage("");
    window.requestAnimationFrame(() => phoneInputRef.current?.focus());
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f4f9ff] px-4 py-8 text-[#172033] sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(13,79,139,0.16),transparent_28%),radial-gradient(circle_at_82%_12%,rgba(31,122,58,0.12),transparent_24%),linear-gradient(180deg,#f4f9ff_0%,#ffffff_58%,#eef6ff_100%)]" />
      <div className="absolute left-0 top-0 h-28 w-full border-b border-white/70 bg-white/35 backdrop-blur-sm" />

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col justify-center">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link href="/" className="inline-flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white text-[#0d4f8b] shadow-sm ring-1 ring-[#d8e9ff]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {logo ? <img src={logo} alt={hospitalName} className="h-full w-full object-contain p-1" /> : <Hospital className="h-6 w-6" />}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-base font-semibold">{hospitalName}</span>
              <span className="block truncate text-xs text-[#667892]">Hệ thống quản trị đặt lịch khám</span>
            </span>
          </Link>
          <Link href="/" className="hidden rounded-md border border-[#cfd8e6] bg-white/80 px-3 py-2 text-sm font-semibold text-[#42526b] shadow-sm hover:bg-white sm:inline-flex">
            Về website
          </Link>
        </div>

        <section className="grid overflow-hidden rounded-md border border-[#cfe0f3] bg-white/92 shadow-[0_24px_70px_rgba(13,79,139,0.14)] ring-1 ring-white/80 backdrop-blur lg:grid-cols-[minmax(0,0.92fr)_minmax(420px,0.72fr)]">
          <div className="hidden min-h-[620px] flex-col justify-between bg-[linear-gradient(150deg,#0d4f8b_0%,#155f99_48%,#1f7a3a_100%)] p-8 text-white lg:flex">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/12 px-3 py-1.5 text-xs font-semibold backdrop-blur">
                <ShieldCheck className="h-3.5 w-3.5" />
                Bảo vệ phiên đăng nhập bằng OTP
              </div>
              <h1 className="mt-6 max-w-xl text-4xl font-semibold leading-tight">
                Quản trị lịch khám rõ ràng, bảo mật và dễ theo dõi.
              </h1>
              <p className="mt-4 max-w-lg text-sm leading-7 text-white/82">
                Đăng nhập để quản lý lịch hẹn, bác sĩ, chuyên khoa, hóa đơn và nội dung website từ một dashboard thống nhất.
              </p>
            </div>

            <div className="grid gap-3">
              {[
                "Xác thực hai bước bằng OTP",
                "Tự đăng xuất khi phiên hết hạn",
                "Phân quyền quản trị, nhân viên và bác sĩ",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-md border border-white/18 bg-white/12 p-3 backdrop-blur">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/18">
                    <CheckCircle2 className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-medium">{item}</span>
                </div>
              ))}
            </div>

            <div className="rounded-md border border-white/18 bg-white/12 p-4 text-sm backdrop-blur">
              <p className="font-semibold">Cần hỗ trợ đăng nhập?</p>
              <a href={`tel:${hotline}`} className="mt-2 inline-flex items-center gap-2 text-white/90 hover:text-white">
                <Phone className="h-4 w-4" />
                {hotline}
              </a>
            </div>
          </div>

          <div className="p-5 sm:p-8">
            <div className="mx-auto flex min-h-[560px] max-w-md flex-col justify-center">
              <div className="mb-6">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-md bg-[#e7f0fb] text-[#0d4f8b]">
                  {step === "credentials" ? <LockKeyhole className="h-6 w-6" /> : otpChannel === "EMAIL" ? <Mail className="h-6 w-6" /> : <Smartphone className="h-6 w-6" />}
                </div>
                <p className="mt-5 text-sm font-semibold uppercase tracking-wide text-[#0d4f8b]">
                  {step === "credentials" ? "Đăng nhập dashboard" : "Xác thực bảo mật"}
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[#172033]">
                  {step === "credentials" ? "Chào mừng quay lại" : "Nhập mã OTP"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#667892]">
                  {step === "credentials"
                    ? "Dùng tài khoản ADMIN, STAFF hoặc DOCTOR đã được cấp quyền trong hệ thống."
                    : `${otpDescription} ${expiresIn ? `Hiệu lực trong ${expiresIn} giây.` : ""}`}
                </p>
              </div>

              {error ? (
                <div className="mb-4 rounded-md border border-[#f2b8b5] bg-[#fff3f2] px-3 py-2 text-sm font-medium text-[#b3261e]">
                  {error}
                </div>
              ) : null}

              {successMessage ? (
                <div className="mb-4 flex items-start gap-2 rounded-md border border-[#b7e4c7] bg-[#effaf3] px-3 py-2 text-sm font-medium text-[#166534]">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              ) : null}

              {step === "credentials" ? (
                <form className="space-y-4" onSubmit={handleLogin}>
                  <label className="block">
                    <span className="text-sm font-medium text-[#334155]">Số điện thoại</span>
                    <div className="mt-1 flex items-center rounded-md border border-[#cfd8e6] bg-[#fbfdff] px-3 focus-within:border-[#0d4f8b] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#cfe4fa]">
                      <Phone className="h-4 w-4 shrink-0 text-[#667892]" />
                      <input
                        ref={phoneInputRef}
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        placeholder="0901234567"
                        autoComplete="username tel"
                        className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm outline-none"
                        required
                      />
                    </div>
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-[#334155]">Mật khẩu</span>
                    <div className="mt-1 flex items-center rounded-md border border-[#cfd8e6] bg-[#fbfdff] px-3 focus-within:border-[#0d4f8b] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#cfe4fa]">
                      <LockKeyhole className="h-4 w-4 shrink-0 text-[#667892]" />
                      <input
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm outline-none"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
                        className="rounded-md p-1.5 text-[#667892] hover:bg-[#eef4fb]"
                        aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </label>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#0d4f8b] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(13,79,139,0.22)] transition hover:-translate-y-0.5 hover:bg-[#083d6d] disabled:translate-y-0 disabled:opacity-60"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                    {submitting ? "Đang gửi OTP..." : "Tiếp tục"}
                  </button>
                </form>
              ) : (
                <form className="space-y-4" onSubmit={handleVerify}>
                  <label className="block">
                    <span className="text-sm font-medium text-[#334155]">Mã OTP</span>
                    <input
                      value={otp}
                      onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="000000"
                      className="mt-1 w-full rounded-md border border-[#cfd8e6] bg-[#fbfdff] px-3 py-3 text-center text-xl font-semibold tracking-[0.25em] outline-none transition focus:border-[#0d4f8b] focus:bg-white focus:ring-2 focus:ring-[#cfe4fa]"
                      required
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={submitting || otp.length !== 6}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#0d4f8b] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(13,79,139,0.22)] transition hover:-translate-y-0.5 hover:bg-[#083d6d] disabled:translate-y-0 disabled:opacity-60"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                    {submitting ? "Đang xác thực..." : "Vào dashboard"}
                  </button>
                  <button
                    type="button"
                    onClick={handleChangePhone}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-[#cfd8e6] bg-white px-4 py-3 text-sm font-semibold text-[#42526b] transition hover:bg-[#f6f8fb]"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Đổi số điện thoại
                  </button>
                </form>
              )}

              <p className="mt-6 rounded-md border border-[#d8e9ff] bg-[#f8fbff] px-3 py-2 text-xs leading-5 text-[#667892]">
                Sau khi xác thực OTP thành công, hệ thống sẽ mở dashboard theo đúng quyền tài khoản của bạn.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
