import { Router } from "express";
import { uploadImagesHandler } from "../controllers/upload.controller.js";
import { authDashboard, requireRole } from "../middlewares/auth.middleware.js";
import { uploadImages } from "../middlewares/upload.middleware.js";

const router = Router();

router.post(
  "/images",
  authDashboard,
  requireRole("ADMIN", "STAFF"),
  uploadImages,
  uploadImagesHandler,
);

export default router;
