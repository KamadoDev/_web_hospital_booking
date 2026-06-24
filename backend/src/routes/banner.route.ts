import { Router } from "express";
import {
  createDashboardBannerHandler,
  deleteDashboardBannerHandler,
  getDashboardBannerHandler,
  listDashboardBannersHandler,
  listPublicBannersHandler,
  updateDashboardBannerHandler,
} from "../controllers/banner.controller.js";
import { authDashboard, requireRole } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createBannerSchema,
  updateBannerSchema,
} from "../validations/siteConfig.validation.js";

export const publicBannerRouter = Router();
publicBannerRouter.get("/", listPublicBannersHandler);

export const dashboardBannerRouter = Router();
dashboardBannerRouter.use(authDashboard);
dashboardBannerRouter.get(
  "/",
  requireRole("ADMIN", "STAFF"),
  listDashboardBannersHandler,
);
dashboardBannerRouter.get(
  "/:id",
  requireRole("ADMIN", "STAFF"),
  getDashboardBannerHandler,
);
dashboardBannerRouter.post(
  "/",
  requireRole("ADMIN", "STAFF"),
  validate(createBannerSchema),
  createDashboardBannerHandler,
);
dashboardBannerRouter.patch(
  "/:id",
  requireRole("ADMIN", "STAFF"),
  validate(updateBannerSchema),
  updateDashboardBannerHandler,
);
dashboardBannerRouter.delete(
  "/:id",
  requireRole("ADMIN"),
  deleteDashboardBannerHandler,
);
