import { Router } from "express";
import {
  createDashboardFAQHandler,
  deleteDashboardFAQHandler,
  getDashboardFAQHandler,
  listDashboardFAQsHandler,
  listPublicFAQsHandler,
  updateDashboardFAQHandler,
} from "../controllers/publicFAQ.controller.js";
import { authDashboard, requireRole } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createPublicFAQSchema,
  updatePublicFAQSchema,
} from "../validations/siteConfig.validation.js";

export const publicFAQRouter = Router();
publicFAQRouter.get("/", listPublicFAQsHandler);

export const dashboardFAQRouter = Router();
dashboardFAQRouter.use(authDashboard);
dashboardFAQRouter.get(
  "/",
  requireRole("ADMIN", "STAFF"),
  listDashboardFAQsHandler,
);
dashboardFAQRouter.get(
  "/:id",
  requireRole("ADMIN", "STAFF"),
  getDashboardFAQHandler,
);
dashboardFAQRouter.post(
  "/",
  requireRole("ADMIN", "STAFF"),
  validate(createPublicFAQSchema),
  createDashboardFAQHandler,
);
dashboardFAQRouter.patch(
  "/:id",
  requireRole("ADMIN", "STAFF"),
  validate(updatePublicFAQSchema),
  updateDashboardFAQHandler,
);
dashboardFAQRouter.delete(
  "/:id",
  requireRole("ADMIN"),
  deleteDashboardFAQHandler,
);
