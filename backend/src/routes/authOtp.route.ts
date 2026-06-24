import { Router } from "express";
import {
  sendOtpHandler,
  verifyOtpHandler,
} from "../controllers/authOtp.controller.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  sendOtpSchema,
  verifyOtpSchema,
} from "../validations/authOtp.validation.js";

const router = Router();

router.post("/send", validate(sendOtpSchema), sendOtpHandler);
router.post("/verify", validate(verifyOtpSchema), verifyOtpHandler);

export default router;
