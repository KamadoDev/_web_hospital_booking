import { Request, Response, NextFunction } from "express";
import DashboardAuthService from "../services/dashboardAuth.service.js";

const dashboardCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export const loginHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const ipAddress =
      req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "unknown";

    const { phone, password } = req.body;

    const result = await DashboardAuthService.login(phone, password, ipAddress);

    return res.json({
      success: true,
      message: "OTP da duoc gui",
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
    const { challengeId, otp } = req.body;

    const result = await DashboardAuthService.verifyOtp(challengeId, otp);

    res.cookie("dashboard_token", result.token, {
      ...dashboardCookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      success: true,
      message: "Dang nhap thanh cong",
      data: {
        user: result.user,
        redirectPath: result.redirectPath,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const meHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Chua dang nhap",
      });
    }

    const user = await DashboardAuthService.getCurrentUser(userId);

    return res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const logoutHandler = (req: Request, res: Response) => {
  res.clearCookie("dashboard_token", dashboardCookieOptions);

  return res.json({
    success: true,
    message: "Dang xuat thanh cong",
  });
};
