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

    const [reviewAggregate, publicReviews] = await Promise.all([
      prisma.review.aggregate({
        where: { doctorId: doctor.id, isVisible: true },
        _count: { id: true },
        _avg: { rating: true, doctorRating: true, serviceRating: true, facilityRating: true },
      }),
      prisma.review.findMany({
        where: { doctorId: doctor.id, isVisible: true, comment: { not: null } },
        select: { id: true, rating: true, doctorRating: true, serviceRating: true, facilityRating: true, comment: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
    ]);

    return {
      ...doctor,
      reviewSummary: {
        count: reviewAggregate._count.id,
        averageRating: reviewAggregate._avg.rating || 0,
        averageDoctorRating: reviewAggregate._avg.doctorRating || 0,
        averageServiceRating: reviewAggregate._avg.serviceRating || 0,
        averageFacilityRating: reviewAggregate._avg.facilityRating || 0,
      },
      publicReviews,
    };
  }
}

export default new PublicDoctorService();
