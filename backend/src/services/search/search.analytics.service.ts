import { prisma } from "../../config/prisma.js";
import type { SearchDocumentType } from "./search.types.js";
import { SEARCH_DOCUMENT_TYPES } from "./search.types.js";
import { normalizeSearchText } from "./search.urls.js";

type TrackSearchInput = {
  keyword?: string;
  type?: SearchDocumentType | "all";
  source?: string;
  resultCount?: number;
};

const DEFAULT_SUGGESTIONS = ["Tim mạch", "Tổng quát", "BHYT", "Thanh toán", "Quên mã lịch"];

const normalizeKeyword = (value?: string) =>
  (value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);

const normalizeType = (value?: string) =>
  value === "all" || SEARCH_DOCUMENT_TYPES.includes(value as SearchDocumentType)
    ? value
    : "all";

class SearchAnalyticsService {
  async track(input: TrackSearchInput) {
    const keyword = normalizeKeyword(input.keyword);
    if (keyword.length < 2) {
      return { tracked: false };
    }

    const resultCount = Math.max(0, Math.min(input.resultCount || 0, 10000));

    await prisma.searchAnalyticsLog.create({
      data: {
        keyword,
        normalized: normalizeSearchText(keyword),
        type: normalizeType(input.type),
        source: input.source?.slice(0, 30) || null,
        resultCount,
        hasResults: resultCount > 0,
      },
    });

    return { tracked: true };
  }

  async getSuggestions(limit = 5) {
    const take = Math.min(Math.max(limit, 1), 8);
    const groups = await prisma.searchAnalyticsLog.groupBy({
      by: ["normalized", "keyword"],
      where: {
        hasResults: true,
      },
      _count: { _all: true },
      orderBy: { _count: { normalized: "desc" } },
      take: 20,
    });

    const seen = new Set<string>();
    const dynamicKeywords: string[] = [];

    for (const item of groups) {
      if (seen.has(item.normalized)) continue;
      seen.add(item.normalized);
      dynamicKeywords.push(item.keyword);
      if (dynamicKeywords.length >= take) break;
    }

    const merged = [...dynamicKeywords, ...DEFAULT_SUGGESTIONS].filter((keyword) => {
      const normalized = normalizeSearchText(keyword);
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });

    return {
      items: [...dynamicKeywords, ...merged].slice(0, take),
      source: dynamicKeywords.length ? "analytics" : "default",
    };
  }
}

export default new SearchAnalyticsService();
