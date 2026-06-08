import type { Request, Response, NextFunction } from "express";
import PublicDoctorService from "../services/publicDoctor.service.js";
import { AppError } from "../utils/appError.js";

const getParam = (value: string | string[] | undefined, name: string) => {
  const param = Array.isArray(value) ? value[0] : value;

  if (!param) {
    throw new AppError(`Thiếu ${name}`, 400);
  }

  return param;
};

export const listPublicDoctorsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const doctors = await PublicDoctorService.list({
      search: typeof req.query.search === "string" ? req.query.search : undefined,
      departmentSlug:
        typeof req.query.departmentSlug === "string"
          ? req.query.departmentSlug
          : undefined,
      departmentId:
        typeof req.query.departmentId === "string"
          ? req.query.departmentId
          : undefined,
    });

    return res.json({
      success: true,
      data: doctors,
    });
  } catch (error) {
    next(error);
  }
};

export const getPublicDoctorHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const doctor = await PublicDoctorService.getById(getParam(req.params.id, "id"));

    return res.json({
      success: true,
      data: doctor,
    });
  } catch (error) {
    next(error);
  }
};
