import { Router } from "express";
import {
  cancelScheduleChangeRequestHandler,
  createScheduleChangeRequestHandler,
  listScheduleChangeRequestsHandler,
  reviewScheduleChangeRequestHandler,
} from "../controllers/scheduleChangeRequest.controller.js";
import { authDashboard, requireRole } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createScheduleChangeRequestSchema,
  reviewScheduleChangeRequestSchema,
} from "../validations/scheduleChangeRequest.validation.js";

const router = Router();
router.use(authDashboard);
router.get(
  "/",
  requireRole("ADMIN", "STAFF", "DOCTOR"),
  listScheduleChangeRequestsHandler,
);
router.post(
  "/",
  requireRole("DOCTOR"),
  validate(createScheduleChangeRequestSchema),
  createScheduleChangeRequestHandler,
);
router.patch(
  "/:id/review",
  requireRole("ADMIN", "STAFF"),
  validate(reviewScheduleChangeRequestSchema),
  reviewScheduleChangeRequestHandler,
);
router.patch(
  "/:id/cancel",
  requireRole("DOCTOR"),
  cancelScheduleChangeRequestHandler,
);

export default router;
