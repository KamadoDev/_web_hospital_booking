import { prisma } from "../../config/prisma.js";
import type { Prisma } from "../../../generated/prisma/client.js";
import {
  isSlotStartInPastVietnamTime,
  parseDateOnly,
} from "../../utils/time.js";
import type { ChatBookingDraft, ChatIntent } from "./chatbot.types.js";

export type ChatbotContext = {
  departments: {
    id: string;
    name: string;
    slug: string | null;
    description: string | null;
  }[];
  packages: {
    id: string;
    name: string;
    slug: string | null;
    departmentId: string | null;
    departmentName: string | null;
    summary: string | null;
    finalPrice: number;
  }[];
  doctors: {
    id: string;
    fullName: string;
    title: string | null;
    specialization: string | null;
    departmentId: string;
    departmentName: string;
    consultationFee: number;
  }[];
  availableSlots: {
    id: string;
    doctorId: string;
    date: string;
    startTime: string;
    endTime: string;
  }[];
  faqs: {
    id: string;
    question: string;
    answer: string;
    keywords: string[];
  }[];
};

const toDateOnly = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
};

class ChatbotContextService {
  async load(
    intent: ChatIntent,
    draft: ChatBookingDraft,
  ): Promise<ChatbotContext> {
    const shouldLoadPackages =
      [
        "SYMPTOM_TRIAGE",
        "DEPARTMENT_LIST",
        "DEPARTMENT_DETAIL",
        "PACKAGE_LIST",
        "PACKAGE_DETAIL",
        "BOOKING_START",
        "BOOKING_FORM_HELP",
      ].includes(intent) || Boolean(draft.departmentId || draft.packageId);
    const shouldLoadDoctors =
      [
        "DOCTOR_LIST",
        "AVAILABLE_SLOT_LOOKUP",
        "BOOKING_START",
        "BOOKING_FORM_HELP",
      ].includes(intent) || Boolean(draft.departmentId || draft.doctorId);
    const shouldLoadFaqs = [
      "UNKNOWN",
      "GENERAL_HOSPITAL_INFO",
      "PAYMENT_GUIDE",
      "APPOINTMENT_LOOKUP_GUIDE",
    ].includes(intent);

    const [departments, packages, doctors, availableSlots, faqs] =
      await Promise.all([
        this.getDepartments(),
        shouldLoadPackages ? this.getPackages(draft) : Promise.resolve([]),
        shouldLoadDoctors ? this.getDoctors(draft) : Promise.resolve([]),
        intent === "AVAILABLE_SLOT_LOOKUP" ||
        intent === "DOCTOR_LIST" ||
        draft.doctorId ||
        draft.departmentId
          ? this.getAvailableSlots(draft)
          : Promise.resolve([]),
        shouldLoadFaqs ? this.getFaqs() : Promise.resolve([]),
      ]);

    return {
      departments,
      packages,
      doctors,
      availableSlots,
      faqs,
    };
  }

  format(context: ChatbotContext) {
    const sections: string[] = [];

    if (context.departments.length) {
      sections.push(
        "DEPARTMENTS:",
        ...context.departments.map(
          (department) =>
            `- ${department.id} | ${department.name} | slug=${department.slug || ""} | ${department.description || ""}`,
        ),
      );
    }

    if (context.packages.length) {
      sections.push(
        "PACKAGES:",
        ...context.packages.map(
          (item) =>
            `- ${item.id} | ${item.name} | departmentId=${item.departmentId || ""} | department=${item.departmentName || ""} | price=${item.finalPrice} | ${item.summary || ""}`,
        ),
      );
    }

    if (context.doctors.length) {
      sections.push(
        "DOCTORS:",
        ...context.doctors.map(
          (doctor) =>
            `- ${doctor.id} | ${doctor.title || ""} ${doctor.fullName} | specialization=${doctor.specialization || ""} | departmentId=${doctor.departmentId} | department=${doctor.departmentName} | fee=${doctor.consultationFee}`,
        ),
      );
    }

    if (context.availableSlots.length) {
      sections.push(
        "AVAILABLE_SLOTS:",
        ...context.availableSlots.map(
          (slot) =>
            `- ${slot.id} | doctorId=${slot.doctorId} | date=${slot.date} | ${slot.startTime}-${slot.endTime}`,
        ),
      );
    }

    if (context.faqs.length) {
      sections.push(
        "FAQ_KNOWLEDGE:",
        ...context.faqs.map(
          (faq) =>
            `- ${faq.id} | Q=${faq.question} | A=${faq.answer} | keywords=${faq.keywords.join(",")}`,
        ),
      );
    }

    return sections.join("\n");
  }

