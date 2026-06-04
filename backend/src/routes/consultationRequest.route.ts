import { Router } from "express";
import {
  createPublicConsultationRequestHandler,
  deleteDashboardConsultationRequestHandler,
  getDashboardConsultationRequestHandler,
  listDashboardConsultationRequestsHandler,
  updateDashboardConsultationRequestHandler,
} from "../controllers/consultationRequest.controller.js";
import { authDashboard, requireRole } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createConsultationRequestSchema,
  updateConsultationRequestSchema,
} from "../validations/consultationRequest.validation.js";

export const publicConsultationRequestRouter = Router();
publicConsultationRequestRouter.post(
  "/",
  validate(createConsultationRequestSchema),
  createPublicConsultationRequestHandler,
);

export const dashboardConsultationRequestRouter = Router();
dashboardConsultationRequestRouter.use(authDashboard);
dashboardConsultationRequestRouter.get(
  "/",
  requireRole("ADMIN", "STAFF"),
  listDashboardConsultationRequestsHandler,
);
dashboardConsultationRequestRouter.get(
  "/:id",
  requireRole("ADMIN", "STAFF"),
  getDashboardConsultationRequestHandler,
);
dashboardConsultationRequestRouter.patch(
  "/:id",
  requireRole("ADMIN", "STAFF"),
  validate(updateConsultationRequestSchema),
  updateDashboardConsultationRequestHandler,
);
dashboardConsultationRequestRouter.delete(
  "/:id",
  requireRole("ADMIN"),
  deleteDashboardConsultationRequestHandler,
);
