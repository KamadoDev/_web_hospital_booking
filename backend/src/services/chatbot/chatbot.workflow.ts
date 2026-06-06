import type { ChatbotContext } from "./chatbot.context.js";
import { sanitizeBookingDraft } from "./chatbot.rules.js";
import type {
  AIChatbotOutput,
  ChatAction,
  ChatBookingDraft,
  ChatIntent,
  ChatbotResultGroup,
  SuggestedAction,
} from "./chatbot.types.js";

type WorkflowInput = {
  message: string;
  detectedIntent: ChatIntent;
  context: ChatbotContext;
  draft: ChatBookingDraft;
  action?: ChatAction;
};

const foldText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");

const createOutput = (
  output: Omit<AIChatbotOutput, "confidence"> & { confidence?: number },
): AIChatbotOutput => ({
  confidence: output.confidence ?? 0.82,
  ...output,
});

const formatDateLabel = (value: string) => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value;

  return `${match[3]}/${match[2]}/${match[1]}`;
};

const findDepartment = (
  context: ChatbotContext,
  message: string,
  draft: ChatBookingDraft,
) => {
  if (draft.departmentId) {
    return context.departments.find((department) => department.id === draft.departmentId);
  }

  if (draft.departmentSlug) {
    return context.departments.find((department) => department.slug === draft.departmentSlug);
  }

  const foldedMessage = foldText(`${message} ${(draft.symptoms || []).join(" ")}`);

  return context.departments.find((department) => {
    const haystack = foldText(`${department.name} ${department.slug || ""} ${department.description || ""}`);
    return haystack
      .split(" ")
      .filter((word) => word.length >= 3)
      .some((word) => foldedMessage.includes(word));
  });
};

const getDepartmentActions = (context: ChatbotContext, department?: ChatbotContext["departments"][number]) => {
  if (department) {
    return [
      {
        type: "VIEW_DEPARTMENT",
        label: `Xem ${department.name}`,
        payload: {
          departmentId: department.id,
          departmentSlug: department.slug,
        },
      },
    ] satisfies SuggestedAction[];
  }

  return context.departments.slice(0, 3).map((item) => ({
    type: "VIEW_DEPARTMENT" as const,
    label: item.name,
    payload: {
      departmentId: item.id,
      departmentSlug: item.slug,
    },
  }));
};

const buildDepartmentListText = (context: ChatbotContext, limit = 6) => {
  if (!context.departments.length) return "";

  const lines = context.departments
    .slice(0, limit)
    .map((department, index) => `${index + 1}. ${department.name}`);
  const moreText = context.departments.length > limit
    ? `\nCòn ${context.departments.length - limit} chuyên khoa khác trên website.`
    : "";

  return `Danh sách chuyên khoa đang hoạt động:\n${lines.join("\n")}${moreText}`;
};

const getPackageActions = (
  context: ChatbotContext,
  departmentId?: string,
) =>
  context.packages
    .filter((item) => !departmentId || item.departmentId === departmentId)
    .slice(0, 3)
    .map((item) => ({
      type: "VIEW_PACKAGE" as const,
      label: item.name,
      payload: {
        packageId: item.id,
        packageSlug: item.slug,
      },
    }));

const getDoctorActions = (
  context: ChatbotContext,
  departmentId?: string,
) =>
  context.doctors
    .filter((doctor) => !departmentId || doctor.departmentId === departmentId)
    .slice(0, 3)
    .map((doctor) => ({
      type: "VIEW_DOCTOR" as const,
      label: `${doctor.title || ""} ${doctor.fullName}`.trim(),
      payload: {
        doctorId: doctor.id,
        departmentId: doctor.departmentId,
      },
    }));

