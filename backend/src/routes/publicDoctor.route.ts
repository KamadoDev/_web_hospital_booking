import { Router } from "express";
import {
  getPublicDoctorHandler,
  listPublicDoctorsHandler,
} from "../controllers/publicDoctor.controller.js";

const router = Router();

router.get("/", listPublicDoctorsHandler);
router.get("/:id", getPublicDoctorHandler);

export default router;
