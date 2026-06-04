import type { Request, Response, NextFunction } from "express";
import type { InvoiceStatus, PaymentMethod } from "../../generated/prisma/enums.js";
import InvoiceService from "../services/invoice.service.js";
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

export const listInvoicesHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await InvoiceService.list({
      status:
        typeof req.query.status === "string"
          ? (req.query.status as InvoiceStatus)
          : undefined,
      paymentMethod:
        typeof req.query.paymentMethod === "string"
          ? (req.query.paymentMethod as PaymentMethod)
          : undefined,
      patientId: typeof req.query.patientId === "string" ? req.query.patientId : undefined,
      appointmentId:
        typeof req.query.appointmentId === "string"
          ? req.query.appointmentId
          : undefined,
      invoiceCode:
        typeof req.query.invoiceCode === "string"
          ? req.query.invoiceCode
          : undefined,
      barcode: typeof req.query.barcode === "string" ? req.query.barcode : undefined,
      phone: typeof req.query.phone === "string" ? req.query.phone : undefined,
      page: parseNumberQuery(req.query.page),
      limit: parseNumberQuery(req.query.limit),
    });

    return res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const getInvoiceHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const invoice = await InvoiceService.getById(getParam(req.params.id));

    return res.json({ success: true, data: invoice });
  } catch (error) {
    next(error);
  }
};

export const createInvoiceForAppointmentHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const invoice = await InvoiceService.createForAppointment(
      getParam(req.params.appointmentId, "appointmentId"),
      req.body,
    );

    return res.status(201).json({
      success: true,
      message: "Tao hoa don thanh cong",
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

export const updateInvoiceHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const invoice = await InvoiceService.updateFinancials(getParam(req.params.id), req.body);

    return res.json({
      success: true,
      message: "Cap nhat hoa don thanh cong",
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

export const payInvoiceHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const invoice = await InvoiceService.pay(getParam(req.params.id), req.body);

    return res.json({
      success: true,
      message: "Thanh toan hoa don thanh cong",
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

export const cancelInvoiceHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const invoice = await InvoiceService.cancel(getParam(req.params.id));

    return res.json({
      success: true,
      message: "Huy hoa don thanh cong",
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

export const refundInvoiceHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const invoice = await InvoiceService.refund(getParam(req.params.id), req.body);

    return res.json({
      success: true,
      message: "Hoan tien hoa don thanh cong",
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};
