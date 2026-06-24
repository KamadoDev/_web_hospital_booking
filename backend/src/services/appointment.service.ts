import { Prisma } from "../../generated/prisma/client.js";
import type {
  AppointmentStatus,
  Gender,
  OtpChannel,
  OtpDeliveryStatus,
  Role,
} from "../../generated/prisma/enums.js";
import { prisma } from "../config/prisma.js";
import AuthOtpService from "./authOtp.service.js";
import { AppError } from "../utils/appError.js";
import { generateBookingCode } from "../utils/bookingCode.js";
import {
  getVietnamNowParts,
  isSlotStartInPastVietnamTime,
  parseDateOnly,
} from "../utils/time.js";
import MedicalRecordService from "./medicalRecord.service.js";

type Actor = {
  userId: string;
  role: Role;
};

type CreateAppointmentInput = {
  packageId?: string | null;
  departmentId: string;
  doctorId: string;
  timeSlotId: string;
  patientName: string;
  patientPhone: string;
  patientEmail?: string | null;
  otpChannel?: OtpChannel;
  reason?: string | null;
  gender?: Gender | null;
  dateOfBirth?: string | null;
  cccd?: string | null;
  address?: string | null;
  hasBHYT?: boolean;
  healthInsuranceCode?: string | null;
  registeredHospital?: string | null;
  allergies?: string | null;
  medicalHistory?: string | null;
  familyHistory?: string | null;
};

type UpdateAppointmentPatientInfoInput = {
  patientName?: string;
  patientEmail?: string | null;
  gender?: Gender | null;
  dateOfBirth?: string | null;
  cccd?: string | null;
  address?: string | null;
  hasBHYT?: boolean;
  healthInsuranceCode?: string | null;
  registeredHospital?: string | null;
  allergies?: string | null;
  medicalHistory?: string | null;
  familyHistory?: string | null;
};

type PublicCancelAppointmentInput = {
  bookingCode?: string;
  phone?: string;
  reason?: string;
  otp?: string;
  ipAddress: string;
};

const DEFAULT_PENDING_OTP_EXPIRE_MINUTES = 15;

const getOtpLogNote = (label: string, status: OtpDeliveryStatus) => {
  if (status === "FAILED")
    return `${label} đã được tạo nhưng chưa đưa được vào hàng đợi gửi mã`;
  if (status === "PENDING")
    return `${label} đã được tạo và đang chờ hệ thống gửi mã`;
  return `${label} đã được gửi`;
};

const resolveAppointmentOtpTarget = (appointment: {
  patientPhone: string;
  patientEmail?: string | null;
  otpChannel?: OtpChannel | null;
}) => {
  const channel: OtpChannel =
    appointment.otpChannel === "EMAIL" && appointment.patientEmail
      ? "EMAIL"
      : "SMS";

  return {
    channel,
    target:
      channel === "EMAIL"
        ? appointment.patientEmail || ""
        : appointment.patientPhone,
  };
};

const resolveLookupOtpTarget = async (phone: string, bookingCode?: string) => {
  const appointment = await prisma.appointment.findFirst({
    where: {
      patientPhone: phone,
      ...(bookingCode ? { bookingCode } : {}),
    },
    select: {
      patientPhone: true,
      patientEmail: true,
      otpChannel: true,
      appointmentDate: true,
      startTime: true,
      createdAt: true,
    },
    orderBy: [
      { appointmentDate: "desc" },
      { startTime: "desc" },
      { createdAt: "desc" },
    ],
  });

  if (!appointment) {
    throw new AppError("Không tìm thấy lịch hẹn với số điện thoại này", 404);
  }

  return resolveAppointmentOtpTarget(appointment);
};
const PUBLIC_CANCEL_ALLOWED_STATUSES: AppointmentStatus[] = [
  "PENDING_CONFIRM",
  "CONFIRMED",
];

