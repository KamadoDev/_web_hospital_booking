import { z } from "zod";

const phoneRegex = /^(0|\+84)[0-9]{9,10}$/;
const ratingSchema = z
  .number()
  .int()
  .min(1, "Điểm đánh giá tối thiểu là 1 sao")
  .max(5, "Điểm đánh giá tối đa là 5 sao");

const appointmentIdentitySchema = z.object({
  bookingCode: z.string().trim().min(1, "Mã lịch hẹn là bắt buộc"),
  phone: z.string().trim().regex(phoneRegex, "Số điện thoại không hợp lệ"),
});

export const requestAppointmentReviewOtpSchema = appointmentIdentitySchema;

export const createAppointmentReviewSchema = appointmentIdentitySchema.extend({
  otp: z
    .string()
    .length(6, "OTP phải gồm đúng 6 chữ số")
    .regex(/^[0-9]+$/, "OTP chỉ được chứa số"),
  doctorRating: ratingSchema,
  serviceRating: ratingSchema,
  facilityRating: ratingSchema,
  comment: z
    .string()
    .trim()
    .max(1000, "Nhận xét không được vượt quá 1000 ký tự")
    .nullable()
    .optional(),
});

export const updateReviewVisibilitySchema = z.object({
  isVisible: z.boolean(),
  moderationNote: z
    .string()
    .trim()
    .max(500, "Ghi chú kiểm duyệt không được vượt quá 500 ký tự")
    .nullable()
    .optional(),
});
