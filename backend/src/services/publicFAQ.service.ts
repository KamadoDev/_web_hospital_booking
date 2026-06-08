import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/appError.js";

type FAQInput = {
  question?: string;
  answer?: string;
  category?: string | null;
  order?: number;
  isActive?: boolean;
};

const publicFAQSelect = {
  id: true,
  question: true,
  answer: true,
  category: true,
  order: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PublicFAQSelect;

class PublicFAQService {
  async listPublic(query: { category?: string }) {
    return prisma.publicFAQ.findMany({
      where: {
        category: query.category,
        isActive: true,
      },
      select: publicFAQSelect,
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    });
  }

  async listDashboard(query: { category?: string; isActive?: boolean }) {
    return prisma.publicFAQ.findMany({
      where: {
        category: query.category,
        isActive: query.isActive,
      },
      select: publicFAQSelect,
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    });
  }

  async getById(id: string) {
    const faq = await prisma.publicFAQ.findUnique({
      where: { id },
      select: publicFAQSelect,
    });

    if (!faq) {
      throw new AppError("Không tìm thấy FAQ", 404);
    }

    return faq;
  }

  async create(input: Required<Pick<FAQInput, "question" | "answer">> & FAQInput) {
    return prisma.publicFAQ.create({
      data: {
        question: input.question,
        answer: input.answer,
        category: input.category,
        order: input.order || 0,
        isActive: input.isActive ?? true,
      },
      select: publicFAQSelect,
    });
  }

  async update(id: string, input: FAQInput) {
    await this.getById(id);

    return prisma.publicFAQ.update({
      where: { id },
      data: {
        question: input.question,
        answer: input.answer,
        category: input.category,
        order: input.order,
        isActive: input.isActive,
      },
      select: publicFAQSelect,
    });
  }

  async delete(id: string) {
    const faq = await this.getById(id);

    await prisma.publicFAQ.delete({
      where: { id },
    });

    return faq;
  }
}

export default new PublicFAQService();
