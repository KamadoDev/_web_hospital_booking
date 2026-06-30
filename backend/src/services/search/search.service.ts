import {
  elasticClient,
  elasticsearchIndex,
  isElasticsearchEnabled,
} from "../../config/elasticsearch.js";
import { prisma } from "../../config/prisma.js";
import type {
  PublicSearchQuery,
  PublicSearchResult,
  SearchDocument,
  SearchDocumentType,
} from "./search.types.js";
import { SEARCH_DOCUMENT_TYPES } from "./search.types.js";
import { resolveSupportSearchUrl } from "./search.urls.js";

const normalizeLimit = (limit?: number) =>
  Math.min(Math.max(limit || 12, 1), 30);

const normalizeQuery = (value?: string) =>
  (value || "").replace(/\s+/g, " ").trim().slice(0, 120);

const normalizeType = (type?: string): SearchDocumentType | "all" =>
  SEARCH_DOCUMENT_TYPES.includes(type as SearchDocumentType)
    ? (type as SearchDocumentType)
    : "all";

const toResult = (
  document: SearchDocument,
  source: PublicSearchResult["source"],
  score?: number,
): PublicSearchResult => ({
  id: document.id,
  type: document.type,
  title: document.title,
  description: document.description,
  url: document.url,
  image: document.image,
  departmentName: document.departmentName,
  price: document.price ?? undefined,
  score,
  source,
});

const includesText = (value: string | null | undefined, query: string) =>
  value?.toLowerCase().includes(query.toLowerCase()) || false;

class PublicSearchService {
  async search(query: PublicSearchQuery) {
    const q = normalizeQuery(query.q);
    const type = normalizeType(query.type);
    const limit = normalizeLimit(query.limit);

    if (q.length < 2) {
      return {
        items: [],
        source: "empty" as const,
      };
    }

    if (isElasticsearchEnabled && elasticClient) {
      try {
        const items = await this.searchElasticsearch({ q, type, limit });
        return {
          items,
          source: "elasticsearch" as const,
        };
      } catch (error) {
        console.warn(
          "[ELASTICSEARCH] Search failed, falling back to PostgreSQL",
          error,
        );
      }
    }

    return {
      items: await this.searchPostgres({ q, type, limit }),
      source: "postgres" as const,
    };
  }

  private async searchElasticsearch(input: {
    q: string;
    type: SearchDocumentType | "all";
    limit: number;
  }) {
    const filters: Record<string, unknown>[] = [{ term: { isActive: true } }];

    if (input.type !== "all") {
      filters.push({ term: { type: input.type } });
    }

    const response = await elasticClient!.search<SearchDocument>({
      index: elasticsearchIndex,
      size: input.limit,
      query: {
        bool: {
          filter: filters,
          should: [
            {
              multi_match: {
                query: input.q,
                fields: [
                  "title^4",
                  "departmentName^2",
                  "keywords^2",
                  "description",
                ],
                fuzziness: "AUTO",
              },
            },
            {
              wildcard: {
                "title.keyword": {
                  value: `*${input.q.toLowerCase()}*`,
                  boost: 1.5,
                  case_insensitive: true,
                },
              },
            },
          ],
          minimum_should_match: 1,
        },
      },
      sort: [
        { _score: "desc" },
        { priority: { order: "desc", missing: "_last" } },
        { updatedAt: { order: "desc", missing: "_last" } },
      ] as any,
    });

    return response.hits.hits
      .map((hit) =>
        hit._source
          ? toResult(hit._source, "elasticsearch", hit._score ?? undefined)
          : null,
      )
      .filter(Boolean) as PublicSearchResult[];
  }

