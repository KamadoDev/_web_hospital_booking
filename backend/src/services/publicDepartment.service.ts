import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/appError.js";

const publicDepartmentSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  image: true,
} satisfies Prisma.DepartmentSelect;

class PublicDepartmentService {
  async list(query: { search?: string }) {
    const where: Prisma.DepartmentWhereInput = {
      isActive: true,
    };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { slug: { contains: query.search, mode: "insensitive" } },
      ];
    }

    return prisma.department.findMany({
      where,
      select: publicDepartmentSelect,
      orderBy: {
        name: "asc",
      },
    });
  }

  async getBySlug(slug: string) {
    const department = await prisma.department.findFirst({
      where: {
        slug,
        isActive: true,
      },
      select: publicDepartmentSelect,
    });

    if (!department) {
      throw new AppError("Không tìm thấy chuyên khoa", 404);
    }

    return department;
  }
}

export default new PublicDepartmentService();
