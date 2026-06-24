import { z } from "zod";

const keywordsSchema = z
  .array(z.string().trim().min(1, "Tu khoa khong duoc de trong"))
  .min(1, "Can it nhat 1 tu khoa")
  .max(20, "Toi da 20 tu khoa");

export const createDashboardChatbotFAQSchema = z.object({
  question: z.string().trim().min(3, "Cau hoi phai co it nhat 3 ky tu"),
  answer: z.string().trim().min(3, "Cau tra loi phai co it nhat 3 ky tu"),
  keywords: keywordsSchema,
  isActive: z.boolean().optional(),
});

export const updateDashboardChatbotFAQSchema = z.object({
  question: z
    .string()
    .trim()
    .min(3, "Cau hoi phai co it nhat 3 ky tu")
    .optional(),
  answer: z
    .string()
    .trim()
    .min(3, "Cau tra loi phai co it nhat 3 ky tu")
    .optional(),
  keywords: keywordsSchema.optional(),
  isActive: z.boolean().optional(),
});

export const updateDashboardChatbotFAQStatusSchema = z.object({
  isActive: z.boolean({
    error: "Trang thai isActive phai la boolean",
  }),
});
