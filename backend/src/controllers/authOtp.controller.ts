import type { Request, Response, NextFunction } from "express";
import AuthOtpService from "../services/authOtp.service.js";
import type { OtpChannel, OtpPurpose } from "../../generated/prisma/enums.js";

const resolveOtpTarget = (body: {
  phone?: string;
  email?: string;
  target?: string;
  channel?: OtpChannel;
}) => body.target || (body.channel === "EMAIL" ? body.email : body.phone) || "";

export const sendOtpHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { purpose, channel } = req.body;
    const target = resolveOtpTarget(req.body);
    const ipAddress =
      req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "unknown";

    const result = await AuthOtpService.sendOtp(
      target,
      purpose as OtpPurpose,
      ipAddress,
      { channel },
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
    const { otp, purpose, channel } = req.body;
    const target = resolveOtpTarget(req.body);
    const ipAddress =
      req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "unknown";

    const result = await AuthOtpService.verifyOtp(
      target,
      otp,
      purpose as OtpPurpose,
      { ipAddress, channel },
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
