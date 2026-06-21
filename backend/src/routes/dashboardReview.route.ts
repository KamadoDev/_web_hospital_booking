import { Router } from "express";
import { listDashboardReviewsHandler, updateDashboardReviewVisibilityHandler } from "../controllers/dashboardReview.controller.js";
import { authDashboard, requireRole } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { updateReviewVisibilitySchema } from "../validations/review.validation.js";

const router = Router();

router.use(authDashboard);
router.get("/", requireRole("ADMIN", "STAFF", "DOCTOR"), listDashboardReviewsHandler);
router.patch("/:id/visibility", requireRole("ADMIN", "STAFF"), validate(updateReviewVisibilitySchema), updateDashboardReviewVisibilityHandler);

export default router;
