import { Router } from "express";
import {
  createAppointmentHandler,
  getPublicAppointmentHandler,
  resendAppointmentOtpHandler,
  verifyAppointmentOtpHandler,
} from "../controllers/appointment.controller.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createAppointmentSchema,
  verifyAppointmentOtpSchema,
} from "../validations/appointment.validation.js";

const router = Router();

router.post("/", validate(createAppointmentSchema), createAppointmentHandler);
router.get("/:id", getPublicAppointmentHandler);
router.post("/:id/resend-otp", resendAppointmentOtpHandler);
router.post("/:id/verify-otp", validate(verifyAppointmentOtpSchema), verifyAppointmentOtpHandler);

export default router;
