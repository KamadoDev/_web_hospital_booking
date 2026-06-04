import { z } from "zod";

const optionalText = (max = 500) => z.string().trim().max(max).nullable().optional();

export const createConsultationRequestSchema = z.object({
  phone: z
    .string("So dien thoai la bat buoc")
    .trim()
    .regex(/^(0|\+84)[0-9]{9,10}$/, "So dien thoai khong hop le"),
  fullName: optionalText(120),
  message: optionalText(1000),
});

export const updateConsultationRequestSchema = z.object({
  status: z.enum(["NEW", "CONTACTED", "CANCELLED", "COMPLETED"]).optional(),
  note: optionalText(1000),
});