const getSlotActions = (
  context: ChatbotContext,
  doctorId?: string,
) =>
  context.availableSlots
    .filter((slot) => !doctorId || slot.doctorId === doctorId)
    .slice(0, 2)
    .map((slot) => {
      const doctor = context.doctors.find((item) => item.id === slot.doctorId);
      const doctorName = doctor ? `${doctor.title || ""} ${doctor.fullName}`.trim() : "";

      return {
        type: "VIEW_AVAILABLE_SLOTS" as const,
        label: doctorId || !doctorName
          ? `${formatDateLabel(slot.date)} ${slot.startTime}-${slot.endTime}`
          : `${doctorName} - ${formatDateLabel(slot.date)} ${slot.startTime}-${slot.endTime}`,
        payload: {
          doctorId: slot.doctorId,
          date: slot.date,
          timeSlotId: slot.id,
        },
      };
    });

const getMatchingSlots = (
  context: ChatbotContext,
  doctorId?: string,
) => context.availableSlots.filter((slot) => !doctorId || slot.doctorId === doctorId);

const formatSlotLine = (
  context: ChatbotContext,
  slot: ChatbotContext["availableSlots"][number],
  includeDoctor: boolean,
) => {
  const doctor = context.doctors.find((item) => item.id === slot.doctorId);
  const doctorName = doctor ? `${doctor.title || ""} ${doctor.fullName}`.trim() : "";
  const prefix = includeDoctor && doctorName ? `${doctorName} - ` : "";

  return `${prefix}${formatDateLabel(slot.date)} ${slot.startTime}-${slot.endTime}`;
};

const buildSlotListText = (
  context: ChatbotContext,
  doctorId?: string,
  limit = 6,
) => {
  const slots = getMatchingSlots(context, doctorId);
  if (!slots.length) return "";

  const includeDoctor = !doctorId;
  const lines = slots.slice(0, limit).map((slot, index) => `${index + 1}. ${formatSlotLine(context, slot, includeDoctor)}`);
  const moreText = slots.length > limit ? `\nCòn ${slots.length - limit} khung giờ khác trong form đặt lịch.` : "";

  return `\n\nDanh sách lịch trống:\n${lines.join("\n")}${moreText}`;
};

const buildSlotResults = (
  context: ChatbotContext,
  doctorId?: string,
  limit = 6,
): ChatbotResultGroup[] => {
  const slots = getMatchingSlots(context, doctorId);
  if (!slots.length) return [];

  const items = slots.slice(0, limit).map((slot) => {
    const doctor = context.doctors.find((item) => item.id === slot.doctorId);

    return {
      type: "slot" as const,
      id: slot.id,
      doctorId: slot.doctorId,
      doctorName: doctor ? `${doctor.title || ""} ${doctor.fullName}`.trim() : undefined,
      departmentName: doctor?.departmentName,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
    };
  });

  return [
    {
      type: "slots",
      title: "Lịch trống phù hợp",
      description: slots.length > limit
        ? `Đang hiển thị ${limit}/${slots.length} khung giờ. Bạn có thể xem thêm ở phần đặt lịch.`
        : "Bạn có thể chọn nhanh một khung giờ bên dưới hoặc mở phần đặt lịch.",
      items,
      total: slots.length,
      limit,
    },
  ];
};

const buildOpenBookingAction = (
  draft: ChatBookingDraft,
  date?: string,
): SuggestedAction => ({
  type: "START_BOOKING",
  label: "Xem thêm ở phần đặt lịch",
  payload: {
    prefill: {
      departmentId: draft.departmentId,
      packageId: draft.packageId,
      doctorId: draft.doctorId,
      date: date || draft.date,
    },
  },
});

const hasExactDateSlot = (
  context: ChatbotContext,
  draft: ChatBookingDraft,
) =>
  Boolean(
    draft.date &&
      context.availableSlots.some((slot) =>
        slot.date === draft.date && (!draft.doctorId || slot.doctorId === draft.doctorId),
      ),
  );

const getNearestSlotDate = (
  context: ChatbotContext,
  doctorId?: string,
) =>
  context.availableSlots.find((slot) => !doctorId || slot.doctorId === doctorId)?.date;

