import { NextFunction, Request, Response } from "express";
import type { Role } from "../../generated/prisma/enums.js";
import { prisma } from "../config/prisma.js";
import { verifyToken } from "../utils/jwt.js";

const DASHBOARD_ROLES: Role[] = ["ADMIN", "DOCTOR", "STAFF"];

export const authDashboard = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const token = req.cookies.dashboard_token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Chua dang nhap",
      });
    }

    const payload = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: {
        id: payload.userId,
      },
      select: {
        id: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive || !DASHBOARD_ROLES.includes(user.role)) {
      return res.status(401).json({
        success: false,
        message: "Phien dang nhap khong hop le",
      });
    }

    req.user = {
      ...payload,
      userId: user.id,
      role: user.role,
    };

    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Token khong hop le",
    });
  }
};

export const requireRole =
  (...roles: Role[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user?.role;

    if (!userRole || !roles.includes(userRole as Role)) {
      return res.status(403).json({
        success: false,
        message: "Khong co quyen truy cap",
      });
    }

    next();
  };
