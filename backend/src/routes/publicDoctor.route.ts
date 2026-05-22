import { Router } from "express";
import {
  getPublicDoctorHandler,
  listPublicDoctorsHandler,
} from "../controllers/publicDoctor.controller.js";
import { listPublicAvailableSlotsHandler } from "../controllers/doctorTimeSlot.controller.js";

const router = Router();

router.get("/", listPublicDoctorsHandler);
router.get("/:id/available-slots", listPublicAvailableSlotsHandler);
router.get("/:id", getPublicDoctorHandler);

export default router;
