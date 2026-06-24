import { Router } from "express";
import {
  createDashboardChatbotFAQHandler,
  deleteDashboardChatbotFAQHandler,
  getDashboardChatbotFAQHandler,
  listDashboardChatbotFAQsHandler,
  updateDashboardChatbotFAQHandler,
  updateDashboardChatbotFAQStatusHandler,
} from "../controllers/dashboardChatbotFaq.controller.js";
import { authDashboard, requireRole } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createDashboardChatbotFAQSchema,
  updateDashboardChatbotFAQSchema,
  updateDashboardChatbotFAQStatusSchema,
} from "../validations/dashboardChatbotFaq.validation.js";

const router = Router();

router.use(authDashboard);

router.get("/", requireRole("ADMIN", "STAFF"), listDashboardChatbotFAQsHandler);
router.get(
  "/:id",
  requireRole("ADMIN", "STAFF"),
  getDashboardChatbotFAQHandler,
);
router.post(
  "/",
  requireRole("ADMIN", "STAFF"),
  validate(createDashboardChatbotFAQSchema),
  createDashboardChatbotFAQHandler,
);
router.patch(
  "/:id",
  requireRole("ADMIN", "STAFF"),
  validate(updateDashboardChatbotFAQSchema),
  updateDashboardChatbotFAQHandler,
);
router.patch(
  "/:id/status",
  requireRole("ADMIN", "STAFF"),
  validate(updateDashboardChatbotFAQStatusSchema),
  updateDashboardChatbotFAQStatusHandler,
);
router.delete("/:id", requireRole("ADMIN"), deleteDashboardChatbotFAQHandler);

export default router;
