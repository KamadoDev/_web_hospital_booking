import type { Request, Response, NextFunction } from "express";
import type { MedicalResultStatus, Role } from "../../generated/prisma/enums.js";
import MedicalRecordService from "../services/medicalRecord.service.js";
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

const getActor = (req: Request) => {
  if (!req.user?.userId || !req.user.role) {
    throw new AppError("Chua dang nhap", 401);
  }

  return {
    userId: req.user.userId,
    role: req.user.role as Role,
  };
};

export const listMedicalRecordsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await MedicalRecordService.list(
      {
        status:
          typeof req.query.status === "string"
            ? (req.query.status as MedicalResultStatus)
            : undefined,
        doctorId: typeof req.query.doctorId === "string" ? req.query.doctorId : undefined,
        patientId: typeof req.query.patientId === "string" ? req.query.patientId : undefined,
        recordCode:
          typeof req.query.recordCode === "string"
            ? req.query.recordCode
            : undefined,
        date: typeof req.query.date === "string" ? req.query.date : undefined,
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

export const getMedicalRecordHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const record = await MedicalRecordService.getById(
      getParam(req.params.id),
      getActor(req),
    );

    return res.json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
};

export const updateMedicalRecordHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const record = await MedicalRecordService.update(
      getParam(req.params.id),
      req.body,
      getActor(req),
    );

    return res.json({
      success: true,
      message: "Cap nhat ho so kham thanh cong",
      data: record,
    });
  } catch (error) {
    next(error);
  }
};

export const publishMedicalRecordHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const record = await MedicalRecordService.publish(
      getParam(req.params.id),
      getActor(req),
    );

    return res.json({
      success: true,
      message: "Publish ket qua kham thanh cong",
      data: record,
    });
  } catch (error) {
    next(error);
  }
};

export const archiveMedicalRecordHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const record = await MedicalRecordService.archive(
      getParam(req.params.id),
      getActor(req),
    );

    return res.json({
      success: true,
      message: "Luu tru ho so kham thanh cong",
      data: record,
    });
  } catch (error) {
    next(error);
  }
};

export const createLabResultHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const labResult = await MedicalRecordService.createLabResult(
      getParam(req.params.id, "medicalRecordId"),
      req.body,
      getActor(req),
    );

    return res.status(201).json({
      success: true,
      message: "Tao ket qua can lam sang thanh cong",
      data: labResult,
    });
  } catch (error) {
    next(error);
  }
};

export const updateLabResultHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const labResult = await MedicalRecordService.updateLabResult(
      getParam(req.params.id, "medicalRecordId"),
      getParam(req.params.labResultId, "labResultId"),
      req.body,
      getActor(req),
    );

    return res.json({
      success: true,
      message: "Cap nhat ket qua can lam sang thanh cong",
      data: labResult,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteLabResultHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const labResult = await MedicalRecordService.deleteLabResult(
      getParam(req.params.id, "medicalRecordId"),
      getParam(req.params.labResultId, "labResultId"),
      getActor(req),
    );

    return res.json({
      success: true,
      message: "Xoa ket qua can lam sang thanh cong",
      data: labResult,
    });
  } catch (error) {
    next(error);
  }
};
