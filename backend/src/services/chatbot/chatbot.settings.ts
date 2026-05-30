import type { Prisma } from "../../../generated/prisma/client.js";
import { prisma } from "../../config/prisma.js";

export const CHATBOT_RUNTIME_SETTING_KEY = "chatbot_runtime";

export type ChatbotRuntimeSettings = {
  aiEnabled: boolean;
  fallbackEnabled: boolean;
  faqEnabled: boolean;
  model: string;
  maxSuggestedActions: number;
  sessionExpiresDays: number;
};

export const DEFAULT_CHATBOT_RUNTIME_SETTINGS: ChatbotRuntimeSettings = {
  aiEnabled: true,
  fallbackEnabled: true,
  faqEnabled: true,
  model: "gemini-2.5-flash",
  maxSuggestedActions: 3,
  sessionExpiresDays: 7,
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const readBoolean = (
  value: Record<string, unknown>,
  key: keyof ChatbotRuntimeSettings,
  fallback: boolean,
) => (typeof value[key] === "boolean" ? value[key] : fallback);

const readString = (
  value: Record<string, unknown>,
  key: keyof ChatbotRuntimeSettings,
  fallback: string,
) => (typeof value[key] === "string" && value[key].trim() ? value[key].trim() : fallback);

const readNumber = (
  value: Record<string, unknown>,
  key: keyof ChatbotRuntimeSettings,
  fallback: number,
  options: { min: number; max: number },
) => {
  const raw = value[key];
  const number = typeof raw === "number" && Number.isFinite(raw) ? raw : fallback;

  return Math.min(Math.max(Math.trunc(number), options.min), options.max);
};

export const normalizeRuntimeSettings = (value: unknown): ChatbotRuntimeSettings => {
  const source = isObject(value) ? value : {};

  return {
    aiEnabled: readBoolean(source, "aiEnabled", DEFAULT_CHATBOT_RUNTIME_SETTINGS.aiEnabled),
    fallbackEnabled: readBoolean(
      source,
      "fallbackEnabled",
      DEFAULT_CHATBOT_RUNTIME_SETTINGS.fallbackEnabled,
    ),
    faqEnabled: readBoolean(source, "faqEnabled", DEFAULT_CHATBOT_RUNTIME_SETTINGS.faqEnabled),
    model: readString(source, "model", DEFAULT_CHATBOT_RUNTIME_SETTINGS.model),
    maxSuggestedActions: readNumber(
      source,
      "maxSuggestedActions",
      DEFAULT_CHATBOT_RUNTIME_SETTINGS.maxSuggestedActions,
      { min: 1, max: 6 },
    ),
    sessionExpiresDays: readNumber(
      source,
      "sessionExpiresDays",
      DEFAULT_CHATBOT_RUNTIME_SETTINGS.sessionExpiresDays,
      { min: 1, max: 30 },
    ),
  };
};

const toPrismaJson = (value: unknown) =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

class ChatbotSettingsService {
  async getRuntimeSettings() {
    const setting = await prisma.chatbotSetting.upsert({
      where: { key: CHATBOT_RUNTIME_SETTING_KEY },
      update: {},
      create: {
        key: CHATBOT_RUNTIME_SETTING_KEY,
        value: toPrismaJson(DEFAULT_CHATBOT_RUNTIME_SETTINGS),
        description: "Runtime settings for chatbot AI, FAQ, fallback and session behavior",
        isActive: true,
      },
      select: {
        id: true,
        key: true,
        value: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      ...setting,
      value: normalizeRuntimeSettings(setting.value),
    };
  }

  async updateRuntimeSettings(input: Partial<ChatbotRuntimeSettings>) {
    const current = await this.getRuntimeSettings();
    const nextValue = normalizeRuntimeSettings({
      ...current.value,
      ...input,
    });

    const setting = await prisma.chatbotSetting.update({
      where: { key: CHATBOT_RUNTIME_SETTING_KEY },
      data: {
        value: toPrismaJson(nextValue),
        isActive: true,
      },
      select: {
        id: true,
        key: true,
        value: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      ...setting,
      value: normalizeRuntimeSettings(setting.value),
    };
  }
}

export default new ChatbotSettingsService();