const resolveBookingDraft = (
  context: ChatbotContext,
  draft: ChatBookingDraft,
) => {
  const selectedDoctor = draft.doctorId
    ? context.doctors.find((doctor) => doctor.id === draft.doctorId)
    : undefined;
  const selectedSlot = draft.timeSlotId
    ? context.availableSlots.find((slot) => slot.id === draft.timeSlotId)
    : undefined;

  return sanitizeBookingDraft({
    ...draft,
    departmentId: draft.departmentId || selectedDoctor?.departmentId,
    doctorId: selectedDoctor?.id || selectedSlot?.doctorId || draft.doctorId,
    date: selectedSlot?.date || draft.date,
    timeSlotId: selectedSlot?.id || draft.timeSlotId,
  });
};

class ChatbotWorkflowService {
  resolve(input: WorkflowInput): AIChatbotOutput | null {
    const draft = resolveBookingDraft(input.context, input.draft);
    const actionOutput = this.resolveSelectedAction(input, draft);

    if (actionOutput) return actionOutput;

    if (input.detectedIntent === "APPOINTMENT_LOOKUP_GUIDE") {
      return createOutput({
        reply: "Bạn có thể tra cứu lịch hẹn bằng mã đặt lịch và số điện thoại. Nếu quên mã lịch, hãy dùng tab quên mã để nhận OTP và xem lịch gần đây.",
        intent: "APPOINTMENT_LOOKUP_GUIDE",
        state: "BOOKING_GUIDE",
        nextStep: "SHOW_BOOKING_GUIDE",
        draft,
        suggestedActions: [
          { type: "LOOKUP_APPOINTMENT", label: "Tra cứu lịch hẹn", payload: {} },
          { type: "CONTACT_STAFF", label: "Liên hệ hỗ trợ", payload: {} },
        ],
      });
    }

    if (input.detectedIntent === "PAYMENT_GUIDE") {
      return createOutput({
        reply: "Bạn có thể thanh toán theo hướng dẫn trên hóa đơn hoặc liên hệ nhân viên nếu cần kiểm tra giao dịch. Nếu đã có mã hóa đơn, hãy mở trang tra cứu lịch hẹn để xem thông tin thanh toán.",
        intent: "PAYMENT_GUIDE",
        state: "BOOKING_GUIDE",
        nextStep: "SHOW_PAYMENT_GUIDE",
        draft,
        suggestedActions: [
          { type: "LOOKUP_APPOINTMENT", label: "Tra cứu lịch hẹn", payload: {} },
          { type: "CONTACT_STAFF", label: "Liên hệ hỗ trợ", payload: {} },
        ],
      });
    }

    if (
      input.detectedIntent === "SYMPTOM_TRIAGE" ||
      input.detectedIntent === "DEPARTMENT_LIST" ||
      input.detectedIntent === "BOOKING_START"
    ) {
      return this.resolveDepartmentStep(input, draft);
    }

    if (
      input.detectedIntent === "PACKAGE_LIST" ||
      input.detectedIntent === "PACKAGE_DETAIL"
    ) {
      return this.resolvePackageStep(input, draft);
    }

    if (input.detectedIntent === "UNKNOWN" && draft.departmentId && !draft.doctorId && !draft.timeSlotId) {
      return this.resolveDepartmentStep(input, draft);
    }

    if (
      input.detectedIntent === "DOCTOR_LIST" ||
      input.detectedIntent === "AVAILABLE_SLOT_LOOKUP" ||
      draft.doctorId ||
      draft.departmentId
    ) {
      return this.resolveDoctorAndSlotStep(input, draft);
    }

    return null;
  }

