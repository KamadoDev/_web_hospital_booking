import { z } from "zod";

const phoneRegex = /^(0|\+84)[0-9]{9,10}$/;

export const dashboardLoginSchema = z.object({
  phone: z.string().regex(phoneRegex, "So dien thoai khong hop le"),
  password: z.string().min(6, "Mat khau toi thieu 6 ky tu"),
});

export const dashboardVerifyOtpSchema = z.object({
  challengeId: z.string().uuid("Challenge khong hop le"),
  otp: z
    .string()
    .length(6, "OTP phai co 6 so")
    .regex(/^[0-9]+$/, "OTP chi duoc chua so"),
});
