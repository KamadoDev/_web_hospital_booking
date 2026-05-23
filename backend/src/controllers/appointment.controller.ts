import type { Request, Response, NextFunction } from "express";
import type { AppointmentStatus, Role } from "../../generated/prisma/enums.js";
import AppointmentService from "../services/appointment.service.js";
import { AppError } from "../utils/appError.js";

const parseNumberQuery = (value: unknown) => {
  if (typeof value !== "string") return undefined;

  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
};

const getParam = (value: string | string[] | undefined, name = "id") => {
  const param = Array.isArray(value) ? value[0] : value;

  if (!param) {
    throw new AppError(`Thieu ${name}`, 400);
  }

  return param;
};

const getIpAddress = (req: Request) =>
  req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() ||
  req.socket.remoteAddress ||
  "unknown";

const getActor = (req: Request) => {
  if (!req.user?.userId || !req.user.role) {
    throw new AppError("Chua dang nhap", 401);
  }

  return {
    userId: req.user.userId,
    role: req.user.role as Role,
  };
};

export const createAppointmentHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await AppointmentService.create(req.body, getIpAddress(req));

    return res.status(201).json({
      success: true,
      message: "OTP da duoc gui de xac nhan lich hen",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const resendAppointmentOtpHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await AppointmentService.resendOtp(
      getParam(req.params.id),
      getIpAddress(req),
    );

    return res.json({
      success: true,
      message: "OTP da duoc gui lai",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const verifyAppointmentOtpHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const appointment = await AppointmentService.verifyOtp(
      getParam(req.params.id),
      req.body.otp,
    );

    return res.json({
      success: true,
      message: "Xac thuc dat lich thanh cong",
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
};

export const getPublicAppointmentHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const appointment = await AppointmentService.getPublicById(
      getParam(req.params.id),
      typeof req.query.phone === "string" ? req.query.phone : "",
    );

    return res.json({
      success: true,
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
};

export const listDashboardAppointmentsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await AppointmentService.dashboardList(
      {
        status:
          typeof req.query.status === "string"
            ? (req.query.status as AppointmentStatus)
            : undefined,
        doctorId: typeof req.query.doctorId === "string" ? req.query.doctorId : undefined,
        date: typeof req.query.date === "string" ? req.query.date : undefined,
        phone: typeof req.query.phone === "string" ? req.query.phone : undefined,
        bookingCode:
          typeof req.query.bookingCode === "string"
            ? req.query.bookingCode
            : undefined,
        page: parseNumberQuery(req.query.page),
        limit: parseNumberQuery(req.query.limit),
      },
      getActor(req),
    );

    return res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const getDashboardAppointmentHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const appointment = await AppointmentService.dashboardGetById(
      getParam(req.params.id),
      getActor(req),
    );

    return res.json({ success: true, data: appointment });
  } catch (error) {
    next(error);
  }
};

export const confirmDashboardAppointmentHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const appointment = await AppointmentService.confirm(
      getParam(req.params.id),
      getActor(req),
    );

    return res.json({
      success: true,
      message: "Xac nhan lich hen thanh cong",
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
};

export const updateDashboardAppointmentStatusHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const appointment = await AppointmentService.updateStatus(
      getParam(req.params.id),
      req.body.status,
      getActor(req),
    );

    return res.json({
      success: true,
      message: "Cap nhat trang thai lich hen thanh cong",
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
};

export const cancelDashboardAppointmentHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const appointment = await AppointmentService.cancel(
      getParam(req.params.id),
      req.body.reason,
      getActor(req),
    );

    return res.json({
      success: true,
      message: "Huy lich hen thanh cong",
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
};