  private async getDepartments() {
    return prisma.department.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
      },
      orderBy: {
        name: "asc",
      },
      take: 10,
    });
  }

  private async getPackages(draft: ChatBookingDraft) {
    const packages = await prisma.package.findMany({
      where: {
        isActive: true,
        departmentId: draft.departmentId,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        departmentId: true,
        basePrice: true,
        serviceFee: true,
        summary: true,
        items: {
          select: {
            price: true,
            included: true,
          },
        },
        department: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [{ isPopular: "desc" }, { basePrice: "asc" }],
      take: 10,
    });

    return packages.map((item) => ({
      id: item.id,
      name: item.name,
      slug: item.slug,
      departmentId: item.departmentId,
      departmentName: item.department?.name || null,
      summary: item.summary,
      finalPrice:
        (item.items
          .filter((packageItem) => packageItem.included)
          .reduce((total, packageItem) => total + packageItem.price, 0) ||
          item.basePrice) + item.serviceFee,
    }));
  }

  private async getDoctors(draft: ChatBookingDraft) {
    const doctors = await prisma.doctorProfile.findMany({
      where: {
        isAvailable: true,
        departmentId: draft.departmentId,
        user: {
          isActive: true,
        },
        department: {
          isActive: true,
        },
      },
      select: {
        id: true,
        title: true,
        specialization: true,
        departmentId: true,
        consultationFee: true,
        user: {
          select: {
            fullName: true,
          },
        },
        department: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      take: 10,
    });

    return doctors.map((doctor) => ({
      id: doctor.id,
      fullName: doctor.user.fullName,
      title: doctor.title,
      specialization: doctor.specialization,
      departmentId: doctor.departmentId,
      departmentName: doctor.department.name,
      consultationFee: doctor.consultationFee,
    }));
  }

  private async getAvailableSlots(draft: ChatBookingDraft) {
    const today = toDateOnly(new Date());
    const requestedDate =
      draft.date && draft.date >= today ? draft.date : undefined;
    const baseWhere: Prisma.DoctorTimeSlotWhereInput = {
      ...(draft.doctorId ? { doctorId: draft.doctorId } : {}),
      status: "AVAILABLE",
      isActive: true,
      doctor: {
        ...(draft.departmentId ? { departmentId: draft.departmentId } : {}),
        isAvailable: true,
        user: {
          isActive: true,
        },
      },
    };

    const select = {
      id: true,
      doctorId: true,
      date: true,
      startTime: true,
      endTime: true,
    } as const;

    const findSlots = (date: Date | { gte: Date }, take = 20) =>
      prisma.doctorTimeSlot.findMany({
        where: {
          ...baseWhere,
          date,
        },
        select,
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
        take,
      });

    const slots = requestedDate
      ? await findSlots(parseDateOnly(requestedDate))
      : await findSlots({ gte: parseDateOnly(today) });

    const usableSlots = slots.filter(
      (slot) => !isSlotStartInPastVietnamTime(slot.date, slot.startTime),
    );
    const fallbackSlots =
      requestedDate && !usableSlots.length
        ? (await findSlots({ gte: parseDateOnly(requestedDate) })).filter(
            (slot) => !isSlotStartInPastVietnamTime(slot.date, slot.startTime),
          )
        : usableSlots;

    return fallbackSlots.map((slot) => ({
      id: slot.id,
      doctorId: slot.doctorId,
      date: toDateOnly(slot.date),
      startTime: slot.startTime,
      endTime: slot.endTime,
    }));
  }

  private async getFaqs() {
    return prisma.chatbotFAQ.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        question: true,
        answer: true,
        keywords: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 10,
    });
  }
}

export default new ChatbotContextService();
