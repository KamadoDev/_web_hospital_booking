import { Router } from "express";
import {
  archiveMedicalRecordHandler,
  createLabResultHandler,
  deleteLabResultHandler,
  getMedicalRecordHandler,
  listMedicalRecordsHandler,
  publishMedicalRecordHandler,
  updateLabResultHandler,
  updateMedicalRecordHandler,
} from "../controllers/medicalRecord.controller.js";
import { authDashboard, requireRole } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createLabResultSchema,
  updateLabResultSchema,
  updateMedicalRecordSchema,
} from "../validations/medicalRecord.validation.js";

const router = Router();

router.use(authDashboard);

router.get("/", requireRole("ADMIN", "STAFF", "DOCTOR"), listMedicalRecordsHandler);
router.get("/:id", requireRole("ADMIN", "STAFF", "DOCTOR"), getMedicalRecordHandler);
router.patch(
  "/:id",
  requireRole("ADMIN", "STAFF", "DOCTOR"),
  validate(updateMedicalRecordSchema),
  updateMedicalRecordHandler,
);
router.patch("/:id/publish", requireRole("ADMIN", "STAFF", "DOCTOR"), publishMedicalRecordHandler);
router.patch("/:id/archive", requireRole("ADMIN", "STAFF"), archiveMedicalRecordHandler);
router.post(
  "/:id/lab-results",
  requireRole("ADMIN", "STAFF", "DOCTOR"),
  validate(createLabResultSchema),
  createLabResultHandler,
);
router.patch(
  "/:id/lab-results/:labResultId",
  requireRole("ADMIN", "STAFF", "DOCTOR"),
  validate(updateLabResultSchema),
  updateLabResultHandler,
);
router.delete(
  "/:id/lab-results/:labResultId",
  requireRole("ADMIN", "STAFF", "DOCTOR"),
  deleteLabResultHandler,
);

export default router;
