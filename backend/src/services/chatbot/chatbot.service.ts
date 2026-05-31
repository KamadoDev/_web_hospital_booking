import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/appError.js";
import geminiAdapter from "./ai/gemini.adapter.js";
import ChatbotActionService from "./chatbot.actions.js";
import ChatbotContextService from "./chatbot.context.js";
import type { ChatbotContext } from "./chatbot.context.js";
import ChatbotFAQService from "./chatbot.faq.js";
import ChatbotSettingsService, {
  DEFAULT_CHATBOT_RUNTIME_SETTINGS,
} from "./chatbot.settings.js";
import {
  detectIntent,
  hasEmergencySignal,
  inferDraftFromMessage,
  isGreetingMessage,
  normalizeMessage,
  sanitizeBookingDraft,
} from "./chatbot.rules.js";
import {
  getOrCreateChatSession,
  mergeDraftFromAction,
  mergeDrafts,
  updateChatSession,
} from "./chatbot.session.js";
import {
  CHAT_INTENTS,
  CHAT_NEXT_STEPS,
  CHAT_STATES,
  type AIChatbotOutput,
  type ChatBookingDraft,
  type ChatbotRequestInput,
  type ChatbotResponse,
  type SuggestedAction,
} from "./chatbot.types.js";

const systemPrompt = `
Ban la tro ly dat lich kham benh cua he thong hospital booking.

Nguyen tac bat buoc:
- Tra loi bang tieng Viet, ngan gon, toi da 2 cau.
- Chi goi y chuyen khoa, goi kham, bac si, lich kham dua tren CONTEXT.
- Khong chan doan benh chac chan, khong ke thuoc, khong thay the bac si.
- Khong bia ten khoa, bac si, goi kham, gia tien, lich kham.
- Neu thieu du lieu, hoi them thong tin hoac huong dan nguoi dung chon buoc tiep theo.
- Neu co dau hieu khan cap, khuyen nguoi dung den co so y te gan nhat hoac goi cap cuu.
- suggestedActions toi da 3 item.
- Chi tra ve JSON hop le, khong markdown.
- Key bat buoc: reply,intent,state,nextStep,confidence,draft,suggestedActions.
- Neu dang goi y khoa thi state=SUGGESTING_DEPARTMENT va nextStep=CHOOSE_DEPARTMENT.
- Chi dung state hop le: IDLE, ASKING_SYMPTOMS, SUGGESTING_DEPARTMENT, SUGGESTING_PACKAGE, CHOOSING_DOCTOR, CHOOSING_DATE, CHOOSING_SLOT, READY_TO_BOOK, BOOKING_GUIDE, EMERGENCY_CARE.
- Chi dung nextStep hop le: ASK_SYMPTOM_DETAILS, CHOOSE_DEPARTMENT, CHOOSE_PACKAGE, CHOOSE_DOCTOR, CHOOSE_DATE, CHOOSE_SLOT, READY_TO_BOOK, SHOW_BOOKING_GUIDE, SHOW_PAYMENT_GUIDE, EMERGENCY_CARE, END.
`;

const normalizeNextStep = (value: unknown, state: AIChatbotOutput["state"]) => {
  if (typeof value === "string" && CHAT_NEXT_STEPS.includes(value as typeof CHAT_NEXT_STEPS[number])) {
    return value as typeof CHAT_NEXT_STEPS[number];
  }

  if (state === "ASKING_SYMPTOMS") return "ASK_SYMPTOM_DETAILS";
  if (state === "SUGGESTING_DEPARTMENT") return "CHOOSE_DEPARTMENT";
  if (state === "SUGGESTING_PACKAGE") return "CHOOSE_PACKAGE";
  if (state === "CHOOSING_DOCTOR") return "CHOOSE_DOCTOR";
  if (state === "CHOOSING_DATE") return "CHOOSE_DATE";
  if (state === "CHOOSING_SLOT") return "CHOOSE_SLOT";
  if (state === "READY_TO_BOOK") return "READY_TO_BOOK";
  if (state === "BOOKING_GUIDE") return "SHOW_BOOKING_GUIDE";
  if (state === "EMERGENCY_CARE") return "EMERGENCY_CARE";
  if (state === "IDLE") return "END";

  return "ASK_SYMPTOM_DETAILS";
};

