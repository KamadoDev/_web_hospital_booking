import type { Request, Response, NextFunction } from "express";
import type { PrescriptionStatus, Role } from "../../generated/prisma/enums.js";
import PrescriptionService from "../services/prescription.service.js";
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

export const listPrescriptionsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await PrescriptionService.list(
      {
        status:
          typeof req.query.status === "string"
            ? (req.query.status as PrescriptionStatus)
            : undefined,
        doctorId: typeof req.query.doctorId === "string" ? req.query.doctorId : undefined,
        patientId: typeof req.query.patientId === "string" ? req.query.patientId : undefined,
        medicalRecordId:
          typeof req.query.medicalRecordId === "string"
            ? req.query.medicalRecordId
            : undefined,
        appointmentId:
          typeof req.query.appointmentId === "string"
            ? req.query.appointmentId
            : undefined,
        prescriptionCode:
          typeof req.query.prescriptionCode === "string"
            ? req.query.prescriptionCode
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

export const getPrescriptionHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const prescription = await PrescriptionService.getById(
      getParam(req.params.id),
      getActor(req),
    );

    return res.json({ success: true, data: prescription });
  } catch (error) {
    next(error);
  }
};

export const createPrescriptionHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const prescription = await PrescriptionService.createForMedicalRecord(
      getParam(req.params.id, "medicalRecordId"),
      req.body,
      getActor(req),
    );

    return res.status(201).json({
      success: true,
      message: "Tao don thuoc thanh cong",
      data: prescription,
    });
  } catch (error) {
    next(error);
  }
};

export const updatePrescriptionHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const prescription = await PrescriptionService.update(
      getParam(req.params.id),
      req.body,
      getActor(req),
    );

    return res.json({
      success: true,
      message: "Cap nhat don thuoc thanh cong",
      data: prescription,
    });
  } catch (error) {
    next(error);
  }
};

export const issuePrescriptionHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const prescription = await PrescriptionService.issue(
      getParam(req.params.id),
      getActor(req),
    );

    return res.json({
      success: true,
      message: "Phat hanh don thuoc thanh cong",
      data: prescription,
    });
  } catch (error) {
    next(error);
  }
};

export const cancelPrescriptionHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const prescription = await PrescriptionService.cancel(
      getParam(req.params.id),
      getActor(req),
    );

    return res.json({
      success: true,
      message: "Huy don thuoc thanh cong",
      data: prescription,
    });
  } catch (error) {
    next(error);
  }
};

export const createPrescriptionItemHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const prescription = await PrescriptionService.createItem(
      getParam(req.params.id, "prescriptionId"),
      req.body,
      getActor(req),
    );

    return res.status(201).json({
      success: true,
      message: "Them thuoc vao don thanh cong",
      data: prescription,
    });
  } catch (error) {
    next(error);
  }
};

export const updatePrescriptionItemHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const prescription = await PrescriptionService.updateItem(
      getParam(req.params.id, "prescriptionId"),
      getParam(req.params.itemId, "itemId"),
      req.body,
      getActor(req),
    );

    return res.json({
      success: true,
      message: "Cap nhat thuoc trong don thanh cong",
      data: prescription,
    });
  } catch (error) {
    next(error);
  }
};

export const deletePrescriptionItemHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const item = await PrescriptionService.deleteItem(
      getParam(req.params.id, "prescriptionId"),
      getParam(req.params.itemId, "itemId"),
      getActor(req),
    );

    return res.json({
      success: true,
      message: "Xoa thuoc khoi don thanh cong",
      data: item,
    });
  } catch (error) {
    next(error);
  }
};
