import { z } from "zod";

const phoneRegex = /^(0|\+84)[0-9]{9,10}$/;

const otpPurposeEnum = [
  "BOOK_APPOINTMENT",
  "PATIENT_PORTAL_LOGIN",
  "LOOKUP_RESULT",
  "CANCEL_APPOINTMENT",
  "ADMIN_LOGIN",
  "DOCTOR_LOGIN",
  "STAFF_LOGIN",
] as const;

export const sendOtpSchema = z.object({
  phone: z.string().regex(phoneRegex, "Số điện thoại không hợp lệ"),
  purpose: z.enum(otpPurposeEnum, {
    message: "Mục đích gửi OTP không hợp lệ",
  }),
});

export const verifyOtpSchema = z.object({
  phone: z.string().regex(phoneRegex, "Số điện thoại không hợp lệ"),
  otp: z
    .string()
    .length(6, "OTP phải có 6 số")
    .regex(/^[0-9]+$/, "OTP chỉ được chứa số"),
  purpose: z.enum(otpPurposeEnum, {
    message: "Mục đích xác thực OTP không hợp lệ",
  }),
});