const buildGreetingOutput = (draft: ChatBookingDraft): AIChatbotOutput => ({
  reply: "Chào bạn, mình có thể hỗ trợ đặt lịch khám, xem chuyên khoa, gói khám hoặc tra cứu lịch hẹn.",
  intent: "GENERAL_HOSPITAL_INFO",
  state: "BOOKING_GUIDE",
  nextStep: "SHOW_BOOKING_GUIDE",
  confidence: 1,
  draft,
  suggestedActions: [
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
    {
      type: "LOOKUP_APPOINTMENT",
      label: "Tra cứu lịch hẹn",
      payload: {},
    },
  ],
});

const parseAIJson = (text: string): AIChatbotOutput => {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  const parsed = JSON.parse(cleaned) as Partial<AIChatbotOutput>;

  if (!parsed.reply || !parsed.intent || !parsed.state) {
    throw new Error("Invalid AI JSON");
  }

  return {
    reply: parsed.reply,
    intent: CHAT_INTENTS.includes(parsed.intent) ? parsed.intent : "UNKNOWN",
    state: CHAT_STATES.includes(parsed.state) ? parsed.state : "IDLE",
    nextStep: normalizeNextStep(parsed.nextStep, CHAT_STATES.includes(parsed.state) ? parsed.state : "IDLE"),
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
    draft: parsed.draft || {},
    suggestedActions: parsed.suggestedActions || [],
  };
};

type ExtendedAIDraft = ChatBookingDraft & {
  suggestedDepartment?: { id?: unknown; slug?: unknown };
  suggestedPackage?: { id?: unknown; slug?: unknown };
};

const readSuggestedDraft = (draft: ChatBookingDraft): ChatBookingDraft => {
  const aiDraft = draft as ExtendedAIDraft;

  return sanitizeBookingDraft({
    ...draft,
    departmentId:
      draft.departmentId ||
      (typeof aiDraft.suggestedDepartment?.id === "string"
        ? aiDraft.suggestedDepartment.id
        : undefined),
    departmentSlug:
      draft.departmentSlug ||
      (typeof aiDraft.suggestedDepartment?.slug === "string"
        ? aiDraft.suggestedDepartment.slug
        : undefined),
    packageId:
      draft.packageId ||
      (typeof aiDraft.suggestedPackage?.id === "string" ? aiDraft.suggestedPackage.id : undefined),
    packageSlug:
      draft.packageSlug ||
      (typeof aiDraft.suggestedPackage?.slug === "string"
        ? aiDraft.suggestedPackage.slug
        : undefined),
  });
};

const hasPayloadKeys = (payload: Record<string, unknown> | undefined) =>
  Boolean(payload && Object.keys(payload).length);

const hydrateActionsFromDraft = (
  actions: SuggestedAction[],
  draft: ChatBookingDraft,
): SuggestedAction[] =>
  actions.map((action) => {
    if (hasPayloadKeys(action.payload)) return action;

    if (action.type === "VIEW_DEPARTMENT" && (draft.departmentId || draft.departmentSlug)) {
      return {
        ...action,
        payload: {
          departmentId: draft.departmentId,
          departmentSlug: draft.departmentSlug,
        },
      };
    }

    if (action.type === "VIEW_PACKAGE" && (draft.packageId || draft.packageSlug)) {
      return {
        ...action,
        payload: {
          packageId: draft.packageId,
          packageSlug: draft.packageSlug,
        },
      };
    }

    if (action.type === "VIEW_DOCTOR" && draft.doctorId) {
      return {
        ...action,
        payload: {
          doctorId: draft.doctorId,
        },
      };
    }

    if (action.type === "VIEW_AVAILABLE_SLOTS" && draft.timeSlotId) {
      return {
        ...action,
        payload: {
          doctorId: draft.doctorId,
          date: draft.date,
          timeSlotId: draft.timeSlotId,
        },
      };
    }

    return action;
  });

