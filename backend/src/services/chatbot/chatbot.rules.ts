import type { ChatBookingDraft, ChatIntent } from "./chatbot.types.js";

type SymptomRule = {
  canonical: string;
  aliases: string[];
  excludedPhrases?: string[];
};

const emergencyKeywords = [
  "dau nguc du doi",
  "kho tho nang",
  "ngat",
  "co giat",
  "yeu liet",
  "liet nua nguoi",
  "chay mau nhieu",
  "dau dau du doi",
  "dau dau dot ngot",
];

const greetingKeywords = [
  "xin chao",
  "chao",
  "hello",
  "hi",
  "hey",
];

const symptomRules: SymptomRule[] = [
  { canonical: "dau dau", aliases: ["dau dau", "đau đầu", "nhuc dau", "nhức đầu"] },
  { canonical: "dau vung tran", aliases: ["dau vung tran", "đau vùng trán", "dau tran", "đau trán", "vung tran", "vùng trán"] },
  { canonical: "dau am i", aliases: ["dau am i", "đau âm ỉ", "am i", "âm ỉ"] },
  { canonical: "dau khi van dong manh", aliases: ["dau khi van dong manh", "vận động mạnh", "van dong manh", "da banh", "đá banh"] },
  { canonical: "dau", aliases: ["dau", "đau"] },
  { canonical: "kho tho", aliases: ["kho tho", "khó thở"] },
  { canonical: "sot", aliases: ["sot", "sốt"] },
  { canonical: "ho", aliases: ["ho"], excludedPhrases: ["ho tro", "ho so", "hoan", "hoi"] },
  { canonical: "chong mat", aliases: ["chong mat", "chóng mặt"] },
  { canonical: "met", aliases: ["met", "mệt", "met moi", "mệt mỏi"] },
  { canonical: "buon non", aliases: ["buon non", "buồn nôn"] },
];

const negationWords = ["khong", "ko", "k", "chua"];
const negationModifiers = ["", "bi", "co", "kem", "thay", "con"];

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const foldVietnamese = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");

const hasPhrase = (foldedMessage: string, foldedPhrase: string) => {
  if (foldedPhrase.length <= 3) {
    return new RegExp(`(^|[^a-z0-9])${escapeRegExp(foldedPhrase)}([^a-z0-9]|$)`).test(foldedMessage);
  }

  return foldedMessage.includes(foldedPhrase);
};

const isNegatedPhrase = (foldedMessage: string, foldedPhrase: string) => {
  for (const negation of negationWords) {
    for (const modifier of negationModifiers) {
      const prefix = modifier ? `${negation} ${modifier} ` : `${negation} `;
      if (foldedMessage.includes(`${prefix}${foldedPhrase}`)) {
        return true;
      }
    }
  }

  return false;
};

const hasAffirmedPhrase = (foldedMessage: string, phrase: string) => {
  const foldedPhrase = foldVietnamese(phrase);

  return hasPhrase(foldedMessage, foldedPhrase) && !isNegatedPhrase(foldedMessage, foldedPhrase);
};

const hasExcludedPhrase = (foldedMessage: string, rule: SymptomRule) =>
  (rule.excludedPhrases || []).some((phrase) => hasPhrase(foldedMessage, phrase));

const getNegatedSymptoms = (normalizedMessage: string) => {
  const foldedMessage = foldVietnamese(normalizedMessage);

  return symptomRules
    .filter((rule) =>
      rule.aliases.some((alias) => isNegatedPhrase(foldedMessage, foldVietnamese(alias))),
    )
    .map((rule) => rule.canonical);
};

const cleanupSymptoms = (symptoms: string[] = []) => {
  const cleaned = new Set<string>();

  for (const symptom of symptoms) {
    const normalizedSymptom = normalizeMessage(symptom);
    if (!normalizedSymptom) continue;
    if (getNegatedSymptoms(normalizedSymptom).length) continue;

    for (const extractedSymptom of extractSymptoms(normalizedSymptom)) {
      cleaned.add(extractedSymptom);
    }
  }

  if (
    cleaned.has("dau dau") ||
    cleaned.has("dau vung tran") ||
    cleaned.has("dau khi van dong manh")
  ) {
    cleaned.delete("dau");
  }

  return Array.from(cleaned);
};

