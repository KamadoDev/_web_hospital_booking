import type { Request, Response, NextFunction } from "express";
import type { ConsultationStatus } from "../../generated/prisma/enums.js";
import ConsultationRequestService from "../services/consultationRequest.service.js";
import { AppError } from "../utils/appError.js";

const getParam = (value: string | string[] | undefined) => {
  const param = Array.isArray(value) ? value[0] : value;

  if (!param) {
    throw new AppError("Thiếu id", 400);
  }

  return param;
};

const parseStatus = (value: unknown) => {
  if (typeof value !== "string" || !value) return undefined;
  if (["NEW", "CONTACTED", "CANCELLED", "COMPLETED"].includes(value)) {
    return value as ConsultationStatus;
  }
  return undefined;
};

export const createPublicConsultationRequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const request = await ConsultationRequestService.create(req.body);

    return res.status(201).json({
      success: true,
      message: "Đã gửi yêu cầu tư vấn thành công",
      data: request,
    });
  } catch (error) {
    next(error);
  }
};

export const listDashboardConsultationRequestsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await ConsultationRequestService.list({
      status: parseStatus(req.query.status),
      keyword: typeof req.query.keyword === "string" ? req.query.keyword : undefined,
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
    });

    return res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const getDashboardConsultationRequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const request = await ConsultationRequestService.getById(getParam(req.params.id));

    return res.json({ success: true, data: request });
  } catch (error) {
    next(error);
  }
};

export const updateDashboardConsultationRequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const request = await ConsultationRequestService.update(getParam(req.params.id), req.body);

    return res.json({
      success: true,
      message: "Cập nhật yêu cầu tư vấn thành công",
      data: request,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteDashboardConsultationRequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const request = await ConsultationRequestService.delete(getParam(req.params.id));

    return res.json({
      success: true,
      message: "Xóa yêu cầu tư vấn thành công",
      data: request,
    });
  } catch (error) {
    next(error);
  }
};
