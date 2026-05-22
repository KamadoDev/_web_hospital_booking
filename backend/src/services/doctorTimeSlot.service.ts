import { Prisma } from "../../generated/prisma/client.js";
import type { Role, TimeSlotStatus } from "../../generated/prisma/enums.js";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/appError.js";
import { buildTimeSlots, getUtcDayOfWeek, parseDateOnly } from "../utils/time.js";

type Actor = {
  userId: string;
  role: Role;
};

const doctorTimeSlotSelect = {
  id: true,
  date: true,
  startTime: true,
  endTime: true,
  status: true,
  isActive: true,
  lockReason: true,
  createdAt: true,
  updatedAt: true,
  appointment: {
    select: {
      id: true,
      bookingCode: true,
      status: true,
    },
  },
  doctor: {
    select: {
      id: true,
      userId: true,
      title: true,
      specialization: true,
      user: {
        select: {
          fullName: true,
          avatar: true,
        },
      },
      department: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  },
} satisfies Prisma.DoctorTimeSlotSelect;

class DoctorTimeSlotService {
  async list(query: {
    doctorId?: string;
    date?: string;
    status?: TimeSlotStatus;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }, actor: Actor) {
    const page = Math.max(query.page || 1, 1);
    const limit = Math.min(Math.max(query.limit || 30, 1), 200);
    const skip = (page - 1) * limit;

    const where: Prisma.DoctorTimeSlotWhereInput = {
      doctorId: query.doctorId,
      date: query.date ? parseDateOnly(query.date) : undefined,
      status: query.status,
      isActive: query.isActive,
    };

    if (actor.role === "DOCTOR") {
      where.doctor = {
        userId: actor.userId,
      };
    }

    const [items, total] = await prisma.$transaction([
      prisma.doctorTimeSlot.findMany({
        where,
        select: doctorTimeSlotSelect,
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
        skip,
        take: limit,
      }),
      prisma.doctorTimeSlot.count({ where }),
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

  async getById(id: string, actor: Actor) {
    const where: Prisma.DoctorTimeSlotWhereInput = {
      id,
    };

    if (actor.role === "DOCTOR") {
      where.doctor = {
        userId: actor.userId,
      };
    }

    const slot = await prisma.doctorTimeSlot.findFirst({
      where,
      select: doctorTimeSlotSelect,
    });

    if (!slot) {
      throw new AppError("Khong tim thay slot", 404);
    }

    return slot;
  }

  async generate(input: { doctorId: string; date: string }) {
    const date = parseDateOnly(input.date);

    const doctor = await prisma.doctorProfile.findUnique({
      where: { id: input.doctorId },
      select: {
        id: true,
        isAvailable: true,
        user: { select: { isActive: true } },
        department: { select: { isActive: true } },
      },
    });

    if (!doctor) {
      throw new AppError("Khong tim thay bac si", 404);
    }

    const schedules = await prisma.doctorSchedule.findMany({
      where: {
        doctorId: input.doctorId,
        dayOfWeek: getUtcDayOfWeek(date),
        isActive: true,
      },
      orderBy: {
        startTime: "asc",
      },
    });

    if (!schedules.length) {
      throw new AppError("Bac si chua co lich lam viec trong ngay nay", 404);
    }

    const slotData = schedules.flatMap((schedule) =>
      buildTimeSlots(schedule.startTime, schedule.endTime, schedule.slotDuration).map(
        (slot) => ({
          doctorId: input.doctorId,
          date,
          startTime: slot.startTime,
          endTime: slot.endTime,
        }),
      ),
    );

    await prisma.doctorTimeSlot.createMany({
      data: slotData,
      skipDuplicates: true,
    });

    const items = await prisma.doctorTimeSlot.findMany({
      where: {
        doctorId: input.doctorId,
        date,
      },
      select: doctorTimeSlotSelect,
      orderBy: {
        startTime: "asc",
      },
    });

    return {
      items,
      generatedCount: slotData.length,
      total: items.length,
    };
  }

  async updateStatus(id: string, status: TimeSlotStatus, lockReason?: string | null) {
    const slot = await this.getSlotForMutation(id);

    if (slot.status === "BOOKED" || slot.appointment) {
      throw new AppError("Khong the cap nhat slot da duoc dat", 409);
    }

    if (status === "BOOKED") {
      throw new AppError("Khong the set BOOKED thu cong", 400);
    }

    return prisma.doctorTimeSlot.update({
      where: { id },
      data: {
        status,
        lockReason: status === "LOCKED" ? lockReason || slot.lockReason : null,
        isActive: status !== "CANCELLED",
      },
      select: doctorTimeSlotSelect,
    });
  }

  async lock(id: string, lockReason: string) {
    return this.updateStatus(id, "LOCKED", lockReason);
  }

  async unlock(id: string) {
    const slot = await this.getSlotForMutation(id);

    if (slot.status === "BOOKED" || slot.appointment) {
      throw new AppError("Khong the mo khoa slot da duoc dat", 409);
    }

    return prisma.doctorTimeSlot.update({
      where: { id },
      data: {
        status: "AVAILABLE",
        lockReason: null,
        isActive: true,
      },
      select: doctorTimeSlotSelect,
    });
  }

  async delete(id: string) {
    const slot = await this.getSlotForMutation(id);

    if (slot.status === "BOOKED" || slot.appointment) {
      throw new AppError("Khong the xoa slot da duoc dat", 409);
    }

    await prisma.doctorTimeSlot.delete({
      where: { id },
    });

    return slot;
  }

  async getPublicAvailableSlots(doctorId: string, dateString: string) {
    const date = parseDateOnly(dateString);

    return prisma.doctorTimeSlot.findMany({
      where: {
        doctorId,
        date,
        status: "AVAILABLE",
        isActive: true,
        doctor: {
          isAvailable: true,
          user: {
            isActive: true,
          },
          department: {
            isActive: true,
          },
        },
      },
      select: {
        id: true,
        date: true,
        startTime: true,
        endTime: true,
      },
      orderBy: {
        startTime: "asc",
      },
    });
  }

  private async getSlotForMutation(id: string) {
    const slot = await prisma.doctorTimeSlot.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        lockReason: true,
        appointment: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!slot) {
      throw new AppError("Khong tim thay slot", 404);
    }

    return slot;
  }
}

export default new DoctorTimeSlotService();
