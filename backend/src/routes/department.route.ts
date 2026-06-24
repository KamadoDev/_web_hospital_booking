import { Router } from "express";
import {
  createDepartmentHandler,
  deleteDepartmentHandler,
  getDepartmentHandler,
  listDepartmentsHandler,
  updateDepartmentHandler,
} from "../controllers/department.controller.js";
import { authDashboard, requireRole } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createDepartmentSchema,
  updateDepartmentSchema,
} from "../validations/department.validation.js";

const router = Router();

router.use(authDashboard);

router.get(
  "/",
  requireRole("ADMIN", "STAFF", "DOCTOR"),
  listDepartmentsHandler,
);
router.get(
  "/:id",
  requireRole("ADMIN", "STAFF", "DOCTOR"),
  getDepartmentHandler,
);
router.post(
  "/",
  requireRole("ADMIN", "STAFF"),
  validate(createDepartmentSchema),
  createDepartmentHandler,
);
router.patch(
  "/:id",
  requireRole("ADMIN", "STAFF"),
  validate(updateDepartmentSchema),
  updateDepartmentHandler,
);
router.delete("/:id", requireRole("ADMIN"), deleteDepartmentHandler);

export default router;