export const normalizeMessage = (message: string) =>
  message.trim().replace(/\s+/g, " ").toLowerCase();

export const hasEmergencySignal = (normalizedMessage: string) => {
  const foldedMessage = foldVietnamese(normalizedMessage);

  return emergencyKeywords.some((keyword) => hasPhrase(foldedMessage, keyword));
};

export const isGreetingMessage = (normalizedMessage: string) => {
  const foldedMessage = foldVietnamese(normalizedMessage);

  return greetingKeywords.some((keyword) => hasPhrase(foldedMessage, keyword));
};

export const detectIntent = (normalizedMessage: string): ChatIntent => {
  const foldedMessage = foldVietnamese(normalizedMessage);

  if (hasEmergencySignal(normalizedMessage)) return "SYMPTOM_TRIAGE";

  if (foldedMessage.includes("thanh toan") || foldedMessage.includes("hoa don")) {
    return "PAYMENT_GUIDE";
  }

  if (
    foldedMessage.includes("bhyt") ||
    foldedMessage.includes("bao hiem") ||
    foldedMessage.includes("ho tro")
  ) {
    return "GENERAL_HOSPITAL_INFO";
  }

  if (foldedMessage.includes("dat lich")) {
    return "BOOKING_START";
  }

  if (foldedMessage.includes("lich trong") || foldedMessage.includes("slot")) {
    return "AVAILABLE_SLOT_LOOKUP";
  }

  if (foldedMessage.includes("bac si")) {
    return "DOCTOR_LIST";
  }

  if (hasPhrase(foldedMessage, "goi")) {
    return "PACKAGE_LIST";
  }

  if (foldedMessage.includes("khoa") || foldedMessage.includes("chuyen khoa")) {
    return "DEPARTMENT_LIST";
  }

  if (extractSymptoms(normalizedMessage).length) {
    return "SYMPTOM_TRIAGE";
  }

  return "UNKNOWN";
};

export const extractSymptoms = (normalizedMessage: string) => {
  const foldedMessage = foldVietnamese(normalizedMessage);
  const negatedSymptoms = getNegatedSymptoms(normalizedMessage);
  const symptoms: string[] = [];

  for (const rule of symptomRules) {
    if (negatedSymptoms.includes(rule.canonical)) continue;
    if (hasExcludedPhrase(foldedMessage, rule)) continue;

    if (rule.aliases.some((alias) => hasAffirmedPhrase(foldedMessage, alias))) {
      symptoms.push(rule.canonical);
    }
  }

  return symptoms;
};

export const inferDraftFromMessage = (
  normalizedMessage: string,
  draft: ChatBookingDraft,
  originalMessage?: string,
): ChatBookingDraft => {
  const symptoms = extractSymptoms(normalizedMessage);
  const negatedSymptoms = getNegatedSymptoms(normalizedMessage);
  const currentSymptoms = (draft.symptoms || []).filter(
    (symptom) => !negatedSymptoms.includes(foldVietnamese(symptom)),
  );

  if (!symptoms.length && currentSymptoms.length === (draft.symptoms || []).length) {
    return draft;
  }

  return {
    ...draft,
    symptoms: cleanupSymptoms([...currentSymptoms, ...symptoms]),
    reason: draft.reason || originalMessage?.trim() || symptoms.join(", "),
  };
};

export const sanitizeBookingDraft = (draft: ChatBookingDraft): ChatBookingDraft => ({
  departmentId: draft.departmentId,
  departmentSlug: draft.departmentSlug,
  packageId: draft.packageId,
  packageSlug: draft.packageSlug,
  doctorId: draft.doctorId,
  date: draft.date,
  timeSlotId: draft.timeSlotId,
  symptoms: cleanupSymptoms(draft.symptoms),
  reason: draft.reason,
});
