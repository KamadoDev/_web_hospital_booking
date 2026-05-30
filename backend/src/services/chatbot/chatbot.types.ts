export const CHAT_INTENTS = [
  "SYMPTOM_TRIAGE",
  "DEPARTMENT_LIST",
  "DEPARTMENT_DETAIL",
  "PACKAGE_LIST",
  "PACKAGE_DETAIL",
  "DOCTOR_LIST",
  "AVAILABLE_SLOT_LOOKUP",
  "BOOKING_START",
  "BOOKING_FORM_HELP",
  "APPOINTMENT_LOOKUP_GUIDE",
  "PAYMENT_GUIDE",
  "GENERAL_HOSPITAL_INFO",
  "UNKNOWN",
] as const;

export const CHAT_STATES = [
  "IDLE",
  "ASKING_SYMPTOMS",
  "SUGGESTING_DEPARTMENT",
  "SUGGESTING_PACKAGE",
  "CHOOSING_DOCTOR",
  "CHOOSING_DATE",
  "CHOOSING_SLOT",
  "READY_TO_BOOK",
  "BOOKING_GUIDE",
  "EMERGENCY_CARE",
] as const;

export const SUGGESTED_ACTION_TYPES = [
  "ASK_MORE_INFO",
  "VIEW_DEPARTMENTS",
  "VIEW_DEPARTMENT",
  "VIEW_PACKAGES",
  "VIEW_PACKAGE",
  "VIEW_DOCTORS",
  "VIEW_DOCTOR",
  "VIEW_AVAILABLE_SLOTS",
  "START_BOOKING",
  "LOOKUP_APPOINTMENT",
  "CONTACT_STAFF",
  "EMERGENCY_ADVICE",
] as const;

export const CHAT_NEXT_STEPS = [
  "ASK_SYMPTOM_DETAILS",
  "CHOOSE_DEPARTMENT",
  "CHOOSE_PACKAGE",
  "CHOOSE_DOCTOR",
  "CHOOSE_DATE",
  "CHOOSE_SLOT",
  "READY_TO_BOOK",
  "SHOW_BOOKING_GUIDE",
  "SHOW_PAYMENT_GUIDE",
  "EMERGENCY_CARE",
  "END",
] as const;

export type ChatIntent = typeof CHAT_INTENTS[number];
export type ChatState = typeof CHAT_STATES[number];
export type ChatNextStep = typeof CHAT_NEXT_STEPS[number];
export type SuggestedActionType = typeof SUGGESTED_ACTION_TYPES[number];

export type ChatBookingDraft = {
  departmentId?: string;
  departmentSlug?: string;
  packageId?: string;
  packageSlug?: string;
  doctorId?: string;
  date?: string;
  timeSlotId?: string;
  symptoms?: string[];
  reason?: string;
};

export type ChatAction = {
  type: string;
  label?: string;
  payload?: Record<string, unknown>;
};

export type SuggestedAction = {
  type: SuggestedActionType;
  label: string;
  payload: Record<string, unknown>;
};

export type ChatbotRequestInput = {
  sessionId?: string;
  message: string;
  phone?: string;
  draft?: ChatBookingDraft;
  action?: ChatAction;
};

export type AIChatbotOutput = {
  reply: string;
  intent: ChatIntent;
  state: ChatState;
  nextStep: ChatNextStep;
  confidence: number;
  draft: ChatBookingDraft;
  suggestedActions: SuggestedAction[];
};

export type ChatbotResponse = AIChatbotOutput & {
  sessionId: string;
};
