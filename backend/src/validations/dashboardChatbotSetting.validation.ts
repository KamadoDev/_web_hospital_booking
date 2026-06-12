import { z } from "zod";

export const updateDashboardChatbotSettingsSchema = z.object({
  isActive: z.boolean().optional(),
  aiEnabled: z.boolean().optional(),
  fallbackEnabled: z.boolean().optional(),
  faqEnabled: z.boolean().optional(),
  model: z.string().trim().min(1, "Model khong duoc de trong").optional(),
  maxSuggestedActions: z
    .number()
    .int("So action phai la so nguyen")
    .min(1, "Toi thieu 1 action")
    .max(6, "Toi da 6 action")
    .optional(),
  sessionExpiresDays: z
    .number()
    .int("So ngay het han phai la so nguyen")
    .min(1, "Toi thieu 1 ngay")
    .max(30, "Toi da 30 ngay")
    .optional(),
});
