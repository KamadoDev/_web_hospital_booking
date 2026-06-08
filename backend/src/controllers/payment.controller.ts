import type { Request, Response, NextFunction } from "express";
import PaymentService from "../services/payment.service.js";
import { AppError } from "../utils/appError.js";

const getParam = (value: string | string[] | undefined, name = "id") => {
  const param = Array.isArray(value) ? value[0] : value;

  if (!param) {
    throw new AppError(`Thiếu ${name}`, 400);
  }

  return param;
};

export const createPaymentTransactionHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const transaction = await PaymentService.createForInvoice(
      getParam(req.params.invoiceId, "invoiceId"),
      req.body,
    );

    return res.status(201).json({
      success: true,
      message: "Tạo giao dịch thanh toán thành công",
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
};

export const getPaymentTransactionHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const transaction = await PaymentService.getById(getParam(req.params.id));

    return res.json({ success: true, data: transaction });
  } catch (error) {
    next(error);
  }
};

export const cancelPaymentTransactionHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const transaction = await PaymentService.cancel(getParam(req.params.id));

    return res.json({
      success: true,
      message: "Hủy giao dịch thanh toán thành công",
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
};

export const getMockCheckoutHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const transaction = await PaymentService.getByTransactionCode(
      getParam(req.params.transactionCode, "transactionCode"),
    );

    return res.json({
      success: true,
      message: "Mock checkout. Gọi endpoint success hoặc fail để giả lập kết quả thanh toán.",
      data: {
        transaction,
        successUrl: `/api/payments/mock/${transaction.transactionCode}/success`,
        failUrl: `/api/payments/mock/${transaction.transactionCode}/fail`,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const mockPaymentSuccessHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const transaction = await PaymentService.markMockSuccess(
      getParam(req.params.transactionCode, "transactionCode"),
    );

    return res.json({
      success: true,
      message: "Giả lập thanh toán thành công",
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
};

export const mockPaymentFailHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const transaction = await PaymentService.markMockFailed(
      getParam(req.params.transactionCode, "transactionCode"),
    );

    return res.json({
      success: true,
      message: "Giả lập thanh toán thất bại",
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
};

export const paymentProviderWebhookHandler = async (
  req: Request,
  res: Response,
) => {
  return res.status(501).json({
    success: false,
    message: "Webhook provider chưa được tích hợp. Cần thêm adapter và xác thực chữ ký trước khi cập nhật thanh toán.",
  });
};

export const paymentProviderReturnHandler = async (
  req: Request,
  res: Response,
) => {
  return res.status(501).json({
    success: false,
    message: "Return URL provider chưa được tích hợp. Cần thêm adapter và xác thực chữ ký trước khi cập nhật thanh toán.",
  });
};