const buildDepartmentSuggestion = (
  context: ChatbotContext,
  message: string,
  draft: ChatBookingDraft,
) => {
  const searchText = normalizeMessage(`${message} ${(draft.symptoms || []).join(" ")}`);
  const department = draft.departmentId
    ? context.departments.find((item) => item.id === draft.departmentId)
    : findDepartmentByKeyword(context, searchText);
  const packageItem = department
    ? context.packages.find((item) => item.departmentId === department.id)
    : undefined;

  return {
    department,
    packageItem,
    draft: sanitizeBookingDraft({
      ...draft,
      departmentId: department?.id || draft.departmentId,
      departmentSlug: department?.slug || draft.departmentSlug,
      packageId: packageItem?.id || draft.packageId,
      packageSlug: packageItem?.slug || draft.packageSlug,
    }),
    actions: [
      ...(department
        ? [
            {
              type: "VIEW_DEPARTMENT" as const,
              label: `Xem ${department.name}`,
              payload: {
                departmentId: department.id,
                departmentSlug: department.slug,
              },
            },
          ]
        : []),
      ...(packageItem
        ? [
            {
              type: "VIEW_PACKAGE" as const,
              label: `Xem ${packageItem.name}`,
              payload: {
                packageId: packageItem.id,
                packageSlug: packageItem.slug,
              },
            },
          ]
        : []),
      {
        type: "VIEW_DEPARTMENTS" as const,
        label: "Xem tất cả chuyên khoa",
        payload: {},
      },
    ],
  };
};

const buildDoctorSuggestion = (
  context: ChatbotContext,
  draft: ChatBookingDraft,
) => {
  const doctorsFromSlots = context.availableSlots
    .map((slot) => context.doctors.find((doctor) => doctor.id === slot.doctorId))
    .filter((doctor): doctor is ChatbotContext["doctors"][number] => Boolean(doctor));
  const uniqueDoctors = Array.from(
    new Map([...context.doctors, ...doctorsFromSlots].map((doctor) => [doctor.id, doctor])).values(),
  );
  const doctors = draft.doctorId
    ? uniqueDoctors.filter((doctor) => doctor.id === draft.doctorId)
    : uniqueDoctors;
  const selectedDoctor = doctors[0];
  const slots = selectedDoctor
    ? context.availableSlots.filter((slot) => slot.doctorId === selectedDoctor.id)
    : [];
  const slotActions = slots.slice(0, 3).map((slot) => ({
    type: "VIEW_AVAILABLE_SLOTS" as const,
    label: `${slot.date} ${slot.startTime}-${slot.endTime}`,
    payload: {
      doctorId: slot.doctorId,
      date: slot.date,
      timeSlotId: slot.id,
    },
  }));

  return {
    doctor: selectedDoctor,
    slots,
    draft: sanitizeBookingDraft({
      ...draft,
      doctorId: selectedDoctor?.id || draft.doctorId,
      date: draft.timeSlotId ? draft.date : undefined,
    }),
    actions: [
      ...doctors.slice(0, 3).map((doctor) => ({
        type: "VIEW_DOCTOR" as const,
        label: `${doctor.title || ""} ${doctor.fullName}`.trim(),
        payload: {
          doctorId: doctor.id,
          departmentId: doctor.departmentId,
        },
      })),
      ...slotActions,
      ...(selectedDoctor && !slotActions.length
        ? [
            {
              type: "ASK_MORE_INFO" as const,
              label: "Chọn ngày khám",
              payload: {
                field: "date",
                doctorId: selectedDoctor.id,
                departmentId: selectedDoctor.departmentId,
              },
            },
          ]
        : []),
    ],
  };
};

