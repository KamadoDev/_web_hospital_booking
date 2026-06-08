import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/appError.js";

const publicDoctorSelect = {
  id: true,
  title: true,
  bio: true,
  specialization: true,
  experience: true,
  consultationFee: true,
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
} satisfies Prisma.DoctorProfileSelect;

class PublicDoctorService {
  async list(query: { search?: string; departmentSlug?: string; departmentId?: string }) {
    const where: Prisma.DoctorProfileWhereInput = {
      isAvailable: true,
      user: {
        isActive: true,
      },
      department: {
        isActive: true,
        slug: query.departmentSlug,
        id: query.departmentId,
      },
    };

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: "insensitive" } },
        { specialization: { contains: query.search, mode: "insensitive" } },
        { user: { fullName: { contains: query.search, mode: "insensitive" } } },
        { department: { name: { contains: query.search, mode: "insensitive" } } },
      ];
    }

    return prisma.doctorProfile.findMany({
      where,
      select: publicDoctorSelect,
      orderBy: {
        user: {
          fullName: "asc",
        },
      },
    });
  }

  async getById(id: string) {
    const doctor = await prisma.doctorProfile.findFirst({
      where: {
        id,
        isAvailable: true,
        user: {
          isActive: true,
        },
        department: {
          isActive: true,
        },
      },
      select: publicDoctorSelect,
    });

    if (!doctor) {
      throw new AppError("Không tìm thấy bác sĩ", 404);
    }

    return doctor;
  }
}

export default new PublicDoctorService();
