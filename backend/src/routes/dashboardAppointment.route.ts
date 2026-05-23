import { Router } from "express";
import {
  cancelDashboardAppointmentHandler,
  confirmDashboardAppointmentHandler,
  getDashboardAppointmentHandler,
  listDashboardAppointmentsHandler,
  updateDashboardAppointmentStatusHandler,
} from "../controllers/appointment.controller.js";
import { authDashboard, requireRole } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  cancelAppointmentSchema,
  updateAppointmentStatusSchema,
} from "../validations/appointment.validation.js";

const router = Router();

router.use(authDashboard);

router.get("/", requireRole("ADMIN", "STAFF", "DOCTOR"), listDashboardAppointmentsHandler);
router.get("/:id", requireRole("ADMIN", "STAFF", "DOCTOR"), getDashboardAppointmentHandler);
router.patch("/:id/confirm", requireRole("ADMIN", "STAFF"), confirmDashboardAppointmentHandler);
router.patch(
  "/:id/status",
  requireRole("ADMIN", "STAFF", "DOCTOR"),
  validate(updateAppointmentStatusSchema),
  updateDashboardAppointmentStatusHandler,
);
router.patch(
  "/:id/cancel",
  requireRole("ADMIN", "STAFF", "DOCTOR"),
  validate(cancelAppointmentSchema),
  cancelDashboardAppointmentHandler,
);

export default router;