const repairAIOutput = (
  aiOutput: AIChatbotOutput,
  detectedIntent: AIChatbotOutput["intent"],
  context: ChatbotContext,
  message: string,
  draft: ChatBookingDraft,
): { output: AIChatbotOutput; draft: ChatBookingDraft } => {
  const shouldSuggestDoctor =
    detectedIntent === "DOCTOR_LIST" ||
    detectedIntent === "AVAILABLE_SLOT_LOOKUP" ||
    aiOutput.intent === "DOCTOR_LIST" ||
    aiOutput.intent === "AVAILABLE_SLOT_LOOKUP" ||
    aiOutput.state === "CHOOSING_DOCTOR" ||
    aiOutput.state === "CHOOSING_SLOT";

  if (shouldSuggestDoctor) {
    const suggestion = buildDoctorSuggestion(context, draft);

    if (!suggestion.doctor) {
      return {
        output: {
          ...aiOutput,
          state: aiOutput.state === "IDLE" ? "CHOOSING_DOCTOR" : aiOutput.state,
          nextStep: aiOutput.nextStep === "END" ? "CHOOSE_DOCTOR" : aiOutput.nextStep,
        },
        draft,
      };
    }

    const hasSlotActions = suggestion.actions.some(
      (action) => action.type === "VIEW_AVAILABLE_SLOTS",
    );

    return {
      output: {
        ...aiOutput,
        intent: aiOutput.intent === "UNKNOWN" ? "DOCTOR_LIST" : aiOutput.intent,
        state: hasSlotActions ? "CHOOSING_SLOT" : "CHOOSING_DOCTOR",
        nextStep: hasSlotActions ? "CHOOSE_SLOT" : "CHOOSE_DOCTOR",
        suggestedActions: [...suggestion.actions, ...aiOutput.suggestedActions],
      },
      draft: suggestion.draft,
    };
  }

  const shouldSuggestDepartment =
    detectedIntent === "SYMPTOM_TRIAGE" ||
    aiOutput.intent === "SYMPTOM_TRIAGE" ||
    aiOutput.intent === "DEPARTMENT_LIST" ||
    aiOutput.state === "SUGGESTING_DEPARTMENT";

  if (!shouldSuggestDepartment) {
    return { output: aiOutput, draft };
  }

  const suggestion = buildDepartmentSuggestion(context, message, draft);

  if (!suggestion.department) {
    return {
      output: {
        ...aiOutput,
        intent: aiOutput.intent === "UNKNOWN" ? detectedIntent : aiOutput.intent,
        state: aiOutput.state === "IDLE" ? "ASKING_SYMPTOMS" : aiOutput.state,
        nextStep: aiOutput.state === "IDLE" ? "ASK_SYMPTOM_DETAILS" : aiOutput.nextStep,
      },
      draft,
    };
  }

  return {
    output: {
      ...aiOutput,
      intent: aiOutput.intent === "UNKNOWN" ? "SYMPTOM_TRIAGE" : aiOutput.intent,
      state:
        aiOutput.state === "IDLE" || aiOutput.state === "ASKING_SYMPTOMS"
          ? "SUGGESTING_DEPARTMENT"
          : aiOutput.state,
      nextStep:
        aiOutput.nextStep === "ASK_SYMPTOM_DETAILS" ||
        aiOutput.state === "IDLE" ||
        aiOutput.state === "ASKING_SYMPTOMS"
          ? "CHOOSE_DEPARTMENT"
          : aiOutput.nextStep,
      suggestedActions: [...suggestion.actions, ...aiOutput.suggestedActions],
    },
    draft: suggestion.draft,
  };
};

const findDepartmentByKeyword = (context: ChatbotContext, message: string) => {
  if (message.includes("tim") || message.includes("nguc") || message.includes("kho tho")) {
    return context.departments.find((department) =>
      `${department.name} ${department.slug || ""}`.toLowerCase().includes("tim"),
    );
  }

  if (message.includes("tong quat") || message.includes("dau dau") || message.includes("met")) {
    return context.departments.find((department) =>
      `${department.name} ${department.slug || ""}`.toLowerCase().includes("tong"),
    );
  }

  return context.departments[0];
};

