import { Router } from "express";
import {
  getDashboardChatbotOverviewHandler,
  getDashboardChatbotSettingsHandler,
  getDashboardChatbotSessionHandler,
  listDashboardChatbotLogsHandler,
  listDashboardChatbotSessionsHandler,
  updateDashboardChatbotSettingsHandler,
} from "../controllers/dashboardChatbot.controller.js";
import { authDashboard, requireRole } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { updateDashboardChatbotSettingsSchema } from "../validations/dashboardChatbotSetting.validation.js";

const router = Router();

router.use(authDashboard, requireRole("ADMIN", "STAFF"));

router.get("/overview", getDashboardChatbotOverviewHandler);
router.get("/settings", getDashboardChatbotSettingsHandler);
router.patch(
  "/settings",
  requireRole("ADMIN"),
  validate(updateDashboardChatbotSettingsSchema),
  updateDashboardChatbotSettingsHandler,
);
router.get("/logs", listDashboardChatbotLogsHandler);
router.get("/sessions", listDashboardChatbotSessionsHandler);
router.get("/sessions/:id", getDashboardChatbotSessionHandler);

export default router;
