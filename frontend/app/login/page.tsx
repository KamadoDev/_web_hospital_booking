"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

type LoginStep = "credentials" | "otp";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, login, verifyOtp } = useAuth();
  const [step, setStep] = useState<LoginStep>("credentials");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [expiresIn, setExpiresIn] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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
      setExpiresIn(result.otpExpiresIn);
      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dang nhap that bai");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await verifyOtp(challengeId, otp.trim());
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xac thuc OTP that bai");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f8fb] px-4 py-10">
      <section className="w-full max-w-md rounded-md border border-[#dce3ee] bg-white p-6 shadow-sm">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[#55708f]">
            Hospital Dashboard
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-[#172033]">
            {step === "credentials" ? "Dang nhap quan tri" : "Nhap ma OTP"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#667892]">
            {step === "credentials"
              ? "Dung tai khoan ADMIN, STAFF hoac DOCTOR da tao trong backend."
              : `Ma OTP da gui den ${phone}. ${expiresIn ? `Hieu luc ${expiresIn} giay.` : ""}`}
          </p>
        </div>

        {error ? (
          <div className="mb-4 rounded-md border border-[#f2b8b5] bg-[#fff3f2] px-3 py-2 text-sm text-[#b3261e]">
            {error}
          </div>
        ) : null}

        {step === "credentials" ? (
          <form className="space-y-4" onSubmit={handleLogin}>
            <label className="block">
              <span className="text-sm font-medium text-[#334155]">So dien thoai</span>
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="0901234567"
                className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2.5 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]"
                required
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-[#334155]">Mat khau</span>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2.5 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]"
                required
              />
            </label>
            <button
              disabled={submitting}
              className="w-full rounded-md bg-[#0d4f8b] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#083d6d] disabled:opacity-60"
            >
              {submitting ? "Dang gui OTP..." : "Tiep tuc"}
            </button>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={handleVerify}>
            <label className="block">
              <span className="text-sm font-medium text-[#334155]">Ma OTP</span>
              <input
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                placeholder="000000"
                className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2.5 text-center text-xl font-semibold tracking-[0.25em] outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]"
                required
              />
            </label>
            <button
              disabled={submitting || otp.length !== 6}
              className="w-full rounded-md bg-[#0d4f8b] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#083d6d] disabled:opacity-60"
            >
              {submitting ? "Dang xac thuc..." : "Vao dashboard"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("credentials");
                setOtp("");
                setError("");
              }}
              className="w-full rounded-md border border-[#cfd8e6] px-4 py-2.5 text-sm font-medium text-[#42526b] hover:bg-[#f6f8fb]"
            >
              Doi so dien thoai
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
