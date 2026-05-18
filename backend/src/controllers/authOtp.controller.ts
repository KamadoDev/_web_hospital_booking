import type { Request, Response, NextFunction } from "express";
import AuthOtpService from "../services/authOtp.service.js";
import type { OtpPurpose } from "../../generated/prisma/enums.js";

export const sendOtpHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    console.log("REQUEST BODY:", req.body);
    const { phone, purpose } = req.body;
    const ipAddress =
      req.headers["x-forwarded-for"]?.toString() ||
      req.socket.remoteAddress ||
      "unknown";

    console.log("IP address:", ipAddress);

    const result = await AuthOtpService.sendOtp(
      phone,
      purpose as OtpPurpose,
      ipAddress,
    );

    return res.status(200).json({
      success: true,
      message: "Gửi OTP thành công",
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
      message: "Xác thực OTP thành công",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
