import { prisma } from "../../../config/prisma.js";
import PublicSearchService from "../../search/search.service.js";
import type { ChatBookingDraft } from "../chatbot.types.js";
import { foldVietnamese, hasPhrase } from "../rules/text-normalizer.js";

export type TriageRecommendation = {
  departmentId: string;
  departmentName: string;
  departmentSlug: string | null;
  description: string | null;
  triageDescription: string | null;
  confidence: number;
  matched: boolean;
  fallback: boolean;
};

const ignoredTokens = new Set([
  "toi",
  "minh",
  "bi",
  "dang",
  "thay",
  "vung",
  "cho",
  "nay",
  "qua",
  "lam",
  "rat",
]);

const tokensOf = (value: string) =>
  new Set(
    (foldVietnamese(value).match(/[a-z0-9]+/g) || []).filter(
      (token) => token.length >= 2 && !ignoredTokens.has(token),
    ),
  );

const overlapCount = (source: Set<string>, target: Set<string>) =>
  Array.from(source).filter((token) => target.has(token)).length;

const buildSearchText = (draft: ChatBookingDraft) =>
  [
    ...(draft.symptoms || []),
    ...(draft.bodyParts || []),
    ...(draft.associatedSymptoms || []),
    draft.symptomDuration,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

class TriageRepository {
  async findRecommendation(
    draft: ChatBookingDraft,
  ): Promise<TriageRecommendation | null> {
    const query = buildSearchText(draft);
    if (!query) return null;

    const searchResult = await PublicSearchService.search({
      q: query,
      type: "department",
      limit: 10,
    });
    const searchScores = new Map(
      searchResult.items.map((item) => [item.id, item.score || 0]),
    );

    const departments = await prisma.department.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        symptomKeywords: true,
        triageDescription: true,
        isTriageFallback: true,
      },
      orderBy: [{ isTriageFallback: "asc" }, { name: "asc" }],
      take: 100,
    });

    const queryTokens = tokensOf(query);
    const foldedQuery = foldVietnamese(query);
    const ranked = departments
      .filter((department) => !department.isTriageFallback)
      .map((department) => {
        const keywordPhraseMatch = department.symptomKeywords.some(
          (keyword) => hasPhrase(foldedQuery, foldVietnamese(keyword)),
        );
        const keywordOverlap = overlapCount(
          queryTokens,
          tokensOf(department.symptomKeywords.join(" ")),
        );
        const descriptionOverlap = overlapCount(
          queryTokens,
          tokensOf(
            `${department.triageDescription || ""} ${department.description || ""}`,
          ),
        );
        const nameOverlap = overlapCount(queryTokens, tokensOf(department.name));
        const searchScore = searchScores.get(department.id) || 0;
        const score =
          (keywordPhraseMatch ? 10 : 0) +
          keywordOverlap * 3 +
          descriptionOverlap * 1.25 +
          nameOverlap * 2 +
          Math.min(Math.max(searchScore, 0), 30) / 10;

        return {
          department,
          score,
          relevant:
            keywordPhraseMatch ||
            keywordOverlap > 0 ||
            descriptionOverlap >= 2 ||
            nameOverlap > 0,
        };
      })
      .filter((candidate) => candidate.relevant)
      .sort((a, b) => b.score - a.score);

    const best = ranked[0];
    if (best) {
      return {
        departmentId: best.department.id,
        departmentName: best.department.name,
        departmentSlug: best.department.slug,
        description: best.department.description,
        triageDescription: best.department.triageDescription,
        confidence: Math.min(0.95, Math.max(0.58, 0.5 + best.score / 25)),
        matched: true,
        fallback: false,
      };
    }

    const fallback = departments.find(
      (department) => department.isTriageFallback,
    );
    if (!fallback) return null;

    return {
      departmentId: fallback.id,
      departmentName: fallback.name,
      departmentSlug: fallback.slug,
      description: fallback.description,
      triageDescription: fallback.triageDescription,
      confidence: 0.45,
      matched: false,
      fallback: true,
    };
  }
}

export default new TriageRepository();
