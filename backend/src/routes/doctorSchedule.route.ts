import { Router } from "express";
import {
  createDoctorScheduleHandler,
  deleteDoctorScheduleHandler,
  getDoctorScheduleHandler,
  listDoctorSchedulesHandler,
  updateDoctorScheduleHandler,
} from "../controllers/doctorSchedule.controller.js";
import { authDashboard, requireRole } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createDoctorScheduleSchema,
  updateDoctorScheduleSchema,
} from "../validations/doctorSchedule.validation.js";

const router = Router();

router.use(authDashboard);

router.get("/", requireRole("ADMIN", "STAFF", "DOCTOR"), listDoctorSchedulesHandler);
router.get("/:id", requireRole("ADMIN", "STAFF", "DOCTOR"), getDoctorScheduleHandler);
router.post("/", requireRole("ADMIN", "STAFF"), validate(createDoctorScheduleSchema), createDoctorScheduleHandler);
router.patch("/:id", requireRole("ADMIN", "STAFF"), validate(updateDoctorScheduleSchema), updateDoctorScheduleHandler);
router.delete("/:id", requireRole("ADMIN", "STAFF"), deleteDoctorScheduleHandler);

export default router;
