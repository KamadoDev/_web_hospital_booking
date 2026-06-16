import type { NextFunction, Request, Response } from "express";
import SearchAnalyticsService from "../services/search/search.analytics.service.js";
import { SEARCH_DOCUMENT_TYPES, type SearchDocumentType } from "../services/search/search.types.js";
import { AppError } from "../utils/appError.js";

const parseType = (value: unknown): SearchDocumentType | "all" | undefined => {
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new AppError("Loại tìm kiếm không hợp lệ", 400);
  if (value === "all") return "all";
  if (SEARCH_DOCUMENT_TYPES.includes(value as SearchDocumentType)) return value as SearchDocumentType;
  throw new AppError("Loại tìm kiếm không hợp lệ", 400);
};

const parseResultCount = (value: unknown) => {
  if (value === undefined) return undefined;
  const count = Number(value);
  if (!Number.isFinite(count) || count < 0) throw new AppError("Số lượng kết quả không hợp lệ", 400);
  return Math.floor(count);
};

export const trackSearchAnalyticsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await SearchAnalyticsService.track({
      keyword: typeof req.body.keyword === "string" ? req.body.keyword : undefined,
      type: parseType(req.body.type),
      source: typeof req.body.source === "string" ? req.body.source : undefined,
      resultCount: parseResultCount(req.body.resultCount),
    });

    return res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getSearchSuggestionsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 5;
    const data = await SearchAnalyticsService.getSuggestions(Number.isFinite(limit) ? limit : 5);

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};
