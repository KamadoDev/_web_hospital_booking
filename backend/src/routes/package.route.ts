import { Router } from "express";
import {
  createPackageHandler,
  createPackageItemHandler,
  deletePackageHandler,
  deletePackageItemHandler,
  getPackageHandler,
  listPackagesHandler,
  updatePackageHandler,
  updatePackageItemHandler,
} from "../controllers/package.controller.js";
import { authDashboard, requireRole } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createPackageItemSchema,
  createPackageSchema,
  updatePackageItemSchema,
  updatePackageSchema,
} from "../validations/package.validation.js";

const router = Router();

router.use(authDashboard);

router.get("/", requireRole("ADMIN", "STAFF", "DOCTOR"), listPackagesHandler);
router.get("/:id", requireRole("ADMIN", "STAFF", "DOCTOR"), getPackageHandler);
router.post("/", requireRole("ADMIN", "STAFF"), validate(createPackageSchema), createPackageHandler);
router.patch("/:id", requireRole("ADMIN", "STAFF"), validate(updatePackageSchema), updatePackageHandler);
router.delete("/:id", requireRole("ADMIN"), deletePackageHandler);
router.post("/:id/items", requireRole("ADMIN", "STAFF"), validate(createPackageItemSchema), createPackageItemHandler);
router.patch("/:id/items/:itemId", requireRole("ADMIN", "STAFF"), validate(updatePackageItemSchema), updatePackageItemHandler);
router.delete("/:id/items/:itemId", requireRole("ADMIN", "STAFF"), deletePackageItemHandler);

export default router;
