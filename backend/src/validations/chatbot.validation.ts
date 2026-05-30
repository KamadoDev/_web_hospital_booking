import { z } from "zod";

const draftSchema = z.object({
  departmentId: z.string().uuid("Chuyen khoa khong hop le").optional(),
  departmentSlug: z.string().trim().optional(),
  packageId: z.string().uuid("Goi kham khong hop le").optional(),
  packageSlug: z.string().trim().optional(),
  doctorId: z.string().uuid("Bac si khong hop le").optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngay phai co dinh dang YYYY-MM-DD").optional(),
  timeSlotId: z.string().uuid("Khung gio khong hop le").optional(),
  symptoms: z.array(z.string().trim()).optional(),
  reason: z.string().trim().optional(),
});

export const chatbotMessageSchema = z.object({
  sessionId: z.string().uuid("Session khong hop le").optional(),
  message: z.string().trim().min(1, "Tin nhan khong duoc de trong"),
  phone: z.string().trim().optional(),
  draft: draftSchema.optional(),
  action: z
    .object({
      type: z.string().trim().min(1, "Action type khong duoc de trong"),
      label: z.string().trim().optional(),
      payload: z.record(z.string(), z.unknown()).optional(),
    })
    .optional(),
});
