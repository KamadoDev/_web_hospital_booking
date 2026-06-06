import { randomUUID } from "crypto";
import type { Prisma } from "../../../generated/prisma/client.js";
import { prisma } from "../../config/prisma.js";
import { sanitizeBookingDraft } from "./chatbot.rules.js";
import type { ChatAction, ChatBookingDraft } from "./chatbot.types.js";
import type { ChatbotResponse } from "./chatbot.types.js";

const readString = (payload: Record<string, unknown> | undefined, key: string) => {
  const value = payload?.[key];
  return typeof value === "string" ? value : undefined;
};

export const getOrCreateSessionId = (sessionId?: string) => sessionId || randomUUID();

const DEFAULT_SESSION_EXPIRES_DAYS = 7;

const getSessionExpiresAt = (sessionExpiresDays = DEFAULT_SESSION_EXPIRES_DAYS) =>
  new Date(Date.now() + sessionExpiresDays * 24 * 60 * 60 * 1000);

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const toPrismaJson = (value: unknown) =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

const readDraft = (value: unknown): ChatBookingDraft => {
  if (!isObject(value)) return {};

  return sanitizeBookingDraft({
    departmentId: readString(value, "departmentId"),
    departmentSlug: readString(value, "departmentSlug"),
    packageId: readString(value, "packageId"),
    packageSlug: readString(value, "packageSlug"),
    doctorId: readString(value, "doctorId"),
    date: readString(value, "date"),
    timeSlotId: readString(value, "timeSlotId"),
    symptoms: Array.isArray(value.symptoms)
      ? value.symptoms.filter((item): item is string => typeof item === "string")
      : undefined,
    reason: readString(value, "reason"),
  });
};

export const getOrCreateChatSession = async (
  sessionId?: string,
  phone?: string,
  sessionExpiresDays = DEFAULT_SESSION_EXPIRES_DAYS,
) => {
  if (sessionId) {
    const existingSession = await prisma.chatbotSession.findUnique({
      where: { id: sessionId },
    });

    if (existingSession) {
      if (!existingSession.expiresAt || existingSession.expiresAt <= new Date()) {
        const resetSession = await prisma.chatbotSession.update({
          where: { id: sessionId },
          data: {
            draft: toPrismaJson({}),
            currentIntent: null,
            currentState: null,
            lastActions: toPrismaJson([]),
            lastMessage: null,
            lastResponse: null,
            isActive: true,
            guestPhone: phone,
            expiresAt: getSessionExpiresAt(sessionExpiresDays),
          },
        });

        return {
          id: resetSession.id,
          draft: {},
        };
      }

      return {
        id: existingSession.id,
        draft: readDraft(existingSession.draft),
      };
    }
  }

  const session = await prisma.chatbotSession.create({
    data: {
      id: sessionId || randomUUID(),
      guestPhone: phone,
      expiresAt: getSessionExpiresAt(sessionExpiresDays),
    },
  });

  return {
    id: session.id,
    draft: readDraft(session.draft),
  };
};

export const updateChatSession = async (
  sessionId: string,
  response: ChatbotResponse,
  message: string,
  phone?: string,
  sessionExpiresDays = DEFAULT_SESSION_EXPIRES_DAYS,
) => {
  await prisma.chatbotSession.update({
    where: { id: sessionId },
    data: {
      guestPhone: phone,
      draft: toPrismaJson(response.draft),
      currentIntent: response.intent,
      currentState: response.state,
      lastActions: toPrismaJson(response.suggestedActions),
      lastMessage: message,
      lastResponse: response.reply,
      isActive: true,
      expiresAt: getSessionExpiresAt(sessionExpiresDays),
    },
  });
};

export const mergeDraftFromAction = (
  draft: ChatBookingDraft,
  action?: ChatAction,
): ChatBookingDraft => {
  if (!action) return draft;

  const payload = action.payload;

  switch (action.type) {
    case "VIEW_DEPARTMENTS":
      return {
        ...draft,
        departmentId: undefined,
        departmentSlug: undefined,
        packageId: undefined,
        packageSlug: undefined,
        doctorId: undefined,
        timeSlotId: undefined,
      };
    case "VIEW_PACKAGES":
      return {
        ...draft,
        packageId: undefined,
        packageSlug: undefined,
        timeSlotId: undefined,
      };
    case "VIEW_DOCTORS":
      return {
        ...draft,
        doctorId: undefined,
        timeSlotId: undefined,
      };
    case "VIEW_DEPARTMENT":
    case "SELECT_DEPARTMENT":
      return {
        ...draft,
        departmentId: readString(payload, "departmentId") || draft.departmentId,
        departmentSlug: readString(payload, "departmentSlug") || draft.departmentSlug,
      };
    case "VIEW_PACKAGE":
    case "SELECT_PACKAGE":
      return {
        ...draft,
        packageId: readString(payload, "packageId") || draft.packageId,
        packageSlug: readString(payload, "packageSlug") || draft.packageSlug,
      };
    case "VIEW_DOCTOR":
    case "SELECT_DOCTOR":
      return {
        ...draft,
        doctorId: readString(payload, "doctorId") || draft.doctorId,
      };
    case "VIEW_AVAILABLE_SLOTS":
    case "SELECT_SLOT":
      return {
        ...draft,
        doctorId: readString(payload, "doctorId") || draft.doctorId,
        date: readString(payload, "date") || draft.date,
        timeSlotId: readString(payload, "timeSlotId") || draft.timeSlotId,
      };
    case "CHANGE_DATE":
      return {
        ...draft,
        doctorId: readString(payload, "doctorId") || draft.doctorId,
        date: readString(payload, "date"),
        timeSlotId: undefined,
      };
    case "CHANGE_DOCTOR":
      return {
        ...draft,
        doctorId: undefined,
        timeSlotId: undefined,
      };
    default:
      return draft;
  }
};

export const mergeDrafts = (...drafts: (ChatBookingDraft | undefined)[]) =>
  drafts.reduce<ChatBookingDraft>(
    (result, draft) => ({
      ...result,
      ...(draft || {}),
      symptoms: Array.from(new Set([...(result.symptoms || []), ...((draft || {}).symptoms || [])])),
    }),
    {},
  );