  private resolveSelectedAction(input: WorkflowInput, draft: ChatBookingDraft) {
    if (!input.action) return null;

    switch (input.action.type) {
      case "VIEW_DEPARTMENTS":
        return this.handleDepartmentList(input, draft);
      case "VIEW_PACKAGES":
        return this.handlePackageList(input, draft);
      case "VIEW_DOCTORS":
        return this.handleDoctorChange(input, draft);
      case "VIEW_DEPARTMENT":
      case "SELECT_DEPARTMENT":
        return this.handleDepartmentSelected(input, draft);
      case "VIEW_PACKAGE":
      case "SELECT_PACKAGE":
        return this.handlePackageSelected(input, draft);
      case "VIEW_DOCTOR":
      case "SELECT_DOCTOR":
        return this.handleDoctorSelected(input, draft);
      case "VIEW_AVAILABLE_SLOTS":
      case "SELECT_SLOT":
        return this.handleSlotSelected(draft);
      case "CHANGE_DATE":
        return createOutput({
          reply: "Bạn muốn đổi ngày khám. Hãy nhập ngày mong muốn, ví dụ: hôm nay, ngày mai hoặc 2026-06-10.",
          intent: "AVAILABLE_SLOT_LOOKUP",
          state: "CHOOSING_DATE",
          nextStep: "CHOOSE_DATE",
          draft,
          suggestedActions: [
            { type: "CHANGE_DOCTOR", label: "Đổi bác sĩ", payload: { departmentId: draft.departmentId } },
            { type: "CONTACT_STAFF", label: "Liên hệ hỗ trợ", payload: {} },
          ],
        });
      case "CHANGE_DOCTOR":
        return this.handleDoctorChange(input, draft);
      default:
        return null;
    }
  }

  private handleDepartmentSelected(input: WorkflowInput, draft: ChatBookingDraft) {
    const department = findDepartment(input.context, input.message, draft);
    const departmentId = draft.departmentId || department?.id;
    const packageActions = getPackageActions(input.context, departmentId);
    const doctorActions = getDoctorActions(input.context, departmentId);

    return createOutput({
      reply: department
        ? `Mình đã chọn ${department.name}. Bước tiếp theo, bạn có thể xem gói khám hoặc chọn bác sĩ thuộc chuyên khoa này.`
        : "Mình đã ghi nhận chuyên khoa bạn chọn. Bạn có thể xem gói khám hoặc chọn bác sĩ để tiếp tục đặt lịch.",
      intent: "DEPARTMENT_DETAIL",
      state: packageActions.length ? "SUGGESTING_PACKAGE" : "CHOOSING_DOCTOR",
      nextStep: packageActions.length ? "CHOOSE_PACKAGE" : "CHOOSE_DOCTOR",
      draft: sanitizeBookingDraft({
        ...draft,
        departmentId,
        departmentSlug: draft.departmentSlug || department?.slug || undefined,
        doctorId: undefined,
        timeSlotId: undefined,
      }),
      suggestedActions: [
        ...packageActions,
        ...doctorActions,
        { type: "VIEW_DOCTORS", label: "Xem bác sĩ", payload: { departmentId } },
      ],
    });
  }

  private handleDepartmentList(input: WorkflowInput, draft: ChatBookingDraft) {
    return createOutput({
      reply: `${buildDepartmentListText(input.context)}\n\nBạn có thể chọn nhanh một chuyên khoa bên dưới để xem gói khám, bác sĩ và lịch trống phù hợp.`,
      intent: "DEPARTMENT_LIST",
      state: "SUGGESTING_DEPARTMENT",
      nextStep: "CHOOSE_DEPARTMENT",
      draft: sanitizeBookingDraft({
        ...draft,
        departmentId: undefined,
        departmentSlug: undefined,
        packageId: undefined,
        packageSlug: undefined,
        doctorId: undefined,
        timeSlotId: undefined,
      }),
      suggestedActions: getDepartmentActions(input.context),
    });
  }

