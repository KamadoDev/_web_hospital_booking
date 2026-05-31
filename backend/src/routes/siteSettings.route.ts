import { Router } from "express";
import {
  getDashboardSiteSettingsHandler,
  getPublicSiteSettingsHandler,
  updateDashboardSiteSettingsHandler,
} from "../controllers/siteSettings.controller.js";
import { authDashboard, requireRole } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { updateSiteSettingsSchema } from "../validations/siteConfig.validation.js";

export const publicSiteSettingsRouter = Router();
publicSiteSettingsRouter.get("/", getPublicSiteSettingsHandler);

export const dashboardSiteSettingsRouter = Router();
dashboardSiteSettingsRouter.use(authDashboard);
dashboardSiteSettingsRouter.get("/", requireRole("ADMIN", "STAFF"), getDashboardSiteSettingsHandler);
dashboardSiteSettingsRouter.patch(
  "/",
  requireRole("ADMIN"),
  validate(updateSiteSettingsSchema),
  updateDashboardSiteSettingsHandler,
);
