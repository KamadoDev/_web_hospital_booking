import { z } from "zod";
import { CHAT_OPERATIONS, CHAT_TIME_PERIODS } from "../chatbot.types.js";

const optionalText = z.string().trim().min(1).max(160).optional().nullable();

export const nluResultSchema = z.object({
  operation: z.enum(CHAT_OPERATIONS).catch("UNKNOWN"),
  entities: z.object({
    departmentName: optionalText,
    packageName: optionalText,
    doctorName: optionalText,
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    timePeriod: z.enum(CHAT_TIME_PERIODS).optional().nullable(),
    symptoms: z.array(z.string().trim().min(1).max(120)).max(10).default([]),
    reason: optionalText,
  }).default({ symptoms: [] }),
  correction: z.object({
    clearFields: z.array(z.enum([
      "department",
      "package",
      "doctor",
      "date",
      "slot",
      "symptoms",
    ])).max(6).default([]),
  }).default({ clearFields: [] }),
  confidence: z.number().min(0).max(1).catch(0.5),
});

export type NLUResult = z.infer<typeof nluResultSchema>;