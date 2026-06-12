import { Router } from "express";

import { validate } from "../middlewares/validate.middleware.js";

import {
  loginHandler,
  verifyOtpHandler,
  meHandler,
  refreshHandler,
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

router.post("/refresh", refreshHandler);

router.get("/me", authDashboard, meHandler);

router.post("/logout", logoutHandler);

export default router;