  private async searchPostgres(input: {
    q: string;
    type: SearchDocumentType | "all";
    limit: number;
  }) {
    const take = input.limit;
    const search = input.q;
    const tasks: Promise<PublicSearchResult[]>[] = [];

    if (input.type === "all" || input.type === "department") {
      tasks.push(this.searchDepartments(search, take));
    }

    if (input.type === "all" || input.type === "doctor") {
      tasks.push(this.searchDoctors(search, take));
    }

    if (input.type === "all" || input.type === "package") {
      tasks.push(this.searchPackages(search, take));
    }

    if (input.type === "all" || input.type === "faq") {
      tasks.push(this.searchFAQs(search, take));
    }

    if (input.type === "all" || input.type === "chatbot_faq") {
      tasks.push(this.searchChatbotFAQs(search, take));
    }

    const groups = await Promise.all(tasks);

    return groups
      .flat()
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, take);
  }

  private async searchDepartments(search: string, take: number) {
    const searchTokens = search
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 2)
      .slice(0, 10);
    const items = await prisma.department.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { slug: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          { triageDescription: { contains: search, mode: "insensitive" } },
          { symptomKeywords: { has: search } },
          ...searchTokens.flatMap((token) => [
            { description: { contains: token, mode: "insensitive" as const } },
            {
              triageDescription: {
                contains: token,
                mode: "insensitive" as const,
              },
            },
            { symptomKeywords: { has: token } },
          ]),
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        triageDescription: true,
        symptomKeywords: true,
        image: true,
      },
      take,
      orderBy: { name: "asc" },
    });

    return items.map(
      (item): PublicSearchResult => ({
        id: item.id,
        type: "department",
        title: item.name,
        description: item.triageDescription || item.description,
        url: item.slug ? `/departments/${item.slug}` : "/departments",
        image: item.image,
        score: includesText(item.name, search) ? 30 : 15,
        source: "postgres",
      }),
    );
  }

  private async searchDoctors(search: string, take: number) {
    const items = await prisma.doctorProfile.findMany({
      where: {
        isAvailable: true,
        user: { isActive: true },
        department: { isActive: true },
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { specialization: { contains: search, mode: "insensitive" } },
          { bio: { contains: search, mode: "insensitive" } },
          { user: { fullName: { contains: search, mode: "insensitive" } } },
          { department: { name: { contains: search, mode: "insensitive" } } },
        ],
      },
      select: {
        id: true,
        title: true,
        bio: true,
        specialization: true,
        consultationFee: true,
        user: { select: { fullName: true, avatar: true } },
        department: { select: { name: true } },
      },
      take,
      orderBy: { user: { fullName: "asc" } },
    });

    return items.map(
      (item): PublicSearchResult => ({
        id: item.id,
        type: "doctor",
        title: [item.title, item.user.fullName].filter(Boolean).join(" "),
        description: item.bio || item.specialization,
        url: `/doctors/${item.id}`,
        image: item.user.avatar,
        departmentName: item.department.name,
        price: item.consultationFee,
        score: includesText(item.user.fullName, search) ? 28 : 14,
        source: "postgres",
      }),
    );
  }

  private async searchPackages(search: string, take: number) {
    const items = await prisma.package.findMany({
      where: {
        isActive: true,
        department: { isActive: true },
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { slug: { contains: search, mode: "insensitive" } },
          { summary: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          { department: { name: { contains: search, mode: "insensitive" } } },
          {
            items: {
              some: { name: { contains: search, mode: "insensitive" } },
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        summary: true,
        basePrice: true,
        serviceFee: true,
        isPopular: true,
        department: { select: { name: true } },
        items: { select: { price: true, included: true } },
      },
      take,
      orderBy: [{ isPopular: "desc" }, { basePrice: "asc" }],
    });

    return items.map((item): PublicSearchResult => {
      const includedItemsTotal = item.items
        .filter((packageItem) => packageItem.included)
        .reduce((total, packageItem) => total + packageItem.price, 0);
      const finalPrice =
        (includedItemsTotal || item.basePrice) + item.serviceFee;

      return {
        id: item.id,
        type: "package",
        title: item.name,
        description: item.summary || item.description,
        url: item.slug ? `/packages/${item.slug}` : "/packages",
        departmentName: item.department?.name,
        price: finalPrice,
        score:
          (item.isPopular ? 5 : 0) +
          (includesText(item.name, search) ? 24 : 12),
        source: "postgres",
      };
    });
  }

  private async searchFAQs(search: string, take: number) {
    const items = await prisma.publicFAQ.findMany({
      where: {
        isActive: true,
        OR: [
          { question: { contains: search, mode: "insensitive" } },
          { answer: { contains: search, mode: "insensitive" } },
          { category: { contains: search, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        question: true,
        answer: true,
        category: true,
      },
      take,
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    });

    return items.map(
      (item): PublicSearchResult => ({
        id: item.id,
        type: "faq",
        title: item.question,
        description: item.answer,
        url: item.category
          ? `/faqs?category=${encodeURIComponent(item.category)}`
          : resolveSupportSearchUrl({
              title: item.question,
              description: item.answer,
              fallback: "/faqs",
            }),
        score: includesText(item.question, search) ? 20 : 10,
        source: "postgres",
      }),
    );
  }

  private async searchChatbotFAQs(search: string, take: number) {
    const items = await prisma.chatbotFAQ.findMany({
      where: {
        isActive: true,
        OR: [
          { question: { contains: search, mode: "insensitive" } },
          { answer: { contains: search, mode: "insensitive" } },
          { keywords: { has: search } },
        ],
      },
      select: {
        id: true,
        question: true,
        answer: true,
        keywords: true,
      },
      take,
      orderBy: { updatedAt: "desc" },
    });

    return items.map(
      (item): PublicSearchResult => ({
        id: item.id,
        type: "chatbot_faq",
        title: item.question,
        description: item.answer,
        url: resolveSupportSearchUrl({
          title: item.question,
          description: item.answer,
          keywords: item.keywords,
        }),
        score: includesText(item.question, search) ? 18 : 8,
        source: "postgres",
      }),
    );
  }
}

export default new PublicSearchService();
