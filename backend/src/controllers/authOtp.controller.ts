import type { Request, Response, NextFunction } from "express";
import AuthOtpService from "../services/authOtp.service.js";
import type { OtpPurpose } from "../../generated/prisma/enums.js";

export const sendOtpHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { phone, purpose } = req.body;
    const ipAddress =
      req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "unknown";

    const result = await AuthOtpService.sendOtp(
      phone,
      purpose as OtpPurpose,
      ipAddress,
    );

    return res.status(200).json({
      success: true,
      message: "Gui OTP thanh cong",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const verifyOtpHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { phone, otp, purpose } = req.body;

    const result = await AuthOtpService.verifyOtp(
      phone,
      otp,
      purpose as OtpPurpose,
    );

    return res.status(200).json({
      success: true,
      message: "Xac thuc OTP thanh cong",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
