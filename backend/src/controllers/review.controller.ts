import type { NextFunction, Request, Response } from "express";
import ReviewService from "../services/review.service.js";
import { AppError } from "../utils/appError.js";

const getAppointmentId = (req: Request) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!id) throw new AppError("Thiếu mã lịch hẹn", 400);
  return id;
};

const getIpAddress = (req: Request) => req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";

export const getPublicAppointmentReviewHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await ReviewService.getPublicReview({ appointmentId: getAppointmentId(req), bookingCode: typeof req.query.bookingCode === "string" ? req.query.bookingCode : undefined, phone: typeof req.query.phone === "string" ? req.query.phone : undefined });
    return res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const requestPublicAppointmentReviewOtpHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await ReviewService.requestOtp({ appointmentId: getAppointmentId(req), bookingCode: req.body.bookingCode, phone: req.body.phone, ipAddress: getIpAddress(req) });
    return res.json({ success: true, message: "OTP đánh giá đã được gửi", data });
  } catch (error) { next(error); }
};

export const createPublicAppointmentReviewHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await ReviewService.create({ appointmentId: getAppointmentId(req), bookingCode: req.body.bookingCode, phone: req.body.phone, otp: req.body.otp, doctorRating: req.body.doctorRating, serviceRating: req.body.serviceRating, facilityRating: req.body.facilityRating, comment: req.body.comment, ipAddress: getIpAddress(req) });
    return res.status(201).json({ success: true, message: "Cảm ơn bạn đã gửi đánh giá", data });
  } catch (error) { next(error); }
};