const fallbackOutput = (
  message: string,
  detectedIntent: AIChatbotOutput["intent"],
  context: ChatbotContext,
  draft: AIChatbotOutput["draft"],
): AIChatbotOutput => {
  if (detectedIntent === "SYMPTOM_TRIAGE") {
    const suggestion = buildDepartmentSuggestion(context, message, draft);
    const department = suggestion.department;

    return {
      reply: department
        ? `AI dang tam thoi qua tai. Dua tren thong tin hien co, ban co the bat dau voi ${department.name} de duoc bac si danh gia phu hop.`
        : "AI dang tam thoi qua tai. Ban co the xem danh sach chuyen khoa hoac mo ta them trieu chung de minh ho tro tiep.",
      intent: "SYMPTOM_TRIAGE",
      state: department ? "SUGGESTING_DEPARTMENT" : "ASKING_SYMPTOMS",
      nextStep: department ? "CHOOSE_DEPARTMENT" : "ASK_SYMPTOM_DETAILS",
      confidence: 0.55,
      draft: suggestion.draft,
      suggestedActions: department
        ? suggestion.actions
        : [
            {
              type: "ASK_MORE_INFO",
              label: "Mô tả thêm triệu chứng",
              payload: {},
            },
          ],
    };
  }

  if (detectedIntent === "DEPARTMENT_LIST") {
    const suggestion = buildDepartmentSuggestion(context, message, draft);

    if (suggestion.department) {
      return {
        reply: `AI dang tam thoi qua tai. Dua tren thong tin hien co, ban co the xem ${suggestion.department.name} hoac goi kham lien quan de tiep tuc dat lich.`,
        intent: "DEPARTMENT_LIST",
        state: "SUGGESTING_DEPARTMENT",
        nextStep: "CHOOSE_DEPARTMENT",
        confidence: 0.55,
        draft: suggestion.draft,
        suggestedActions: suggestion.actions,
      };
    }
  }

  if (detectedIntent === "PACKAGE_LIST") {
    return {
      reply: context.packages.length
        ? "AI dang tam thoi qua tai. Day la mot so goi kham dang co trong he thong, ban co the chon de xem chi tiet."
        : "AI dang tam thoi qua tai. Hien chua tim thay goi kham phu hop trong du lieu.",
      intent: "PACKAGE_LIST",
      state: "SUGGESTING_PACKAGE",
      nextStep: "CHOOSE_PACKAGE",
      confidence: 0.55,
      draft,
      suggestedActions: context.packages.slice(0, 3).map((item) => ({
        type: "VIEW_PACKAGE",
        label: item.name,
        payload: {
          packageId: item.id,
          packageSlug: item.slug,
        },
      })),
    };
  }

  if (detectedIntent === "DOCTOR_LIST") {
    const suggestion = buildDoctorSuggestion(context, draft);

    return {
      reply: suggestion.doctor
        ? "AI dang tam thoi qua tai. Minh tim thay cac bac si phu hop trong he thong, ban co the chon bac si de xem lich."
        : "AI dang tam thoi qua tai. Hien chua tim thay bac si phu hop, ban co the chon chuyen khoa truoc.",
      intent: "DOCTOR_LIST",
      state: suggestion.slots.length ? "CHOOSING_SLOT" : "CHOOSING_DOCTOR",
      nextStep: suggestion.slots.length ? "CHOOSE_SLOT" : "CHOOSE_DOCTOR",
      confidence: 0.55,
      draft: suggestion.draft,
      suggestedActions: suggestion.actions,
    };
  }

  if (detectedIntent === "AVAILABLE_SLOT_LOOKUP") {
    const suggestion = buildDoctorSuggestion(context, draft);

    return {
      reply: suggestion.slots.length
        ? "AI dang tam thoi qua tai. Minh tim thay mot so lich trong, ban co the chon khung gio phu hop."
        : "AI dang tam thoi qua tai. De xem lich trong, ban vui long chon bac si va ngay muon kham.",
      intent: "AVAILABLE_SLOT_LOOKUP",
      state: suggestion.slots.length ? "CHOOSING_SLOT" : "CHOOSING_DOCTOR",
      nextStep: suggestion.slots.length ? "CHOOSE_SLOT" : "CHOOSE_DOCTOR",
      confidence: 0.55,
      draft: suggestion.draft,
      suggestedActions: suggestion.actions,
    };
  }

  if (detectedIntent === "BOOKING_START") {
    return {
      reply: "AI dang tam thoi qua tai. De dat lich, ban can chon chuyen khoa, goi kham hoac bac si, sau do chon khung gio va xac thuc OTP.",
      intent: "BOOKING_START",
      state: "BOOKING_GUIDE",
      nextStep: "CHOOSE_DEPARTMENT",
      confidence: 0.55,
      draft,
      suggestedActions: [
        { type: "VIEW_DEPARTMENTS", label: "Xem chuyên khoa", payload: {} },
        { type: "VIEW_PACKAGES", label: "Xem gói khám", payload: {} },
      ],
    };
  }

  return {
    reply: "AI dang tam thoi qua tai. Minh van co the ho tro ban xem chuyen khoa, goi kham, bac si hoac huong dan dat lich.",
    intent: detectedIntent || "UNKNOWN",
    state: "ASKING_SYMPTOMS",
    nextStep: "ASK_SYMPTOM_DETAILS",
    confidence: 0.35,
    draft,
    suggestedActions: [
      { type: "VIEW_DEPARTMENTS", label: "Xem danh sách chuyên khoa", payload: {} },
      { type: "VIEW_PACKAGES", label: "Xem gói khám", payload: {} },
      { type: "ASK_MORE_INFO", label: "Mô tả triệu chứng", payload: { message } },
    ],
  };
};

