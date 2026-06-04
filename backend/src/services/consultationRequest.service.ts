import { Prisma } from "../../generated/prisma/client.js";
import type { ConsultationStatus } from "../../generated/prisma/enums.js";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/appError.js";

type CreateConsultationRequestInput = {
  phone: string;
  fullName?: string | null;
  message?: string | null;
};

type UpdateConsultationRequestInput = {
  status?: ConsultationStatus;
  note?: string | null;
};

type ListConsultationRequestsQuery = {
  status?: ConsultationStatus;
  keyword?: string;
  page?: number;
  limit?: number;
};

const consultationRequestSelect = {
  id: true,
  phone: true,
  fullName: true,
  message: true,
  status: true,
  note: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ConsultationRequestSelect;

const normalizeOptionalString = (value?: string | null) =>
  value === undefined ? undefined : value?.trim() || null;

class ConsultationRequestService {
  async create(input: CreateConsultationRequestInput) {
    return prisma.consultationRequest.create({
      data: {
        phone: input.phone.trim(),
        fullName: normalizeOptionalString(input.fullName),
        message: normalizeOptionalString(input.message),
      },
      select: consultationRequestSelect,
    });
  }

  async list(query: ListConsultationRequestsQuery) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;
    const keyword = query.keyword?.trim();
    const where: Prisma.ConsultationRequestWhereInput = {
      status: query.status,
      ...(keyword
        ? {
            OR: [
              { phone: { contains: keyword, mode: "insensitive" } },
              { fullName: { contains: keyword, mode: "insensitive" } },
              { message: { contains: keyword, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, total] = await prisma.$transaction([
      prisma.consultationRequest.findMany({
        where,
        select: consultationRequestSelect,
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
      prisma.consultationRequest.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async getById(id: string) {
    const request = await prisma.consultationRequest.findUnique({
      where: { id },
      select: consultationRequestSelect,
    });

    if (!request) {
      throw new AppError("Khong tim thay yeu cau tu van", 404);
    }

    return request;
  }

  async update(id: string, input: UpdateConsultationRequestInput) {
    await this.getById(id);

    return prisma.consultationRequest.update({
      where: { id },
      data: {
        status: input.status,
        note: normalizeOptionalString(input.note),
      },
      select: consultationRequestSelect,
    });
  }

  async delete(id: string) {
    const request = await this.getById(id);

    await prisma.consultationRequest.delete({
      where: { id },
    });

    return request;
  }
}

export default new ConsultationRequestService();
