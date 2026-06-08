import type { Request, Response, NextFunction } from "express";
import DashboardChatbotFAQService from "../services/dashboardChatbotFaq.service.js";
import { AppError } from "../utils/appError.js";

const parseBooleanQuery = (value: unknown) => {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
};

const parseNumberQuery = (value: unknown) => {
  if (typeof value !== "string") return undefined;

  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
};

const getParam = (value: string | string[] | undefined) => {
  const param = Array.isArray(value) ? value[0] : value;

  if (!param) {
    throw new AppError("Thiếu id", 400);
  }

  return param;
};

export const listDashboardChatbotFAQsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await DashboardChatbotFAQService.list({
      search: typeof req.query.search === "string" ? req.query.search : undefined,
      isActive: parseBooleanQuery(req.query.isActive),
      page: parseNumberQuery(req.query.page),
      limit: parseNumberQuery(req.query.limit),
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getDashboardChatbotFAQHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const faq = await DashboardChatbotFAQService.getById(getParam(req.params.id));

    return res.json({
      success: true,
      data: faq,
    });
  } catch (error) {
    next(error);
  }
};

export const createDashboardChatbotFAQHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const faq = await DashboardChatbotFAQService.create(req.body);

    return res.status(201).json({
      success: true,
      message: "Tạo FAQ chatbot thành công",
      data: faq,
    });
  } catch (error) {
    next(error);
  }
};

export const updateDashboardChatbotFAQHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const faq = await DashboardChatbotFAQService.update(
      getParam(req.params.id),
      req.body,
    );

    return res.json({
      success: true,
      message: "Cập nhật FAQ chatbot thành công",
      data: faq,
    });
  } catch (error) {
    next(error);
  }
};

export const updateDashboardChatbotFAQStatusHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const faq = await DashboardChatbotFAQService.updateStatus(
      getParam(req.params.id),
      req.body.isActive,
    );

    return res.json({
      success: true,
      message: "Cập nhật trạng thái FAQ chatbot thành công",
      data: faq,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteDashboardChatbotFAQHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const faq = await DashboardChatbotFAQService.delete(getParam(req.params.id));

    return res.json({
      success: true,
      message: "Xóa FAQ chatbot thành công",
      data: faq,
    });
  } catch (error) {
    next(error);
  }
};
