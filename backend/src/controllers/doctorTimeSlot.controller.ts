import type { Request, Response, NextFunction } from "express";
import type { Role, TimeSlotStatus } from "../../generated/prisma/enums.js";
import DoctorTimeSlotService from "../services/doctorTimeSlot.service.js";
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

const getParam = (value: string | string[] | undefined, name = "id") => {
  const param = Array.isArray(value) ? value[0] : value;

  if (!param) {
    throw new AppError(`Thieu ${name}`, 400);
  }

  return param;
};

const getActor = (req: Request) => {
  if (!req.user?.userId || !req.user.role) {
    throw new AppError("Chua dang nhap", 401);
  }

  return {
    userId: req.user.userId,
    role: req.user.role as Role,
  };
};

export const listDoctorTimeSlotsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await DoctorTimeSlotService.list(
      {
        doctorId: typeof req.query.doctorId === "string" ? req.query.doctorId : undefined,
        date: typeof req.query.date === "string" ? req.query.date : undefined,
        status: typeof req.query.status === "string" ? (req.query.status as TimeSlotStatus) : undefined,
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

export const getDoctorTimeSlotHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const slot = await DoctorTimeSlotService.getById(
      getParam(req.params.id),
      getActor(req),
    );

    return res.json({ success: true, data: slot });
  } catch (error) {
    next(error);
  }
};

export const generateDoctorTimeSlotsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await DoctorTimeSlotService.generate(req.body);

    return res.status(201).json({
      success: true,
      message: "Tao slot kham thanh cong",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const updateDoctorTimeSlotStatusHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const slot = await DoctorTimeSlotService.updateStatus(
      getParam(req.params.id),
      req.body.status,
      req.body.lockReason,
    );

    return res.json({
      success: true,
      message: "Cap nhat trang thai slot thanh cong",
      data: slot,
    });
  } catch (error) {
    next(error);
  }
};

export const lockDoctorTimeSlotHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const slot = await DoctorTimeSlotService.lock(
      getParam(req.params.id),
      req.body.lockReason,
    );

    return res.json({
      success: true,
      message: "Khoa slot thanh cong",
      data: slot,
    });
  } catch (error) {
    next(error);
  }
};

export const unlockDoctorTimeSlotHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const slot = await DoctorTimeSlotService.unlock(getParam(req.params.id));

    return res.json({
      success: true,
      message: "Mo khoa slot thanh cong",
      data: slot,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteDoctorTimeSlotHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const slot = await DoctorTimeSlotService.delete(getParam(req.params.id));

    return res.json({
      success: true,
      message: "Xoa slot thanh cong",
      data: slot,
    });
  } catch (error) {
    next(error);
  }
};

export const listPublicAvailableSlotsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const slots = await DoctorTimeSlotService.getPublicAvailableSlots(
      getParam(req.params.id, "doctorId"),
      typeof req.query.date === "string" ? req.query.date : "",
    );

    return res.json({
      success: true,
      data: slots,
    });
  } catch (error) {
    next(error);
  }
};
