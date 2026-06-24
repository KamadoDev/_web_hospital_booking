import type { Request, Response, NextFunction } from "express";
import DoctorService from "../services/doctor.service.js";
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

export const listDoctorsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await DoctorService.list({
      search:
        typeof req.query.search === "string" ? req.query.search : undefined,
      departmentId:
        typeof req.query.departmentId === "string"
          ? req.query.departmentId
          : undefined,
      isAvailable: parseBooleanQuery(req.query.isAvailable),
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

export const getDoctorHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const doctor = await DoctorService.getById(getParam(req.params.id));

    return res.json({
      success: true,
      data: doctor,
    });
  } catch (error) {
    next(error);
  }
};

export const createDoctorHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const doctor = await DoctorService.create(req.body);

    return res.status(201).json({
      success: true,
      message: "Tạo hồ sơ bác sĩ thành công",
      data: doctor,
    });
  } catch (error) {
    next(error);
  }
};

export const updateDoctorHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const doctor = await DoctorService.update(
      getParam(req.params.id),
      req.body,
    );

    return res.json({
      success: true,
      message: "Cập nhật hồ sơ bác sĩ thành công",
      data: doctor,
    });
  } catch (error) {
    next(error);
  }
};

export const updateDoctorAvailabilityHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const doctor = await DoctorService.updateAvailability(
      getParam(req.params.id),
      req.body.isAvailable,
    );

    return res.json({
      success: true,
      message: "Cập nhật trạng thái bác sĩ thành công",
      data: doctor,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteDoctorHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const doctor = await DoctorService.delete(getParam(req.params.id));

    return res.json({
      success: true,
      message: "Xóa hồ sơ bác sĩ thành công",
      data: doctor,
    });
  } catch (error) {
    next(error);
  }
};