  private handlePackageList(input: WorkflowInput, draft: ChatBookingDraft) {
    const packageActions = getPackageActions(input.context, draft.departmentId);

    return createOutput({
      reply: packageActions.length
        ? "Mình tìm thấy một số gói khám đang hoạt động. Bạn chọn gói phù hợp để xem bác sĩ và lịch trống."
        : "Hiện chưa có gói khám phù hợp với chuyên khoa đã chọn. Bạn có thể chọn chuyên khoa khác hoặc liên hệ hỗ trợ.",
      intent: "PACKAGE_LIST",
      state: packageActions.length ? "SUGGESTING_PACKAGE" : "SUGGESTING_DEPARTMENT",
      nextStep: packageActions.length ? "CHOOSE_PACKAGE" : "CHOOSE_DEPARTMENT",
      draft,
      suggestedActions: packageActions.length
        ? packageActions
        : [
            { type: "VIEW_DEPARTMENTS", label: "Xem chuyên khoa", payload: {} },
            { type: "CONTACT_STAFF", label: "Liên hệ hỗ trợ", payload: {} },
          ],
    });
  }

  private handlePackageSelected(input: WorkflowInput, draft: ChatBookingDraft) {
    const packageItem = draft.packageId
      ? input.context.packages.find((item) => item.id === draft.packageId)
      : draft.packageSlug
        ? input.context.packages.find((item) => item.slug === draft.packageSlug)
        : undefined;
    const departmentId = draft.departmentId || packageItem?.departmentId || undefined;
    const doctorActions = getDoctorActions(input.context, departmentId);
    const slotActions = getSlotActions(input.context, draft.doctorId);

    return createOutput({
      reply: packageItem
        ? `Mình đã chọn gói ${packageItem.name}. Bạn chọn bác sĩ hoặc khung giờ trống để tiếp tục đặt lịch nhé.`
        : "Mình đã ghi nhận gói khám bạn chọn. Bạn chọn bác sĩ hoặc khung giờ trống để tiếp tục đặt lịch nhé.",
      intent: "PACKAGE_DETAIL",
      state: slotActions.length ? "CHOOSING_SLOT" : "CHOOSING_DOCTOR",
      nextStep: slotActions.length ? "CHOOSE_SLOT" : "CHOOSE_DOCTOR",
      draft: sanitizeBookingDraft({
        ...draft,
        departmentId,
      }),
      suggestedActions: [
        ...slotActions,
        ...doctorActions,
        { type: "CHANGE_DATE", label: "Chọn ngày khám", payload: { departmentId, doctorId: draft.doctorId } },
      ],
    });
  }

  private handleDoctorSelected(input: WorkflowInput, draft: ChatBookingDraft) {
    const selectedDoctor = draft.doctorId
      ? input.context.doctors.find((doctor) => doctor.id === draft.doctorId)
      : undefined;
    const slotActions = getSlotActions(input.context, draft.doctorId);
    const nextDraft = sanitizeBookingDraft({
      ...draft,
      departmentId: draft.departmentId || selectedDoctor?.departmentId,
    });

    if (slotActions.length) {
      const exactDateSlot = hasExactDateSlot(input.context, draft);
      const nearestDate = getNearestSlotDate(input.context, draft.doctorId);
      const listText = buildSlotListText(input.context, draft.doctorId);
      const results = buildSlotResults(input.context, draft.doctorId);

      return createOutput({
        reply: (draft.date && !exactDateSlot && nearestDate
          ? `Bác sĩ này chưa có lịch trống ngày ${formatDateLabel(draft.date)}. Mình tìm thấy lịch gần nhất vào ${formatDateLabel(nearestDate)}, bạn có thể chọn khung giờ phù hợp.`
          : selectedDoctor
            ? `Mình đã chọn ${`${selectedDoctor.title || ""} ${selectedDoctor.fullName}`.trim()}. Đây là các khung giờ còn trống phù hợp.`
            : "Mình đã ghi nhận bác sĩ bạn chọn. Đây là các khung giờ còn trống phù hợp.") +
          `${listText}\n\nBạn có thể bấm lựa chọn nhanh bên dưới hoặc xem thêm ở phần đặt lịch.`,
        intent: "AVAILABLE_SLOT_LOOKUP",
        state: "CHOOSING_SLOT",
        nextStep: "CHOOSE_SLOT",
        draft: nextDraft,
        results,
        suggestedActions: [...slotActions, buildOpenBookingAction(nextDraft, nearestDate || draft.date)],
      });
    }

    return createOutput({
      reply: selectedDoctor
        ? `Mình đã chọn ${`${selectedDoctor.title || ""} ${selectedDoctor.fullName}`.trim()}. Hiện chưa có lịch trống phù hợp, bạn có thể chọn ngày khác hoặc đổi bác sĩ.`
        : "Mình đã ghi nhận bác sĩ bạn chọn. Hiện chưa có lịch trống phù hợp, bạn có thể chọn ngày khác hoặc đổi bác sĩ.",
      intent: "AVAILABLE_SLOT_LOOKUP",
      state: "CHOOSING_DATE",
      nextStep: "CHOOSE_DATE",
      draft: nextDraft,
      suggestedActions: [
        { type: "CHANGE_DATE", label: "Đổi ngày khám", payload: { doctorId: draft.doctorId, departmentId: nextDraft.departmentId } },
        { type: "CHANGE_DOCTOR", label: "Đổi bác sĩ", payload: { departmentId: nextDraft.departmentId } },
        { type: "CONTACT_STAFF", label: "Liên hệ hỗ trợ", payload: {} },
      ],
    });
  }

