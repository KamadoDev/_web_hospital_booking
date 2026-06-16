import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/appError.js";
import SearchIndexer from "./search/search.indexer.js";

type CreateFAQInput = {
  question: string;
  answer: string;
  keywords: string[];
  isActive?: boolean;
};

type UpdateFAQInput = {
  question?: string;
  answer?: string;
  keywords?: string[];
  isActive?: boolean;
};

const faqSelect = {
  id: true,
  question: true,
  answer: true,
  keywords: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ChatbotFAQSelect;

const normalizeKeywords = (keywords: string[]) =>
  Array.from(
    new Set(
      keywords
        .map((keyword) => keyword.trim())
        .filter(Boolean),
    ),
  );

class DashboardChatbotFAQService {
  async list(query: {
    search?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(query.page || 1, 1);
    const limit = Math.min(Math.max(query.limit || 20, 1), 100);
    const skip = (page - 1) * limit;

    const where: Prisma.ChatbotFAQWhereInput = {
      isActive: query.isActive,
    };

    if (query.search) {
      where.OR = [
        { question: { contains: query.search, mode: "insensitive" } },
        { answer: { contains: query.search, mode: "insensitive" } },
        { keywords: { has: query.search } },
      ];
    }

    const [items, total] = await prisma.$transaction([
      prisma.chatbotFAQ.findMany({
        where,
        select: faqSelect,
        orderBy: {
          updatedAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.chatbotFAQ.count({ where }),
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

  async getById(id: string) {
    const faq = await prisma.chatbotFAQ.findUnique({
      where: { id },
      select: faqSelect,
    });

    if (!faq) {
      throw new AppError("Không tìm thấy FAQ chatbot", 404);
    }

    return faq;
  }

  async create(input: CreateFAQInput) {
    const existingFAQ = await prisma.chatbotFAQ.findFirst({
      where: {
        question: {
          equals: input.question,
          mode: "insensitive",
        },
      },
      select: { id: true },
    });

    if (existingFAQ) {
      throw new AppError("Câu hỏi FAQ đã tồn tại", 409);
    }

    const faq = await prisma.chatbotFAQ.create({
      data: {
        question: input.question,
        answer: input.answer,
        keywords: normalizeKeywords(input.keywords),
        isActive: input.isActive ?? true,
      },
      select: faqSelect,
    });

    await SearchIndexer.syncChatbotFAQ(faq.id);

    return faq;
  }

  async update(id: string, input: UpdateFAQInput) {
    await this.getById(id);

    if (input.question) {
      const existingFAQ = await prisma.chatbotFAQ.findFirst({
        where: {
          id: { not: id },
          question: {
            equals: input.question,
            mode: "insensitive",
          },
        },
        select: { id: true },
      });

      if (existingFAQ) {
        throw new AppError("Câu hỏi FAQ đã tồn tại", 409);
      }
    }

    const faq = await prisma.chatbotFAQ.update({
      where: { id },
      data: {
        question: input.question,
        answer: input.answer,
        keywords: input.keywords ? normalizeKeywords(input.keywords) : undefined,
        isActive: input.isActive,
      },
      select: faqSelect,
    });

    await SearchIndexer.syncChatbotFAQ(faq.id);

    return faq;
  }

  async updateStatus(id: string, isActive: boolean) {
    await this.getById(id);

    const faq = await prisma.chatbotFAQ.update({
      where: { id },
      data: { isActive },
      select: faqSelect,
    });

    await SearchIndexer.syncChatbotFAQ(faq.id);

    return faq;
  }

  async delete(id: string) {
    const faq = await this.getById(id);

    await prisma.chatbotFAQ.delete({
      where: { id },
    });

    await SearchIndexer.remove("chatbot_faq", id);

    return faq;
  }
}

export default new DashboardChatbotFAQService();
