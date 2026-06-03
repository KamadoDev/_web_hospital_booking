import { Router } from "express";
import {
  createAppointmentHandler,
  getPublicAppointmentResultHandler,
  getPublicAppointmentHandler,
  lookupPublicAppointmentHandler,
  requestPublicAppointmentCancelOtpHandler,
  requestPublicAppointmentLookupOtpHandler,
  verifyPublicAppointmentCancelHandler,
  resendAppointmentOtpHandler,
  verifyPublicAppointmentLookupOtpHandler,
  verifyAppointmentOtpHandler,
} from "../controllers/appointment.controller.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createAppointmentSchema,
  requestPublicCancelAppointmentOtpSchema,
  requestAppointmentLookupOtpSchema,
  verifyPublicCancelAppointmentSchema,
  verifyAppointmentLookupOtpSchema,
  verifyAppointmentOtpSchema,
} from "../validations/appointment.validation.js";

const router = Router();

router.post("/", validate(createAppointmentSchema), createAppointmentHandler);
router.get("/lookup", lookupPublicAppointmentHandler);
router.get("/lookup/result", getPublicAppointmentResultHandler);
router.post("/lookup/request-otp", validate(requestAppointmentLookupOtpSchema), requestPublicAppointmentLookupOtpHandler);
router.post("/lookup/verify-otp", validate(verifyAppointmentLookupOtpSchema), verifyPublicAppointmentLookupOtpHandler);
router.post("/lookup/cancel/request-otp", validate(requestPublicCancelAppointmentOtpSchema), requestPublicAppointmentCancelOtpHandler);
router.post("/lookup/cancel/verify", validate(verifyPublicCancelAppointmentSchema), verifyPublicAppointmentCancelHandler);
router.get("/:id", getPublicAppointmentHandler);
router.post("/:id/resend-otp", resendAppointmentOtpHandler);
router.post("/:id/verify-otp", validate(verifyAppointmentOtpSchema), verifyAppointmentOtpHandler);

export default router;