  private handleSlotSelected(draft: ChatBookingDraft) {
    return createOutput({
      reply: "Mình đã chọn khung giờ này. Bạn có thể bấm đặt lịch ngay để nhập thông tin bệnh nhân và xác thực OTP.",
      intent: "BOOKING_START",
      state: "READY_TO_BOOK",
      nextStep: "READY_TO_BOOK",
      draft,
      suggestedActions: [],
    });
  }

  private handleDoctorChange(input: WorkflowInput, draft: ChatBookingDraft) {
    const doctorActions = getDoctorActions(input.context, draft.departmentId);

    return createOutput({
      reply: doctorActions.length
        ? "Bạn muốn đổi bác sĩ. Đây là một số bác sĩ phù hợp với chuyên khoa đã chọn."
        : "Bạn muốn đổi bác sĩ, nhưng hiện chưa tìm thấy bác sĩ phù hợp. Bạn có thể đổi chuyên khoa hoặc liên hệ nhân viên hỗ trợ.",
      intent: "DOCTOR_LIST",
      state: doctorActions.length ? "CHOOSING_DOCTOR" : "SUGGESTING_DEPARTMENT",
      nextStep: doctorActions.length ? "CHOOSE_DOCTOR" : "CHOOSE_DEPARTMENT",
      draft,
      suggestedActions: doctorActions.length
        ? doctorActions
        : [
            { type: "VIEW_DEPARTMENTS", label: "Xem chuyên khoa", payload: {} },
            { type: "CONTACT_STAFF", label: "Liên hệ hỗ trợ", payload: {} },
          ],
    });
  }

