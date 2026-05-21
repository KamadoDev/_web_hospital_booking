import { Router } from "express";

import { validate } from "../middlewares/validate.middleware.js";

import {
  loginHandler,
  verifyOtpHandler,
  meHandler,
  logoutHandler,
} from "../controllers/dashboardAuth.controller.js";

import {
  dashboardLoginSchema,
  dashboardVerifyOtpSchema,
} from "../validations/dashboardAuth.validation.js";

import { authDashboard } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/login", validate(dashboardLoginSchema), loginHandler);

router.post(
  "/verify-otp",
  validate(dashboardVerifyOtpSchema),
  verifyOtpHandler,
);

router.get("/me", authDashboard, meHandler);

router.post("/logout", authDashboard, logoutHandler);

export default router;
