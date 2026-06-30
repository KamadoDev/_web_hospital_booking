import type { ChatBookingDraft } from "../chatbot.types.js";
import { foldVietnamese } from "./text-normalizer.js";

const cleanupTerms = (symptoms?: string[]) =>
  Array.from(
    new Map(
      (symptoms || [])
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => [foldVietnamese(item), item]),
    ).values(),
  ).slice(0, 10);

export const sanitizeBookingDraft = (
  draft: ChatBookingDraft,
): ChatBookingDraft => ({
  departmentId: draft.departmentId,
  departmentSlug: draft.departmentSlug,
  packageId: draft.packageId,
  packageSlug: draft.packageSlug,
  serviceMode: draft.packageId ? "PACKAGE" : draft.serviceMode,
  doctorId: draft.doctorId,
  date: draft.date,
  timeSlotId: draft.timeSlotId,
  timePeriod: draft.timePeriod,
  symptoms: cleanupTerms(draft.symptoms),
  bodyParts: cleanupTerms(draft.bodyParts),
  symptomDuration: draft.symptomDuration?.trim() || undefined,
  symptomSeverity: draft.symptomSeverity,
  associatedSymptoms: cleanupTerms(draft.associatedSymptoms),
  triageLastQuestion: draft.triageLastQuestion?.trim() || undefined,
  reason: draft.reason?.trim() || undefined,
});