class ChatbotService {
  async handleMessage(input: ChatbotRequestInput): Promise<ChatbotResponse> {
    const runtimeSetting = await ChatbotSettingsService.getRuntimeSettings();
    const settings = runtimeSetting.isActive
      ? runtimeSetting.value
      : DEFAULT_CHATBOT_RUNTIME_SETTINGS;
    const session = await getOrCreateChatSession(
      input.sessionId,
      input.phone,
      settings.sessionExpiresDays,
    );
    const sessionId = session.id;
    const normalizedMessage = normalizeMessage(input.message);
    const requestDraft = mergeDrafts(session.draft, input.draft);
    const actionDraft = mergeDraftFromAction(requestDraft, input.action);
    const baseDraft = sanitizeBookingDraft(
      inferDraftFromMessage(
        normalizedMessage,
        mergeDrafts(requestDraft, actionDraft),
        input.message,
      ),
    );

    if (hasEmergencySignal(normalizedMessage)) {
      const response: ChatbotResponse = {
        sessionId,
        reply: "Trieu chung ban mo ta co the can xu ly khan cap. Ban nen den co so y te gan nhat hoac goi cap cuu ngay de duoc ho tro kip thoi.",
        intent: "SYMPTOM_TRIAGE",
        state: "EMERGENCY_CARE",
        nextStep: "EMERGENCY_CARE",
        confidence: 1,
        draft: baseDraft,
        suggestedActions: [
          {
            type: "EMERGENCY_ADVICE",
            label: "Den co so y te gan nhat",
            payload: {},
          },
          {
            type: "CONTACT_STAFF",
            label: "Liên hệ nhân viên hỗ trợ",
            payload: {},
          },
        ],
      };

      await updateChatSession(
        sessionId,
        response,
        input.message,
        input.phone,
        settings.sessionExpiresDays,
      );
      await this.saveLog(input, response);
      return response;
    }

    const detectedIntent = detectIntent(normalizedMessage);

    if (
      detectedIntent === "UNKNOWN" &&
      isGreetingMessage(normalizedMessage) &&
      !baseDraft.symptoms?.length
    ) {
      const greetingOutput = buildGreetingOutput(baseDraft);
      const suggestedActions = await ChatbotActionService.validateActions(
        greetingOutput.suggestedActions,
        greetingOutput.draft,
        settings.maxSuggestedActions,
      );
      const response: ChatbotResponse = {
        sessionId,
        ...greetingOutput,
        suggestedActions,
      };

      await updateChatSession(
        sessionId,
        response,
        input.message,
        input.phone,
        settings.sessionExpiresDays,
      );
      await this.saveLog(input, response);
      return response;
    }

    const faqOutput = settings.faqEnabled
      ? await ChatbotFAQService.findDirectAnswer(
          input.message,
          detectedIntent,
          baseDraft,
        )
      : null;

    if (faqOutput) {
      const suggestedActions = await ChatbotActionService.validateActions(
        faqOutput.suggestedActions,
        faqOutput.draft,
        settings.maxSuggestedActions,
      );
      const response: ChatbotResponse = {
        sessionId,
        ...faqOutput,
        suggestedActions,
      };

      await updateChatSession(
        sessionId,
        response,
        input.message,
        input.phone,
        settings.sessionExpiresDays,
      );
      await this.saveLog(input, response);
      return response;
    }

    const context = await ChatbotContextService.load(detectedIntent, baseDraft);
    const contextText = ChatbotContextService.format(context);
    const userPrompt = [
      `SESSION_ID: ${sessionId}`,
      `DETECTED_INTENT: ${detectedIntent}`,
      `CURRENT_DRAFT: ${JSON.stringify(baseDraft)}`,
      `USER_ACTION: ${JSON.stringify(input.action || null)}`,
      "",
      "CONTEXT:",
      contextText,
      "",
      `USER_MESSAGE: ${input.message}`,
    ].join("\n");

    let aiOutput: AIChatbotOutput;

    if (settings.aiEnabled) {
      try {
        const text = await geminiAdapter.generateReply({
          systemPrompt,
          userPrompt,
          model: settings.model,
        });
        aiOutput = parseAIJson(text);
      } catch {
        if (!settings.fallbackEnabled) {
          throw new AppError("AI khong phan hoi thanh cong va fallback dang tat", 502);
        }

        aiOutput = fallbackOutput(input.message, detectedIntent, context, baseDraft);
      }
    } else {
      if (!settings.fallbackEnabled) {
        aiOutput = {
          reply: "Chatbot AI dang tam tat. Ban co the lien he nhan vien ho tro hoac thu lai sau.",
          intent: detectedIntent,
          state: "IDLE",
          nextStep: "END",
          confidence: 0.3,
          draft: baseDraft,
          suggestedActions: [
            {
              type: "CONTACT_STAFF",
              label: "Liên hệ hỗ trợ",
              payload: {},
            },
          ],
        };
      } else {
        aiOutput = fallbackOutput(input.message, detectedIntent, context, baseDraft);
      }
    }

    const aiDraft = sanitizeBookingDraft(
      mergeDrafts(baseDraft, readSuggestedDraft(aiOutput.draft)),
    );
    const repaired = repairAIOutput(
      aiOutput,
      detectedIntent,
      context,
      input.message,
      aiDraft,
    );
    const mergedDraft = repaired.draft;
    const suggestedActions = await ChatbotActionService.validateActions(
      hydrateActionsFromDraft(repaired.output.suggestedActions, mergedDraft),
      mergedDraft,
      settings.maxSuggestedActions,
    );
    const response: ChatbotResponse = {
      sessionId,
      reply: repaired.output.reply,
      intent: repaired.output.intent,
      state: repaired.output.state,
      nextStep: repaired.output.nextStep,
      confidence: repaired.output.confidence,
      draft: mergedDraft,
      suggestedActions,
    };

    await updateChatSession(
      sessionId,
      response,
      input.message,
      input.phone,
      settings.sessionExpiresDays,
    );
    await this.saveLog(input, response);
    return response;
  }

  private async saveLog(input: ChatbotRequestInput, response: ChatbotResponse) {
    await prisma.chatbotLog.create({
      data: {
        guestPhone: input.phone,
        sessionId: response.sessionId,
        message: input.message,
        response: response.reply,
        intent: response.intent,
      },
    });
  }
}

export default new ChatbotService();
