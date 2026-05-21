import { Router } from "express";
import {
  createDoctorHandler,
  deleteDoctorHandler,
  getDoctorHandler,
  listDoctorsHandler,
  updateDoctorAvailabilityHandler,
  updateDoctorHandler,
} from "../controllers/doctor.controller.js";
import { authDashboard, requireRole } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createDoctorProfileSchema,
  updateDoctorAvailabilitySchema,
  updateDoctorProfileSchema,
} from "../validations/doctor.validation.js";

const router = Router();

router.use(authDashboard);

router.get("/", requireRole("ADMIN", "STAFF", "DOCTOR"), listDoctorsHandler);
router.get("/:id", requireRole("ADMIN", "STAFF", "DOCTOR"), getDoctorHandler);
router.post("/", requireRole("ADMIN", "STAFF"), validate(createDoctorProfileSchema), createDoctorHandler);
router.patch("/:id", requireRole("ADMIN", "STAFF"), validate(updateDoctorProfileSchema), updateDoctorHandler);
router.patch(
  "/:id/availability",
  requireRole("ADMIN", "STAFF"),
  validate(updateDoctorAvailabilitySchema),
  updateDoctorAvailabilityHandler,
);
router.delete("/:id", requireRole("ADMIN"), deleteDoctorHandler);

export default router;
