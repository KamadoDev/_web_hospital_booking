import { Request, Response, NextFunction } from "express";

export const errorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error("ERROR:", err);

  res.status(500).json({
    success: false,
    message: err.message || "Internal server error",
  });
};