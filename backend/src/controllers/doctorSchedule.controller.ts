import type { Request, Response, NextFunction } from "express";
import type { Role } from "../../generated/prisma/enums.js";
import DoctorScheduleService from "../services/doctorSchedule.service.js";
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

const getActor = (req: Request) => {
  if (!req.user?.userId || !req.user.role) {
    throw new AppError("Chưa đăng nhập", 401);
  }

  return {
    userId: req.user.userId,
    role: req.user.role as Role,
  };
};

export const listDoctorSchedulesHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await DoctorScheduleService.list(
      {
        doctorId: typeof req.query.doctorId === "string" ? req.query.doctorId : undefined,
        dayOfWeek: parseNumberQuery(req.query.dayOfWeek),
        isActive: parseBooleanQuery(req.query.isActive),
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

export const getDoctorScheduleHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schedule = await DoctorScheduleService.getById(
      getParam(req.params.id),
      getActor(req),
    );

    return res.json({ success: true, data: schedule });
  } catch (error) {
    next(error);
  }
};

export const createDoctorScheduleHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schedule = await DoctorScheduleService.create(req.body);

    return res.status(201).json({
      success: true,
      message: "Tạo lịch làm việc thành công",
      data: schedule,
    });
  } catch (error) {
    next(error);
  }
};

export const updateDoctorScheduleHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schedule = await DoctorScheduleService.update(
      getParam(req.params.id),
      req.body,
    );

    return res.json({
      success: true,
      message: "Cập nhật lịch làm việc thành công",
      data: schedule,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteDoctorScheduleHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schedule = await DoctorScheduleService.delete(getParam(req.params.id));

    return res.json({
      success: true,
      message: "Xóa lịch làm việc thành công",
      data: schedule,
    });
  } catch (error) {
    next(error);
  }
};