  private resolveDepartmentStep(input: WorkflowInput, draft: ChatBookingDraft) {
    const department = findDepartment(input.context, input.message, draft);
    const nextDraft = sanitizeBookingDraft({
      ...draft,
      departmentId: draft.departmentId || department?.id,
      departmentSlug: draft.departmentSlug || department?.slug || undefined,
    });
    const packageActions = getPackageActions(input.context, nextDraft.departmentId);
    const doctorActions = getDoctorActions(input.context, nextDraft.departmentId);

    if (!department && input.detectedIntent === "SYMPTOM_TRIAGE") {
      return createOutput({
        reply: "Mình đã ghi nhận triệu chứng của bạn. Bạn mô tả thêm vị trí đau, mức độ và thời gian xuất hiện để mình gợi ý chuyên khoa phù hợp hơn nhé.",
        intent: "SYMPTOM_TRIAGE",
        state: "ASKING_SYMPTOMS",
        nextStep: "ASK_SYMPTOM_DETAILS",
        draft: nextDraft,
        suggestedActions: [
          { type: "VIEW_DEPARTMENTS", label: "Xem chuyên khoa", payload: {} },
          { type: "CONTACT_STAFF", label: "Liên hệ hỗ trợ", payload: {} },
        ],
        confidence: 0.76,
      });
    }

    return createOutput({
      reply: department
        ? `Dựa trên thông tin hiện có, bạn có thể bắt đầu với ${department.name}. Bạn có thể xem khoa, chọn gói khám hoặc chọn bác sĩ để tiếp tục đặt lịch.`
        : "Bạn có thể chọn một chuyên khoa trước, sau đó hệ thống sẽ gợi ý gói khám, bác sĩ và lịch trống phù hợp.",
      intent: input.detectedIntent === "UNKNOWN" ? "DEPARTMENT_LIST" : input.detectedIntent,
      state: department ? "SUGGESTING_DEPARTMENT" : "BOOKING_GUIDE",
      nextStep: department ? "CHOOSE_DEPARTMENT" : "CHOOSE_DEPARTMENT",
      draft: nextDraft,
      suggestedActions: [
        ...getDepartmentActions(input.context, department),
        ...packageActions,
        ...doctorActions,
        { type: "VIEW_DEPARTMENTS", label: "Xem tất cả chuyên khoa", payload: {} },
      ],
    });
  }

  private resolvePackageStep(input: WorkflowInput, draft: ChatBookingDraft) {
    const department = findDepartment(input.context, input.message, draft);
    const departmentId = draft.departmentId || department?.id;
    const packageActions = getPackageActions(input.context, departmentId);

    return createOutput({
      reply: packageActions.length
        ? "Mình tìm thấy một số gói khám phù hợp trong hệ thống. Bạn có thể mở chi tiết gói để xem hạng mục và chọn đặt lịch."
        : "Hiện chưa có gói khám phù hợp với thông tin đã chọn. Bạn có thể chọn chuyên khoa hoặc liên hệ nhân viên để được tư vấn.",
      intent: "PACKAGE_LIST",
      state: "SUGGESTING_PACKAGE",
      nextStep: packageActions.length ? "CHOOSE_PACKAGE" : "CHOOSE_DEPARTMENT",
      draft: sanitizeBookingDraft({
        ...draft,
        departmentId,
        departmentSlug: draft.departmentSlug || department?.slug || undefined,
      }),
      suggestedActions: packageActions.length
        ? packageActions
        : [
            { type: "VIEW_DEPARTMENTS", label: "Xem chuyên khoa", payload: {} },
            { type: "CONTACT_STAFF", label: "Liên hệ hỗ trợ", payload: {} },
          ],
    });
  }

