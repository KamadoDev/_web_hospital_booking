import { z } from "zod";

const draftSchema = z.object({
  departmentId: z.string().uuid("Chuyên khoa không hợp lệ").optional(),
  departmentSlug: z.string().trim().optional(),
  packageId: z.string().uuid("Gói khám không hợp lệ").optional(),
  packageSlug: z.string().trim().optional(),
  serviceMode: z.enum(["DOCTOR_ONLY", "PACKAGE"]).optional(),
  doctorId: z.string().uuid("Bác sĩ không hợp lệ").optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày phải có định dạng YYYY-MM-DD")
    .optional(),
  timeSlotId: z.string().uuid("Khung giờ không hợp lệ").optional(),
  symptoms: z.array(z.string().trim()).optional(),
  reason: z.string().trim().optional(),
});

export const chatbotMessageSchema = z.object({
  sessionId: z.string().uuid("Session không hợp lệ").optional(),
  message: z.string().trim().min(1, "Tin nhắn không được để trống"),
  phone: z.string().trim().optional(),
  draft: draftSchema.optional(),
  action: z
    .object({
      type: z.string().trim().min(1, "Action type không được để trống"),
      label: z.string().trim().optional(),
      payload: z.record(z.string(), z.unknown()).optional(),
    })
    .optional(),
});