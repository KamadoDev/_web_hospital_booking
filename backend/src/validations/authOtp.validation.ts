import { z } from "zod";

const phoneRegex = /^(0|\+84)[0-9]{9,10}$/;
const otpChannelEnum = ["SMS", "EMAIL"] as const;

const otpPurposeEnum = [
  "BOOK_APPOINTMENT",
  "PATIENT_PORTAL_LOGIN",
  "LOOKUP_RESULT",
  "CANCEL_APPOINTMENT",
] as const;

export const sendOtpSchema = z
  .object({
    phone: z.string().regex(phoneRegex, "Số điện thoại không hợp lệ").optional(),
    email: z.string().trim().email("Email không hợp lệ").optional(),
    target: z.string().trim().optional(),
    channel: z.enum(otpChannelEnum).default("SMS"),
    purpose: z.enum(otpPurposeEnum, {
      message: "Mục đích gửi OTP không hợp lệ",
    }),
  })
  .superRefine((value, ctx) => {
    const target = value.target || (value.channel === "EMAIL" ? value.email : value.phone);

    if (!target) {
      ctx.addIssue({
        code: "custom",
        path: ["target"],
        message: value.channel === "EMAIL" ? "Email là bắt buộc" : "Số điện thoại là bắt buộc",
      });
      return;
    }

    if (value.channel === "SMS" && !phoneRegex.test(target)) {
      ctx.addIssue({
        code: "custom",
        path: ["target"],
        message: "Số điện thoại không hợp lệ",
      });
    }
  });

export const verifyOtpSchema = z
  .object({
    phone: z.string().regex(phoneRegex, "Số điện thoại không hợp lệ").optional(),
    email: z.string().trim().email("Email không hợp lệ").optional(),
    target: z.string().trim().optional(),
    channel: z.enum(otpChannelEnum).default("SMS"),
    otp: z
      .string()
      .length(6, "OTP phải có 6 số")
      .regex(/^[0-9]+$/, "OTP chỉ được chứa số"),
    purpose: z.enum(otpPurposeEnum, {
      message: "Mục đích xác thực OTP không hợp lệ",
    }),
  })
  .superRefine((value, ctx) => {
    const target = value.target || (value.channel === "EMAIL" ? value.email : value.phone);

    if (!target) {
      ctx.addIssue({
        code: "custom",
        path: ["target"],
        message: value.channel === "EMAIL" ? "Email là bắt buộc" : "Số điện thoại là bắt buộc",
      });
      return;
    }

    if (value.channel === "SMS" && !phoneRegex.test(target)) {
      ctx.addIssue({
        code: "custom",
        path: ["target"],
        message: "Số điện thoại không hợp lệ",
      });
    }
  });