const appointmentSelect = {
  id: true,
  bookingCode: true,
  appointmentDate: true,
  startTime: true,
  endTime: true,
  status: true,
  reason: true,
  patientName: true,
  patientPhone: true,
  patientEmail: true,
  otpChannel: true,
  patientGender: true,
  patientDateOfBirth: true,
  patientAddress: true,
  patientCccd: true,
  hasBHYT: true,
  healthInsuranceCode: true,
  registeredHospital: true,
  allergies: true,
  medicalHistory: true,
  familyHistory: true,
  estimatedPrice: true,
  serviceFee: true,
  bhytDiscount: true,
  finalAmount: true,
  confirmedAt: true,
  cancelledAt: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
  patient: {
    select: {
      id: true,
      fullName: true,
      phone: true,
      email: true,
      isPhoneVerified: true,
    },
  },
  doctor: {
    select: {
      id: true,
      title: true,
      specialization: true,
      consultationFee: true,
      user: {
        select: {
          fullName: true,
          avatar: true,
        },
      },
    },
  },
  department: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  package: {
    select: {
      id: true,
      name: true,
      slug: true,
      basePrice: true,
      serviceFee: true,
    },
  },
  timeSlot: {
    select: {
      id: true,
      date: true,
      startTime: true,
      endTime: true,
      status: true,
    },
  },
  invoice: {
    select: {
      id: true,
      invoiceCode: true,
      barcode: true,
      totalAmount: true,
      bhytDiscount: true,
      finalAmount: true,
      insuranceEligibleAmount: true,
      insuranceCoverageRate: true,
      insuranceDiscountAmount: true,
      insuranceRouteType: true,
      insuranceNote: true,
      status: true,
      paymentMethod: true,
      paidAt: true,
      createdAt: true,
      updatedAt: true,
      paymentTransactions: {
        orderBy: {
          createdAt: "desc",
        },
        take: 3,
        select: {
          id: true,
          provider: true,
          status: true,
          amount: true,
          transactionCode: true,
          paymentUrl: true,
          paidAt: true,
          expiredAt: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  },
} satisfies Prisma.AppointmentSelect;

const publicAppointmentSummarySelect = {
  id: true,
  bookingCode: true,
  appointmentDate: true,
  startTime: true,
  endTime: true,
  status: true,
  reason: true,
  patientName: true,
  patientPhone: true,
  estimatedPrice: true,
  serviceFee: true,
  bhytDiscount: true,
  finalAmount: true,
  confirmedAt: true,
  cancelledAt: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
  doctor: {
    select: {
      id: true,
      title: true,
      specialization: true,
      user: {
        select: {
          fullName: true,
          avatar: true,
        },
      },
    },
  },
  department: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  package: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  invoice: {
    select: {
      id: true,
      invoiceCode: true,
      barcode: true,
      totalAmount: true,
      bhytDiscount: true,
      finalAmount: true,
      insuranceEligibleAmount: true,
      insuranceCoverageRate: true,
      insuranceDiscountAmount: true,
      insuranceRouteType: true,
      insuranceNote: true,
      status: true,
      paymentMethod: true,
      paidAt: true,
      createdAt: true,
      updatedAt: true,
      paymentTransactions: {
        orderBy: {
          createdAt: "desc",
        },
        take: 3,
        select: {
          id: true,
          provider: true,
          status: true,
          amount: true,
          transactionCode: true,
          paymentUrl: true,
          paidAt: true,
          expiredAt: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  },
} satisfies Prisma.AppointmentSelect;

const publicAppointmentResultSelect = {
  id: true,
  bookingCode: true,
  appointmentDate: true,
  startTime: true,
  endTime: true,
  status: true,
  patientName: true,
  patientPhone: true,
  completedAt: true,
  doctor: {
    select: {
      id: true,
      title: true,
      specialization: true,
      user: {
        select: {
          fullName: true,
          avatar: true,
        },
      },
    },
  },
  department: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
} satisfies Prisma.AppointmentSelect;

const publicMedicalRecordResultSelect = {
  id: true,
  recordCode: true,
  symptoms: true,
  diagnosis: true,
  treatment: true,
  prescription: true,
  doctorNotes: true,
  status: true,
  resultPdfUrl: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  labResults: {
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      medicalRecordId: true,
      testName: true,
      resultValue: true,
      unit: true,
      referenceRange: true,
      conclusion: true,
      fileUrl: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} satisfies Prisma.MedicalRecordSelect;

const publicPrescriptionResultSelect = {
  id: true,
  prescriptionCode: true,
  status: true,
  note: true,
  issuedAt: true,
  cancelledAt: true,
  createdAt: true,
  updatedAt: true,
  items: {
    orderBy: [
      {
        sortOrder: "asc",
      },
      {
        createdAt: "asc",
      },
    ],
    select: {
      id: true,
      prescriptionId: true,
      medicineName: true,
      dosage: true,
      frequency: true,
      duration: true,
      quantity: true,
      unit: true,
      instruction: true,
      sortOrder: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} satisfies Prisma.PrescriptionSelect;

const normalizeOptionalString = (value?: string | null) =>
  value === undefined ? undefined : value || null;

const parseOptionalDate = (value?: string | null) =>
  value ? parseDateOnly(value) : null;

class AppointmentService {
  async create(input: CreateAppointmentInput, ipAddress: string) {
    const doctor = await prisma.doctorProfile.findUnique({
      where: { id: input.doctorId },
      select: {
        id: true,
        departmentId: true,
        consultationFee: true,
        isAvailable: true,
        user: { select: { isActive: true } },
        department: { select: { isActive: true } },
      },
    });

    if (!doctor || !doctor.isAvailable || !doctor.user.isActive) {
      throw new AppError("Bác sĩ không sẵn sàng nhận lịch", 400);
    }

    if (
      doctor.departmentId !== input.departmentId ||
      !doctor.department.isActive
    ) {
      throw new AppError("Bác sĩ không thuộc chuyên khoa đã chọn", 400);
    }

    const department = await prisma.department.findUnique({
      where: { id: input.departmentId },
      select: { id: true, isActive: true },
    });

    if (!department || !department.isActive) {
      throw new AppError("Chuyên khoa không hoạt động", 400);
    }

    const packageItem = input.packageId
      ? await prisma.package.findUnique({
          where: { id: input.packageId },
          select: {
            id: true,
            basePrice: true,
            serviceFee: true,
            isActive: true,
            departmentId: true,
            items: {
              select: {
                price: true,
                included: true,
              },
            },
          },
        })
      : null;

    if (input.packageId && !packageItem) {
      throw new AppError("Không tìm thấy gói khám", 404);
    }

    if (packageItem && !packageItem.isActive) {
      throw new AppError("Gói khám không hoạt động", 400);
    }

    if (
      packageItem?.departmentId &&
      packageItem.departmentId !== input.departmentId
    ) {
      throw new AppError("Gói khám không thuộc chuyên khoa đã chọn", 400);
    }

    const timeSlot = await prisma.doctorTimeSlot.findUnique({
      where: { id: input.timeSlotId },
      select: {
        id: true,
        doctorId: true,
        date: true,
        startTime: true,
        endTime: true,
        status: true,
        isActive: true,
        appointment: { select: { id: true } },
      },
    });

    if (
      !timeSlot ||
      timeSlot.doctorId !== input.doctorId ||
      timeSlot.status !== "AVAILABLE" ||
      !timeSlot.isActive ||
      timeSlot.appointment
    ) {
      throw new AppError("Khung giờ không khả dụng", 409);
    }

    const packageIncludedItemsTotal =
      packageItem?.items
        .filter((item) => item.included)
        .reduce((total, item) => total + item.price, 0) || 0;
    const estimatedPrice = packageItem
      ? packageIncludedItemsTotal || packageItem.basePrice
      : doctor.consultationFee;
    const serviceFee = packageItem?.serviceFee ?? 0;
    const bhytDiscount = 0;
    const finalAmount = estimatedPrice + serviceFee - bhytDiscount;
    const patientDateOfBirth = parseOptionalDate(input.dateOfBirth);
    const normalizedPatientEmail = normalizeOptionalString(input.patientEmail);
    const otpChannel = input.otpChannel || "SMS";

    if (isSlotStartInPastVietnamTime(timeSlot.date, timeSlot.startTime)) {
      throw new AppError("Khung giờ khám đã qua", 400);
    }

    if (
      patientDateOfBirth &&
      patientDateOfBirth >= parseDateOnly(getVietnamNowParts().date)
    ) {
      throw new AppError("Ngày sinh phải nhỏ hơn ngày hiện tại", 400);
    }

    if (otpChannel === "EMAIL" && !normalizedPatientEmail) {
      throw new AppError(
        "Email là bắt buộc khi chọn xác thực OTP qua email",
        400,
      );
    }
    const existingUser = await prisma.user.findUnique({
      where: { phone: input.patientPhone },
      select: { role: true },
    });

    if (existingUser && existingUser.role !== "PATIENT") {
      throw new AppError("Số điện thoại đã thuộc tài khoản nội bộ", 409);
    }

    const emailOwner = normalizedPatientEmail
      ? await prisma.user.findUnique({
          where: { email: normalizedPatientEmail },
          select: { phone: true },
        })
      : null;

    if (emailOwner && emailOwner.phone !== input.patientPhone) {
      throw new AppError("Email đã được sử dụng cho tài khoản khác", 409);
    }

    let appointmentId = "";
    let bookingCode = "";

    try {
      const appointment = await prisma.$transaction(async (tx) => {
        const slotUpdate = await tx.doctorTimeSlot.updateMany({
          where: {
            id: input.timeSlotId,
            status: "AVAILABLE",
            isActive: true,
          },
          data: {
            status: "BOOKED",
          },
        });

        if (slotUpdate.count !== 1) {
          throw new AppError("Khung giờ đã được đặt", 409);
        }

        const patient = await tx.user.upsert({
          where: { phone: input.patientPhone },
          update: {
            fullName: input.patientName,
            email: normalizedPatientEmail,
          },
          create: {
            fullName: input.patientName,
            phone: input.patientPhone,
            email: normalizedPatientEmail,
            role: "PATIENT",
            isPhoneVerified: false,
          },
          select: {
            id: true,
            role: true,
          },
        });

        if (patient.role !== "PATIENT") {
          throw new AppError("Số điện thoại đã thuộc tài khoản nội bộ", 409);
        }

        const createdAppointment = await tx.appointment.create({
          data: {
            bookingCode: await this.generateUniqueBookingCode(tx),
            appointmentDate: timeSlot.date,
            startTime: timeSlot.startTime,
            endTime: timeSlot.endTime,
            status: "PENDING_OTP",
            reason: normalizeOptionalString(input.reason),
            patientName: input.patientName,
            patientPhone: input.patientPhone,
            patientEmail: normalizedPatientEmail,
            otpChannel,
            patientGender: input.gender,
            patientDateOfBirth,
            patientAddress: normalizeOptionalString(input.address),
            patientCccd: normalizeOptionalString(input.cccd),
            hasBHYT: input.hasBHYT ?? false,
            healthInsuranceCode: normalizeOptionalString(
              input.healthInsuranceCode,
            ),
            registeredHospital: normalizeOptionalString(
              input.registeredHospital,
            ),
            allergies: normalizeOptionalString(input.allergies),
            medicalHistory: normalizeOptionalString(input.medicalHistory),
            familyHistory: normalizeOptionalString(input.familyHistory),
            estimatedPrice,
            serviceFee,
            bhytDiscount,
            finalAmount,
            patientId: patient.id,
            doctorId: input.doctorId,
            departmentId: input.departmentId,
            packageId: input.packageId || null,
            timeSlotId: input.timeSlotId,
            logs: {
              create: {
                action: "APPOINTMENT_CREATED",
                note: "Bệnh nhân tạo lịch hẹn và chờ xác thực OTP",
              },
            },
          },
          select: {
            id: true,
            bookingCode: true,
          },
        });

        return createdAppointment;
      });

      appointmentId = appointment.id;
      bookingCode = appointment.bookingCode;

      const otp = await AuthOtpService.sendOtp(
        otpChannel === "EMAIL"
          ? normalizedPatientEmail || ""
          : input.patientPhone,
        "BOOK_APPOINTMENT",
        ipAddress,
        { channel: otpChannel },
      );

      await prisma.appointmentLog.create({
        data: {
          appointmentId,
          action: "OTP_SENT",
          note: getOtpLogNote("OTP xác thực đặt lịch", otp.deliveryStatus),
        },
      });

      return {
        appointmentId,
        bookingCode,
        patientPhone: input.patientPhone,
        otpDeliveryStatus: otp.deliveryStatus,
        debugOtp: otp.debugOtp,
        expiresIn: otp.expiresIn,
      };
    } catch (error) {
      if (appointmentId) {
        await this.releasePendingAppointment(appointmentId);
      }

      throw error;
    }
  }

  async resendOtp(id: string, ipAddress: string) {
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      select: {
        id: true,
        patientPhone: true,
        patientEmail: true,
        otpChannel: true,
        status: true,
      },
    });

    if (!appointment) {
      throw new AppError("Không tìm thấy lịch hẹn", 404);
    }

    if (appointment.status !== "PENDING_OTP") {
      throw new AppError("Lịch hẹn không ở trạng thái chờ OTP", 400);
    }

    const otpTarget = resolveAppointmentOtpTarget(appointment);
    const otp = await AuthOtpService.sendOtp(
      otpTarget.target,
      "BOOK_APPOINTMENT",
      ipAddress,
      {
        channel: otpTarget.channel,
      },
    );

    await prisma.appointmentLog.create({
      data: {
        appointmentId: appointment.id,
        action: "OTP_SENT",
        note: getOtpLogNote(
          "OTP xác thực đặt lịch gửi lại",
          otp.deliveryStatus,
        ),
      },
    });

    return {
      otpDeliveryStatus: otp.deliveryStatus,
      debugOtp: otp.debugOtp,
      expiresIn: otp.expiresIn,
    };
  }

  async verifyOtp(id: string, otp: string, ipAddress?: string) {
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      select: {
        id: true,
        patientId: true,
        patientName: true,
        patientPhone: true,
        patientEmail: true,
        otpChannel: true,
        patientGender: true,
        patientDateOfBirth: true,
        patientAddress: true,
        patientCccd: true,
        hasBHYT: true,
        healthInsuranceCode: true,
        registeredHospital: true,
        allergies: true,
        medicalHistory: true,
        familyHistory: true,
        status: true,
      },
    });

    if (!appointment) {
      throw new AppError("Không tìm thấy lịch hẹn", 404);
    }

    if (appointment.status !== "PENDING_OTP") {
      throw new AppError("Lịch hẹn không ở trạng thái chờ OTP", 400);
    }

    await AuthOtpService.verifyOtp(
      appointment.otpChannel === "EMAIL"
        ? appointment.patientEmail || ""
        : appointment.patientPhone,
      otp,
      "BOOK_APPOINTMENT",
      { ipAddress, channel: appointment.otpChannel },
    );

    const updatedAppointment = await prisma.$transaction(async (tx) => {
      const emailOwner = appointment.patientEmail
        ? await tx.user.findUnique({
            where: { email: appointment.patientEmail },
            select: { id: true },
          })
        : null;

      if (emailOwner && emailOwner.id !== appointment.patientId) {
        throw new AppError("Email đã được sử dụng cho tài khoản khác", 409);
      }

      const cccdOwner = appointment.patientCccd
        ? await tx.patientProfile.findUnique({
            where: { cccd: appointment.patientCccd },
            select: { userId: true },
          })
        : null;

      if (cccdOwner && cccdOwner.userId !== appointment.patientId) {
        throw new AppError(
          "CCCD đã được sử dụng cho hồ sơ bệnh nhân khác",
          409,
        );
      }

      await tx.user.update({
        where: { id: appointment.patientId },
        data: {
          fullName: appointment.patientName,
          email: appointment.patientEmail,
          isPhoneVerified: true,
        },
      });

      await tx.patientProfile.upsert({
        where: { userId: appointment.patientId },
        update: {
          gender: appointment.patientGender,
          dateOfBirth: appointment.patientDateOfBirth,
          cccd: appointment.patientCccd,
          address: appointment.patientAddress,
          hasBHYT: appointment.hasBHYT,
          healthInsuranceCode: appointment.healthInsuranceCode,
          registeredHospital: appointment.registeredHospital,
          allergies: appointment.allergies,
          medicalHistory: appointment.medicalHistory,
          familyHistory: appointment.familyHistory,
        },
        create: {
          userId: appointment.patientId,
          gender: appointment.patientGender,
          dateOfBirth: appointment.patientDateOfBirth,
          cccd: appointment.patientCccd,
          address: appointment.patientAddress,
          hasBHYT: appointment.hasBHYT,
          healthInsuranceCode: appointment.healthInsuranceCode,
          registeredHospital: appointment.registeredHospital,
          allergies: appointment.allergies,
          medicalHistory: appointment.medicalHistory,
          familyHistory: appointment.familyHistory,
        },
      });

      return tx.appointment.update({
        where: { id: appointment.id },
        data: {
          status: "PENDING_CONFIRM",
          logs: {
            create: {
              action: "OTP_VERIFIED",
              note: "Bệnh nhân đã xác thực OTP đặt lịch",
            },
          },
        },
        select: appointmentSelect,
      });
    });

    return updatedAppointment;
  }

  async getPublicById(id: string, phone: string) {
    if (!phone) {
      throw new AppError("Thiếu số điện thoại", 400);
    }

    const appointment = await prisma.appointment.findFirst({
      where: {
        id,
        patientPhone: phone,
      },
      select: appointmentSelect,
    });

    if (!appointment) {
      throw new AppError("Không tìm thấy lịch hẹn", 404);
    }

    return appointment;
  }

  async lookupPublic(input: { bookingCode?: string; phone?: string }) {
    const bookingCode = input.bookingCode?.trim().toUpperCase();
    const phone = input.phone?.trim();

    if (!bookingCode) {
      throw new AppError("Thiếu mã lịch hẹn", 400);
    }

    if (!phone) {
      throw new AppError("Thiếu số điện thoại", 400);
    }

    const appointment = await prisma.appointment.findFirst({
      where: {
        bookingCode,
        patientPhone: phone,
      },
      select: appointmentSelect,
    });

    if (!appointment) {
      throw new AppError("Không tìm thấy lịch hẹn", 404);
    }

    return appointment;
  }

  async getPublicResult(input: { bookingCode?: string; phone?: string }) {
    const bookingCode = input.bookingCode?.trim().toUpperCase();
    const phone = input.phone?.trim();

    if (!bookingCode) {
      throw new AppError("Thiếu mã lịch hẹn", 400);
    }

    if (!phone) {
      throw new AppError("Thiếu số điện thoại", 400);
    }

    const appointment = await prisma.appointment.findFirst({
      where: {
        bookingCode,
        patientPhone: phone,
      },
      select: publicAppointmentResultSelect,
    });

    if (!appointment) {
      throw new AppError("Không tìm thấy lịch hẹn", 404);
    }

    const medicalRecord = await prisma.medicalRecord.findFirst({
      where: {
        appointmentId: appointment.id,
        status: "PUBLISHED",
      },
      select: publicMedicalRecordResultSelect,
    });

    const prescription = medicalRecord
      ? await prisma.prescription.findFirst({
          where: {
            medicalRecordId: medicalRecord.id,
            status: "ISSUED",
          },
          select: publicPrescriptionResultSelect,
        })
      : null;

    return {
      appointment,
      medicalRecord,
      prescription,
    };
  }

  async requestLookupOtp(input: {
    phone?: string;
    bookingCode?: string;
    ipAddress: string;
  }) {
    const phone = input.phone?.trim();
    const bookingCode = input.bookingCode?.trim().toUpperCase();

    if (!phone) {
      throw new AppError("Thiếu số điện thoại", 400);
    }

    const otpTarget = await resolveLookupOtpTarget(phone, bookingCode);

    return AuthOtpService.sendOtp(
      otpTarget.target,
      "LOOKUP_RESULT",
      input.ipAddress,
      { channel: otpTarget.channel },
    );
  }

  async verifyLookupOtp(input: {
    phone?: string;
    bookingCode?: string;
    otp?: string;
    ipAddress?: string;
  }) {
    const phone = input.phone?.trim();
    const bookingCode = input.bookingCode?.trim().toUpperCase();

    if (!phone) {
      throw new AppError("Thiếu số điện thoại", 400);
    }

    if (!input.otp) {
      throw new AppError("Thiếu mã OTP", 400);
    }

    const otpTarget = await resolveLookupOtpTarget(phone, bookingCode);

    await AuthOtpService.verifyOtp(
      otpTarget.target,
      input.otp,
      "LOOKUP_RESULT",
      {
        ipAddress: input.ipAddress,
        channel: otpTarget.channel,
      },
    );

    const appointments = await prisma.appointment.findMany({
      where: {
        patientPhone: phone,
        ...(bookingCode ? { bookingCode } : {}),
      },
      select: publicAppointmentSummarySelect,
      orderBy: [{ appointmentDate: "desc" }, { startTime: "desc" }],
      take: bookingCode ? 1 : 10,
    });

    return {
      phone,
      items: appointments,
    };
  }

  async requestPublicCancelOtp(input: PublicCancelAppointmentInput) {
    const appointment = await this.getPublicCancellableAppointment(input);

    const otpTarget = resolveAppointmentOtpTarget(appointment);
    const otp = await AuthOtpService.sendOtp(
      otpTarget.target,
      "CANCEL_APPOINTMENT",
      input.ipAddress,
      {
        channel: otpTarget.channel,
      },
    );

    await prisma.appointmentLog.create({
      data: {
        appointmentId: appointment.id,
        action: "OTP_SENT",
        note: getOtpLogNote("OTP xác thực hủy lịch", otp.deliveryStatus),
      },
    });

    return {
      bookingCode: appointment.bookingCode,
      patientPhone: appointment.patientPhone,
      otpDeliveryStatus: otp.deliveryStatus,
      debugOtp: otp.debugOtp,
      expiresIn: otp.expiresIn,
    };
  }

  async verifyPublicCancel(input: PublicCancelAppointmentInput) {
    if (!input.otp) {
      throw new AppError("Thiếu OTP", 400);
    }

    const appointment = await this.getPublicCancellableAppointment(input);

    const otpTarget = resolveAppointmentOtpTarget(appointment);

    await AuthOtpService.verifyOtp(
      otpTarget.target,
      input.otp,
      "CANCEL_APPOINTMENT",
      {
        ipAddress: input.ipAddress,
        channel: otpTarget.channel,
      },
    );

    return prisma.$transaction(async (tx) => {
      if (appointment.timeSlotId) {
        await tx.doctorTimeSlot.update({
          where: { id: appointment.timeSlotId },
          data: {
            status: "AVAILABLE",
            isActive: true,
            lockReason: null,
          },
        });
      }

      return tx.appointment.update({
        where: { id: appointment.id },
        data: {
          status: "CANCELLED_BY_PATIENT",
          cancelledAt: new Date(),
          cancelledByRole: "PATIENT",
          cancelledById: appointment.patientId,
          cancelledReason: input.reason?.trim(),
          logs: {
            create: {
              action: "CANCELLED_BY_PATIENT",
              createdById: appointment.patientId,
              note: input.reason?.trim(),
            },
          },
        },
        select: appointmentSelect,
      });
    });
  }

  async dashboardList(
    query: {
      status?: AppointmentStatus;
      doctorId?: string;
      date?: string;
      phone?: string;
      bookingCode?: string;
      page?: number;
      limit?: number;
    },
    actor: Actor,
  ) {
    const page = Math.max(query.page || 1, 1);
    const limit = Math.min(Math.max(query.limit || 20, 1), 100);
    const skip = (page - 1) * limit;

    const where: Prisma.AppointmentWhereInput = {
      status: query.status,
      doctorId: query.doctorId,
      appointmentDate: query.date ? parseDateOnly(query.date) : undefined,
      patientPhone: query.phone ? { contains: query.phone } : undefined,
      bookingCode: query.bookingCode,
    };

    if (actor.role === "DOCTOR") {
      where.doctor = {
        userId: actor.userId,
      };
    }

    const [items, total] = await prisma.$transaction([
      prisma.appointment.findMany({
        where,
        select: appointmentSelect,
        orderBy: [{ appointmentDate: "desc" }, { startTime: "asc" }],
        skip,
        take: limit,
      }),
      prisma.appointment.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async dashboardGetById(id: string, actor: Actor) {
    const where: Prisma.AppointmentWhereInput = { id };

    if (actor.role === "DOCTOR") {
      where.doctor = { userId: actor.userId };
    }

    const appointment = await prisma.appointment.findFirst({
      where,
      select: appointmentSelect,
    });

    if (!appointment) {
      throw new AppError("Không tìm thấy lịch hẹn", 404);
    }

    return appointment;
  }

  async updatePatientInfo(
    id: string,
    input: UpdateAppointmentPatientInfoInput,
    actor: Actor,
  ) {
    if (actor.role === "DOCTOR") {
      throw new AppError(
        "Bác sĩ không có quyền cập nhật thông tin tiếp nhận",
        403,
      );
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        patientId: true,
        invoice: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!appointment) {
      throw new AppError("Không tìm thấy lịch hẹn", 404);
    }

    if (appointment.invoice) {
      throw new AppError(
        "Không thể cập nhật thông tin khi lịch hẹn đã có hóa đơn",
        400,
      );
    }

    if (
      [
        "PENDING_OTP",
        "CANCELLED_BY_ADMIN",
        "CANCELLED_BY_DOCTOR",
        "CANCELLED_BY_PATIENT",
        "NO_SHOW",
      ].includes(appointment.status)
    ) {
      throw new AppError(
        "Chỉ cập nhật thông tin tiếp nhận cho lịch đã xác thực và chưa hủy",
        400,
      );
    }

    const patientDateOfBirth =
      input.dateOfBirth === undefined
        ? undefined
        : parseOptionalDate(input.dateOfBirth);

    if (
      patientDateOfBirth &&
      patientDateOfBirth >= parseDateOnly(getVietnamNowParts().date)
    ) {
      throw new AppError("Ngày sinh phải nhỏ hơn ngày hiện tại", 400);
    }

    const hasBHYT = input.hasBHYT;
    const appointmentData: Prisma.AppointmentUpdateInput = {
      patientName: input.patientName,
      patientEmail: normalizeOptionalString(input.patientEmail),
      patientGender: input.gender,
      patientDateOfBirth,
      patientCccd: normalizeOptionalString(input.cccd),
      patientAddress: normalizeOptionalString(input.address),
      hasBHYT,
      healthInsuranceCode:
        hasBHYT === false
          ? null
          : normalizeOptionalString(input.healthInsuranceCode),
      registeredHospital:
        hasBHYT === false
          ? null
          : normalizeOptionalString(input.registeredHospital),
      allergies: normalizeOptionalString(input.allergies),
      medicalHistory: normalizeOptionalString(input.medicalHistory),
      familyHistory: normalizeOptionalString(input.familyHistory),
      bhytDiscount: hasBHYT === false ? 0 : undefined,
    };

    return prisma.$transaction(async (tx) => {
      const current = await tx.appointment.findUniqueOrThrow({
        where: { id },
        select: {
          estimatedPrice: true,
          serviceFee: true,
        },
      });

      if (hasBHYT === false) {
        appointmentData.finalAmount =
          current.estimatedPrice + current.serviceFee;
      }

      await tx.user.update({
        where: { id: appointment.patientId },
        data: {
          fullName: input.patientName,
          email: normalizeOptionalString(input.patientEmail),
        },
      });

      await tx.patientProfile.upsert({
        where: { userId: appointment.patientId },
        update: {
          gender: input.gender,
          dateOfBirth: patientDateOfBirth,
          cccd: normalizeOptionalString(input.cccd),
          address: normalizeOptionalString(input.address),
          hasBHYT,
          healthInsuranceCode:
            hasBHYT === false
              ? null
              : normalizeOptionalString(input.healthInsuranceCode),
          registeredHospital:
            hasBHYT === false
              ? null
              : normalizeOptionalString(input.registeredHospital),
          allergies: normalizeOptionalString(input.allergies),
          medicalHistory: normalizeOptionalString(input.medicalHistory),
          familyHistory: normalizeOptionalString(input.familyHistory),
        },
        create: {
          userId: appointment.patientId,
          gender: input.gender,
          dateOfBirth: patientDateOfBirth,
          cccd: normalizeOptionalString(input.cccd),
          address: normalizeOptionalString(input.address),
          hasBHYT: hasBHYT ?? false,
          healthInsuranceCode:
            hasBHYT === false
              ? null
              : normalizeOptionalString(input.healthInsuranceCode),
          registeredHospital:
            hasBHYT === false
              ? null
              : normalizeOptionalString(input.registeredHospital),
          allergies: normalizeOptionalString(input.allergies),
          medicalHistory: normalizeOptionalString(input.medicalHistory),
          familyHistory: normalizeOptionalString(input.familyHistory),
        },
      });

      return tx.appointment.update({
        where: { id },
        data: appointmentData,
        select: appointmentSelect,
      });
    });
  }

  async confirm(id: string, actor: Actor) {
    const appointment = await this.getAppointmentStatus(id, actor);

    if (appointment.status !== "PENDING_CONFIRM") {
      throw new AppError("Chỉ có thể xác nhận lịch đang chờ xác nhận", 400);
    }

    return prisma.appointment.update({
      where: { id },
      data: {
        status: "CONFIRMED",
        confirmedAt: new Date(),
        logs: {
          create: {
            action: "CONFIRMED",
            createdById: actor.userId,
            note: "Lịch hẹn đã được xác nhận",
          },
        },
      },
      select: appointmentSelect,
    });
  }

  async updateStatus(
    id: string,
    status: Extract<
      AppointmentStatus,
      "CONFIRMED" | "CHECKED_IN" | "IN_PROGRESS" | "COMPLETED" | "NO_SHOW"
    >,
    actor: Actor,
  ) {
    switch (status) {
      case "CONFIRMED":
        return this.confirm(id, actor);
      case "CHECKED_IN":
        return this.checkIn(id, actor);
      case "IN_PROGRESS":
        return this.start(id, actor);
      case "COMPLETED":
        return this.complete(id, actor);
      case "NO_SHOW":
        return this.markNoShow(id, actor);
      default:
        throw new AppError("Trạng thái lịch hẹn không hợp lệ", 400);
    }
  }

  async cancel(id: string, reason: string, actor: Actor) {
    const appointment = await this.getAppointmentStatus(id, actor);

    if (
      [
        "COMPLETED",
        "CANCELLED_BY_ADMIN",
        "CANCELLED_BY_DOCTOR",
        "CANCELLED_BY_PATIENT",
      ].includes(appointment.status)
    ) {
      throw new AppError("Không thể hủy lịch hẹn này", 400);
    }

    const cancelStatus =
      actor.role === "DOCTOR" ? "CANCELLED_BY_DOCTOR" : "CANCELLED_BY_ADMIN";
    const cancelAction =
      actor.role === "DOCTOR" ? "CANCELLED_BY_DOCTOR" : "CANCELLED_BY_ADMIN";

    return prisma.$transaction(async (tx) => {
      if (appointment.timeSlotId) {
        await tx.doctorTimeSlot.update({
          where: { id: appointment.timeSlotId },
          data: {
            status: "AVAILABLE",
            isActive: true,
            lockReason: null,
          },
        });
      }

      return tx.appointment.update({
        where: { id },
        data: {
          status: cancelStatus,
          cancelledAt: new Date(),
          cancelledByRole: actor.role,
          cancelledById: actor.userId,
          cancelledReason: reason,
          logs: {
            create: {
              action: cancelAction,
              createdById: actor.userId,
              note: reason,
            },
          },
        },
        select: appointmentSelect,
      });
    });
  }

  async checkIn(id: string, actor: Actor) {
    const appointment = await this.getAppointmentStatus(id, actor);

    if (appointment.status !== "CONFIRMED") {
      throw new AppError("Chỉ có thể check-in lịch đã xác nhận", 400);
    }

    return prisma.appointment.update({
      where: { id },
      data: {
        status: "CHECKED_IN",
        logs: {
          create: {
            action: "CHECKED_IN",
            createdById: actor.userId,
            note: "Benh nhan da check-in",
          },
        },
      },
      select: appointmentSelect,
    });
  }

  async start(id: string, actor: Actor) {
    const appointment = await this.getAppointmentStatus(id, actor);

    if (appointment.status !== "CHECKED_IN") {
      throw new AppError(
        "Chỉ có thể bắt đầu khám sau khi bệnh nhân check-in",
        400,
      );
    }

    return prisma.$transaction(async (tx) => {
      await MedicalRecordService.ensureForAppointment(id, tx);

      return tx.appointment.update({
        where: { id },
        data: {
          status: "IN_PROGRESS",
          logs: {
            create: {
              action: "IN_PROGRESS",
              createdById: actor.userId,
              note: "Bắt đầu khám và tạo hồ sơ khám",
            },
          },
        },
        select: appointmentSelect,
      });
    });
  }

  async complete(id: string, actor: Actor) {
    const appointment = await this.getAppointmentStatus(id, actor);

    if (appointment.status !== "IN_PROGRESS") {
      throw new AppError("Chỉ có thể hoàn thành lịch đang khám", 400);
    }

    return prisma.appointment.update({
      where: { id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        logs: {
          create: {
            action: "COMPLETED",
            createdById: actor.userId,
            note: "Hoàn thành khám",
          },
        },
      },
      select: appointmentSelect,
    });
  }

  async markNoShow(id: string, actor: Actor) {
    const appointment = await this.getAppointmentStatus(id, actor);

    if (!["CONFIRMED", "CHECKED_IN"].includes(appointment.status)) {
      throw new AppError(
        "Chỉ có thể đánh dấu no-show cho lịch đã xác nhận hoặc đã check-in",
        400,
      );
    }

    return prisma.$transaction(async (tx) => {
      if (appointment.timeSlotId) {
        await tx.doctorTimeSlot.update({
          where: { id: appointment.timeSlotId },
          data: {
            status: "AVAILABLE",
            isActive: true,
            lockReason: null,
          },
        });
      }

      return tx.appointment.update({
        where: { id },
        data: {
          status: "NO_SHOW",
          logs: {
            create: {
              action: "NO_SHOW",
              createdById: actor.userId,
              note: "Bệnh nhân không đến",
            },
          },
        },
        select: appointmentSelect,
      });
    });
  }

  async cleanupExpiredPendingOtp(
    actor: Actor,
    expireMinutes = DEFAULT_PENDING_OTP_EXPIRE_MINUTES,
  ) {
    const safeExpireMinutes = Math.max(expireMinutes, 1);
    const expiredBefore = new Date(Date.now() - safeExpireMinutes * 60 * 1000);

    const expiredAppointments = await prisma.appointment.findMany({
      where: {
        status: "PENDING_OTP",
        createdAt: {
          lt: expiredBefore,
        },
      },
      select: {
        id: true,
        timeSlotId: true,
      },
    });

    if (!expiredAppointments.length) {
      return {
        expiredBefore,
        count: 0,
      };
    }

    await prisma.$transaction(async (tx) => {
      for (const appointment of expiredAppointments) {
        if (appointment.timeSlotId) {
          await tx.doctorTimeSlot.update({
            where: { id: appointment.timeSlotId },
            data: {
              status: "AVAILABLE",
              isActive: true,
              lockReason: null,
            },
          });
        }

        await tx.appointment.update({
          where: { id: appointment.id },
          data: {
            status: "CANCELLED_BY_ADMIN",
            cancelledAt: new Date(),
            cancelledByRole: actor.role,
            cancelledById: actor.userId,
            cancelledReason: "Qua han xac thuc OTP",
            logs: {
              create: {
                action: "CANCELLED_BY_ADMIN",
                createdById: actor.userId,
                note: `Tự động hủy do quá ${safeExpireMinutes} phút chưa xác thực OTP`,
              },
            },
          },
        });
      }
    });

    return {
      expiredBefore,
      count: expiredAppointments.length,
    };
  }

  private async releasePendingAppointment(appointmentId: string) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { timeSlotId: true },
    });

    if (appointment?.timeSlotId) {
      await prisma.doctorTimeSlot.update({
        where: { id: appointment.timeSlotId },
        data: { status: "AVAILABLE" },
      });
    }

    await prisma.appointment.delete({
      where: { id: appointmentId },
    });
  }

  private async getPublicCancellableAppointment(
    input: PublicCancelAppointmentInput,
  ) {
    const bookingCode = input.bookingCode?.trim().toUpperCase();
    const phone = input.phone?.trim();
    const reason = input.reason?.trim();

    if (!bookingCode) {
      throw new AppError("Thiếu mã lịch hẹn", 400);
    }

    if (!phone) {
      throw new AppError("Thiếu số điện thoại", 400);
    }

    if (!reason || reason.length < 2) {
      throw new AppError("Lý do hủy tối thiểu 2 ký tự", 400);
    }

    const appointment = await prisma.appointment.findFirst({
      where: {
        bookingCode,
        patientPhone: phone,
      },
      select: {
        id: true,
        bookingCode: true,
        patientId: true,
        patientPhone: true,
        patientEmail: true,
        otpChannel: true,
        status: true,
        timeSlotId: true,
      },
    });

    if (!appointment) {
      throw new AppError("Không tìm thấy lịch hẹn", 404);
    }

    if (!PUBLIC_CANCEL_ALLOWED_STATUSES.includes(appointment.status)) {
      throw new AppError(
        "Chỉ có thể hủy lịch đang chờ xác nhận hoặc đã xác nhận",
        400,
      );
    }

    return appointment;
  }

  private async getAppointmentStatus(id: string, actor: Actor) {
    const where: Prisma.AppointmentWhereInput = { id };

    if (actor.role === "DOCTOR") {
      where.doctor = {
        userId: actor.userId,
      };
    }

    const appointment = await prisma.appointment.findFirst({
      where,
      select: {
        id: true,
        status: true,
        timeSlotId: true,
      },
    });

    if (!appointment) {
      throw new AppError("Không tìm thấy lịch hẹn", 404);
    }

    return appointment;
  }

  private async generateUniqueBookingCode(tx: Prisma.TransactionClient) {
    for (let index = 0; index < 10; index += 1) {
      const bookingCode = generateBookingCode();
      const existing = await tx.appointment.findUnique({
        where: { bookingCode },
        select: { id: true },
      });

      if (!existing) {
        return bookingCode;
      }
    }

    throw new AppError("Không thể tạo mã đặt lịch", 500);
  }
}

export default new AppointmentService();
