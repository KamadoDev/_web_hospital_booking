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
    bodyParts: z.array(z.string().trim().min(1).max(80)).max(10).default([]),
    duration: z.string().trim().min(1).max(80).optional().nullable(),
    severity: z
      .enum(["MILD", "MODERATE", "SEVERE", "UNKNOWN"])
      .optional()
      .nullable(),
    associatedSymptoms: z
      .array(z.string().trim().min(1).max(120))
      .max(10)
      .default([]),
    reason: optionalText,
  }).default({
    symptoms: [],
    bodyParts: [],
    associatedSymptoms: [],
  }),
  triage: z.object({
    summary: z.string().trim().min(1).max(240).optional().nullable(),
    clarificationQuestion: z
      .string()
      .trim()
      .min(1)
      .max(300)
      .optional()
      .nullable(),
    missingDetails: z.array(z.enum([
      "DURATION",
      "SEVERITY",
      "BODY_PART",
      "ONSET",
      "SKIN_CHANGES",
      "ASSOCIATED_SYMPTOMS",
    ])).max(6).default([]),
  }).default({ missingDetails: [] }),
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