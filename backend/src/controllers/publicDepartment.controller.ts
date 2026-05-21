import type { Request, Response, NextFunction } from "express";
import PublicDepartmentService from "../services/publicDepartment.service.js";
import { AppError } from "../utils/appError.js";

const getParam = (value: string | string[] | undefined, name: string) => {
  const param = Array.isArray(value) ? value[0] : value;

  if (!param) {
    throw new AppError(`Thieu ${name}`, 400);
  }

  return param;
};

export const listPublicDepartmentsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const departments = await PublicDepartmentService.list({
      search: typeof req.query.search === "string" ? req.query.search : undefined,
    });

    return res.json({
      success: true,
      data: departments,
    });
  } catch (error) {
    next(error);
  }
};

export const getPublicDepartmentHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const department = await PublicDepartmentService.getBySlug(
      getParam(req.params.slug, "slug"),
    );

    return res.json({
      success: true,
      data: department,
    });
  } catch (error) {
    next(error);
  }
};
