import { prisma } from "../../config/prisma.js";
import type {
  AIChatbotOutput,
  ChatBookingDraft,
  ChatIntent,
  SuggestedAction,
} from "./chatbot.types.js";

type FAQMatch = {
  faq: {
    id: string;
    question: string;
    answer: string;
    keywords: string[];
  };
  score: number;
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const foldText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");

const hasPhrase = (message: string, phrase: string) => {
  const foldedPhrase = foldText(phrase);

  if (!foldedPhrase) return false;

  if (foldedPhrase.length <= 3) {
    return new RegExp(`(^|[^a-z0-9])${escapeRegExp(foldedPhrase)}([^a-z0-9]|$)`).test(message);
  }

  return message.includes(foldedPhrase);
};

const scoreFAQ = (
  foldedMessage: string,
  faq: FAQMatch["faq"],
) => {
  let score = 0;

  for (const keyword of faq.keywords) {
    if (hasPhrase(foldedMessage, keyword)) {
      score += foldText(keyword).split(" ").length >= 2 ? 3 : 1;
    }
  }

  if (hasPhrase(foldedMessage, faq.question)) {
    score += 5;
  }

  return score;
};

const inferIntent = (detectedIntent: ChatIntent, faq: FAQMatch["faq"]): ChatIntent => {
  const text = foldText(`${faq.question} ${faq.keywords.join(" ")}`);

  if (text.includes("thanh toan") || text.includes("hoa don")) {
    return "PAYMENT_GUIDE";
  }

  if (text.includes("tra cuu") || text.includes("lich hen")) {
    return "APPOINTMENT_LOOKUP_GUIDE";
  }

  if (text.includes("dat lich")) {
    return "BOOKING_START";
  }

  return detectedIntent === "UNKNOWN" ? "GENERAL_HOSPITAL_INFO" : detectedIntent;
};

const buildActions = (intent: ChatIntent): SuggestedAction[] => {
  if (intent === "PAYMENT_GUIDE") {
    return [
      {
        type: "CONTACT_STAFF",
        label: "Liên hệ nhân viên hỗ trợ",
        payload: {},
      },
    ];
  }

  if (intent === "APPOINTMENT_LOOKUP_GUIDE") {
    return [
      {
        type: "LOOKUP_APPOINTMENT",
        label: "Tra cứu lịch hẹn",
        payload: {},
      },
    ];
  }

  if (intent === "BOOKING_START") {
    return [
      {
        type: "VIEW_DEPARTMENTS",
        label: "Xem chuyên khoa",
        payload: {},
      },
      {
        type: "VIEW_PACKAGES",
        label: "Xem gói khám",
        payload: {},
      },
    ];
  }

  return [
    {
      type: "VIEW_DEPARTMENTS",
      label: "Xem chuyên khoa",
      payload: {},
    },
    {
      type: "CONTACT_STAFF",
      label: "Liên hệ hỗ trợ",
      payload: {},
    },
  ];
};

class ChatbotFAQService {
  async findDirectAnswer(
    message: string,
    detectedIntent: ChatIntent,
    draft: ChatBookingDraft,
  ): Promise<AIChatbotOutput | null> {
    if (detectedIntent === "SYMPTOM_TRIAGE" || detectedIntent === "DOCTOR_LIST") {
      return null;
    }

    const foldedMessage = foldText(message);
    const faqs = await prisma.chatbotFAQ.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        question: true,
        answer: true,
        keywords: true,
      },
      take: 100,
    });

    const bestMatch = faqs
      .map((faq) => ({
        faq,
        score: scoreFAQ(foldedMessage, faq),
      }))
      .filter((match) => match.score >= 2)
      .sort((a, b) => b.score - a.score)[0];

    if (!bestMatch) return null;

    const intent = inferIntent(detectedIntent, bestMatch.faq);

    return {
      reply: bestMatch.faq.answer,
      intent,
      state: intent === "BOOKING_START" ? "BOOKING_GUIDE" : "IDLE",
      nextStep:
        intent === "BOOKING_START"
          ? "CHOOSE_DEPARTMENT"
          : intent === "PAYMENT_GUIDE"
            ? "SHOW_PAYMENT_GUIDE"
            : "END",
      confidence: Math.min(0.95, 0.65 + bestMatch.score / 10),
      draft,
      suggestedActions: buildActions(intent),
    };
  }
}

export default new ChatbotFAQService();
