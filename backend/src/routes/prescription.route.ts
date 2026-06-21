import { Router } from "express";
import {
  cancelPrescriptionHandler,
  createPrescriptionItemHandler,
  deletePrescriptionItemHandler,
  getPrescriptionHandler,
  issuePrescriptionHandler,
  listPrescriptionsHandler,
  updatePrescriptionHandler,
  updatePrescriptionItemHandler,
} from "../controllers/prescription.controller.js";
import { authDashboard, requireRole } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createPrescriptionItemSchema,
  updatePrescriptionItemSchema,
  updatePrescriptionSchema,
} from "../validations/prescription.validation.js";

const router = Router();

router.use(authDashboard);

router.get("/", requireRole("ADMIN", "STAFF", "DOCTOR"), listPrescriptionsHandler);
router.get("/:id", requireRole("ADMIN", "STAFF", "DOCTOR"), getPrescriptionHandler);
router.patch(
  "/:id",
  requireRole("ADMIN", "DOCTOR"),
  validate(updatePrescriptionSchema),
  updatePrescriptionHandler,
);
router.patch("/:id/issue", requireRole("ADMIN", "DOCTOR"), issuePrescriptionHandler);
router.patch("/:id/cancel", requireRole("ADMIN", "DOCTOR"), cancelPrescriptionHandler);
router.post(
  "/:id/items",
  requireRole("ADMIN", "DOCTOR"),
  validate(createPrescriptionItemSchema),
  createPrescriptionItemHandler,
);
router.patch(
  "/:id/items/:itemId",
  requireRole("ADMIN", "DOCTOR"),
  validate(updatePrescriptionItemSchema),
  updatePrescriptionItemHandler,
);
router.delete(
  "/:id/items/:itemId",
  requireRole("ADMIN", "DOCTOR"),
  deletePrescriptionItemHandler,
);

export default router;