  private resolveDoctorAndSlotStep(input: WorkflowInput, draft: ChatBookingDraft) {
    const selectedDoctor = draft.doctorId
      ? input.context.doctors.find((doctor) => doctor.id === draft.doctorId)
      : undefined;
    const departmentId = draft.departmentId || selectedDoctor?.departmentId;
    const slotActions = getSlotActions(input.context, draft.doctorId);

    if (draft.doctorId && draft.timeSlotId) {
      return createOutput({
        reply: "Mình đã có đủ bác sĩ và khung giờ. Bạn có thể bấm đặt lịch ngay để sang form thông tin bệnh nhân và xác thực OTP.",
        intent: "BOOKING_START",
        state: "READY_TO_BOOK",
        nextStep: "READY_TO_BOOK",
        draft,
        suggestedActions: [],
      });
    }

    if (slotActions.length) {
      const exactDateSlot = hasExactDateSlot(input.context, draft);
      const nearestDate = getNearestSlotDate(input.context, draft.doctorId);
      const listText = buildSlotListText(input.context, draft.doctorId);
      const results = buildSlotResults(input.context, draft.doctorId);

      return createOutput({
        reply: (draft.date && !exactDateSlot && nearestDate
          ? `Ngày ${formatDateLabel(draft.date)} chưa có lịch trống phù hợp. Mình tìm thấy lịch gần nhất vào ${formatDateLabel(nearestDate)}, bạn chọn khung giờ phù hợp để tiếp tục đặt lịch nhé.`
          : draft.doctorId
            ? "Mình tìm thấy một số khung giờ còn trống của bác sĩ này. Bạn chọn khung giờ phù hợp để tiếp tục đặt lịch nhé."
            : "Mình tìm thấy một số lịch trống gần nhất. Bạn chọn khung giờ phù hợp để tiếp tục đặt lịch nhé.") +
          `${listText}\n\nBạn có thể bấm lựa chọn nhanh bên dưới hoặc xem thêm ở phần đặt lịch.`,
        intent: "AVAILABLE_SLOT_LOOKUP",
        state: "CHOOSING_SLOT",
        nextStep: "CHOOSE_SLOT",
        draft,
        results,
        suggestedActions: [...slotActions, buildOpenBookingAction(draft, nearestDate || draft.date)],
      });
    }

    if (draft.doctorId) {
      return createOutput({
        reply: draft.date
          ? "Bác sĩ này chưa có lịch trống vào ngày đã chọn. Bạn có thể đổi ngày khám hoặc liên hệ nhân viên để được hỗ trợ sắp lịch."
          : "Bác sĩ này hiện chưa có lịch trống gần nhất. Bạn có thể chọn ngày khám khác hoặc liên hệ nhân viên để được hỗ trợ sắp lịch.",
        intent: "AVAILABLE_SLOT_LOOKUP",
        state: "CHOOSING_DATE",
        nextStep: "CHOOSE_DATE",
        draft,
        suggestedActions: [
          {
            type: "CHANGE_DATE",
            label: "Đổi ngày khám",
            payload: {
              doctorId: draft.doctorId,
              departmentId,
            },
          },
          {
            type: "CHANGE_DOCTOR",
            label: "Đổi bác sĩ",
            payload: {
              departmentId,
            },
          },
          { type: "CONTACT_STAFF", label: "Liên hệ hỗ trợ", payload: {} },
        ],
        confidence: 0.78,
      });
    }

    const doctorActions = getDoctorActions(input.context, departmentId);

    if (doctorActions.length) {
      return createOutput({
        reply: draft.date
          ? "Hiện chưa thấy lịch trống vào ngày đã chọn. Bạn có thể chọn một bác sĩ để kiểm tra kỹ hơn hoặc đổi ngày khám."
          : "Bạn có thể chọn một bác sĩ phù hợp trước, sau đó hệ thống sẽ hiển thị lịch trống để đặt khám.",
        intent: "DOCTOR_LIST",
        state: "CHOOSING_DOCTOR",
        nextStep: "CHOOSE_DOCTOR",
        draft,
        suggestedActions: doctorActions,
      });
    }

    return createOutput({
      reply: "Hiện chưa tìm thấy bác sĩ hoặc lịch trống phù hợp với thông tin đã chọn. Bạn có thể đổi chuyên khoa, đổi ngày hoặc liên hệ nhân viên hỗ trợ.",
      intent: "AVAILABLE_SLOT_LOOKUP",
      state: departmentId ? "CHOOSING_DATE" : "SUGGESTING_DEPARTMENT",
      nextStep: departmentId ? "CHOOSE_DATE" : "CHOOSE_DEPARTMENT",
      draft,
      suggestedActions: [
        { type: "VIEW_DEPARTMENTS", label: "Xem chuyên khoa", payload: {} },
        { type: "CONTACT_STAFF", label: "Liên hệ hỗ trợ", payload: {} },
      ],
      confidence: 0.74,
    });
  }
}

export default new ChatbotWorkflowService();
