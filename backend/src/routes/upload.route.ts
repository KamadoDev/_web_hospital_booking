import { Router } from "express";
import {
  cleanupUnusedMediaAssetsHandler,
  deleteUnusedMediaAssetHandler,
  listMediaAssetsHandler,
  uploadImagesHandler,
} from "../controllers/upload.controller.js";
import { authDashboard, requireRole } from "../middlewares/auth.middleware.js";
import { uploadImages } from "../middlewares/upload.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { cleanupUnusedMediaAssetsSchema } from "../validations/mediaAsset.validation.js";

const router = Router();

router.get(
  "/images",
  authDashboard,
  requireRole("ADMIN", "STAFF"),
  listMediaAssetsHandler,
);

router.post(
  "/images",
  authDashboard,
  requireRole("ADMIN", "STAFF"),
  uploadImages,
  uploadImagesHandler,
);

router.post(
  "/images/cleanup-unused",
  authDashboard,
  requireRole("ADMIN"),
  validate(cleanupUnusedMediaAssetsSchema),
  cleanupUnusedMediaAssetsHandler,
);

router.delete(
  "/images/:id",
  authDashboard,
  requireRole("ADMIN"),
  deleteUnusedMediaAssetHandler,
);

export default router;
