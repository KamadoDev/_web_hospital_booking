import { Prisma } from "../../generated/prisma/client.js";
import type { AppointmentStatus, Gender, OtpChannel, Role } from "../../generated/prisma/enums.js";
import { prisma } from "../config/prisma.js";
import AuthOtpService from "./authOtp.service.js";
import { AppError } from "../utils/appError.js";
import { generateBookingCode } from "../utils/bookingCode.js";
import { parseDateOnly } from "../utils/time.js";
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

const DEFAULT_PENDING_OTP_EXPIRE_MINUTES = 15;

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
} satisfies Prisma.AppointmentSelect;

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
      throw new AppError("Bac si khong san sang nhan lich", 400);
    }

    if (doctor.departmentId !== input.departmentId || !doctor.department.isActive) {
      throw new AppError("Bac si khong thuoc chuyen khoa da chon", 400);
    }

    const department = await prisma.department.findUnique({
      where: { id: input.departmentId },
      select: { id: true, isActive: true },
    });

    if (!department || !department.isActive) {
      throw new AppError("Chuyen khoa khong hoat dong", 400);
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
          },
        })
      : null;

    if (input.packageId && !packageItem) {
      throw new AppError("Khong tim thay goi kham", 404);
    }

    if (packageItem && !packageItem.isActive) {
      throw new AppError("Goi kham khong hoat dong", 400);
    }

    if (packageItem?.departmentId && packageItem.departmentId !== input.departmentId) {
      throw new AppError("Goi kham khong thuoc chuyen khoa da chon", 400);
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
      throw new AppError("Khung gio khong kha dung", 409);
    }

    const estimatedPrice = packageItem?.basePrice ?? doctor.consultationFee;
    const serviceFee = packageItem?.serviceFee ?? 0;
    const bhytDiscount = 0;
    const finalAmount = estimatedPrice + serviceFee - bhytDiscount;
    const patientDateOfBirth = parseOptionalDate(input.dateOfBirth);
    const normalizedPatientEmail = normalizeOptionalString(input.patientEmail);
    const otpChannel = input.otpChannel || "SMS";

    if (otpChannel === "EMAIL" && !normalizedPatientEmail) {
      throw new AppError("Email la bat buoc khi chon xac thuc OTP qua email", 400);
    }
    const existingUser = await prisma.user.findUnique({
      where: { phone: input.patientPhone },
      select: { role: true },
    });

    if (existingUser && existingUser.role !== "PATIENT") {
      throw new AppError("So dien thoai da thuoc tai khoan noi bo", 409);
    }

    const emailOwner = normalizedPatientEmail
      ? await prisma.user.findUnique({
          where: { email: normalizedPatientEmail },
          select: { phone: true },
        })
      : null;

    if (emailOwner && emailOwner.phone !== input.patientPhone) {
      throw new AppError("Email da duoc su dung cho tai khoan khac", 409);
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
          throw new AppError("Khung gio da duoc dat", 409);
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
          throw new AppError("So dien thoai da thuoc tai khoan noi bo", 409);
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
            healthInsuranceCode: normalizeOptionalString(input.healthInsuranceCode),
            registeredHospital: normalizeOptionalString(input.registeredHospital),
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
                note: "Benh nhan tao lich hen va cho xac thuc OTP",
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
        otpChannel === "EMAIL" ? normalizedPatientEmail || "" : input.patientPhone,
        "BOOK_APPOINTMENT",
        ipAddress,
        { channel: otpChannel },
      );

      await prisma.appointmentLog.create({
        data: {
          appointmentId,
          action: "OTP_SENT",
          note: "OTP xac thuc dat lich da duoc gui",
        },
      });

      return {
        appointmentId,
        bookingCode,
        patientPhone: input.patientPhone,
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
      throw new AppError("Khong tim thay lich hen", 404);
    }

    if (appointment.status !== "PENDING_OTP") {
      throw new AppError("Lich hen khong o trang thai cho OTP", 400);
    }

    const otp = await AuthOtpService.sendOtp(
      appointment.otpChannel === "EMAIL" ? appointment.patientEmail || "" : appointment.patientPhone,
      "BOOK_APPOINTMENT",
      ipAddress,
      { channel: appointment.otpChannel },
    );

    await prisma.appointmentLog.create({
      data: {
        appointmentId: appointment.id,
        action: "OTP_SENT",
        note: "OTP xac thuc dat lich da duoc gui lai",
      },
    });

    return {
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
      throw new AppError("Khong tim thay lich hen", 404);
    }

    if (appointment.status !== "PENDING_OTP") {
      throw new AppError("Lich hen khong o trang thai cho OTP", 400);
    }

    await AuthOtpService.verifyOtp(
      appointment.otpChannel === "EMAIL" ? appointment.patientEmail || "" : appointment.patientPhone,
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
        throw new AppError("Email da duoc su dung cho tai khoan khac", 409);
      }

      const cccdOwner = appointment.patientCccd
        ? await tx.patientProfile.findUnique({
            where: { cccd: appointment.patientCccd },
            select: { userId: true },
          })
        : null;

      if (cccdOwner && cccdOwner.userId !== appointment.patientId) {
        throw new AppError("CCCD da duoc su dung cho ho so benh nhan khac", 409);
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
              note: "Benh nhan da xac thuc OTP dat lich",
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
      throw new AppError("Thieu so dien thoai", 400);
    }

    const appointment = await prisma.appointment.findFirst({
      where: {
        id,
        patientPhone: phone,
      },
      select: appointmentSelect,
    });

    if (!appointment) {
      throw new AppError("Khong tim thay lich hen", 404);
    }

    return appointment;
  }

  async dashboardList(query: {
    status?: AppointmentStatus;
    doctorId?: string;
    date?: string;
    phone?: string;
    bookingCode?: string;
    page?: number;
    limit?: number;
  }, actor: Actor) {
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
      throw new AppError("Khong tim thay lich hen", 404);
    }

    return appointment;
  }

  async confirm(id: string, actor: Actor) {
    const appointment = await this.getAppointmentStatus(id, actor);

    if (appointment.status !== "PENDING_CONFIRM") {
      throw new AppError("Chi co the xac nhan lich dang cho xac nhan", 400);
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
            note: "Lich hen da duoc xac nhan",
          },
        },
      },
      select: appointmentSelect,
    });
  }

  async updateStatus(
    id: string,
    status: Extract<AppointmentStatus, "CONFIRMED" | "CHECKED_IN" | "IN_PROGRESS" | "COMPLETED" | "NO_SHOW">,
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
        throw new AppError("Trang thai lich hen khong hop le", 400);
    }
  }

  async cancel(id: string, reason: string, actor: Actor) {
    const appointment = await this.getAppointmentStatus(id, actor);

    if (["COMPLETED", "CANCELLED_BY_ADMIN", "CANCELLED_BY_DOCTOR", "CANCELLED_BY_PATIENT"].includes(appointment.status)) {
      throw new AppError("Khong the huy lich hen nay", 400);
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
      throw new AppError("Chi co the check-in lich da xac nhan", 400);
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
      throw new AppError("Chi co the bat dau kham sau khi benh nhan check-in", 400);
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
              note: "Bat dau kham va tao ho so kham",
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
      throw new AppError("Chi co the hoan thanh lich dang kham", 400);
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
            note: "Hoan thanh kham",
          },
        },
      },
      select: appointmentSelect,
    });
  }

  async markNoShow(id: string, actor: Actor) {
    const appointment = await this.getAppointmentStatus(id, actor);

    if (!["CONFIRMED", "CHECKED_IN"].includes(appointment.status)) {
      throw new AppError("Chi co the danh dau no-show cho lich da xac nhan hoac da check-in", 400);
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
              note: "Benh nhan khong den",
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
                note: `Tu dong huy do qua ${safeExpireMinutes} phut chua xac thuc OTP`,
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
      throw new AppError("Khong tim thay lich hen", 404);
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

    throw new AppError("Khong the tao ma dat lich", 500);
  }
}

export default new AppointmentService();
