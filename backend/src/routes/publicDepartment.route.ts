import { Router } from "express";
import {
  getPublicDepartmentHandler,
  listPublicDepartmentsHandler,
} from "../controllers/publicDepartment.controller.js";

const router = Router();

router.get("/", listPublicDepartmentsHandler);
router.get("/:slug", getPublicDepartmentHandler);

export default router;
