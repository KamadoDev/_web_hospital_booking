import { Router } from "express";
import { createPublicAppointmentReviewHandler, getPublicAppointmentReviewHandler, requestPublicAppointmentReviewOtpHandler } from "../controllers/review.controller.js";
import { validate } from "../middlewares/validate.middleware.js";
import { createAppointmentReviewSchema, requestAppointmentReviewOtpSchema } from "../validations/review.validation.js";

const router = Router();

router.get("/:id/review", getPublicAppointmentReviewHandler);
router.post("/:id/review/request-otp", validate(requestAppointmentReviewOtpSchema), requestPublicAppointmentReviewOtpHandler);
router.post("/:id/review", validate(createAppointmentReviewSchema), createPublicAppointmentReviewHandler);

export default router;
