import { Router } from "express";
import {
  cancelInvoiceHandler,
  createInvoiceForAppointmentHandler,
  getInvoiceHandler,
  listInvoicesHandler,
  payInvoiceHandler,
  refundInvoiceHandler,
  updateInvoiceHandler,
} from "../controllers/invoice.controller.js";
import { authDashboard, requireRole } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createInvoiceSchema,
  payInvoiceSchema,
  refundInvoiceSchema,
  updateInvoiceSchema,
} from "../validations/invoice.validation.js";

const router = Router();

router.use(authDashboard);

router.get("/", requireRole("ADMIN", "STAFF"), listInvoicesHandler);
router.post(
  "/appointments/:appointmentId",
  requireRole("ADMIN", "STAFF"),
  validate(createInvoiceSchema),
  createInvoiceForAppointmentHandler,
);
router.get("/:id", requireRole("ADMIN", "STAFF"), getInvoiceHandler);
router.patch(
  "/:id",
  requireRole("ADMIN", "STAFF"),
  validate(updateInvoiceSchema),
  updateInvoiceHandler,
);
router.patch(
  "/:id/pay",
  requireRole("ADMIN", "STAFF"),
  validate(payInvoiceSchema),
  payInvoiceHandler,
);
router.patch(
  "/:id/cancel",
  requireRole("ADMIN", "STAFF"),
  cancelInvoiceHandler,
);
router.patch(
  "/:id/refund",
  requireRole("ADMIN"),
  validate(refundInvoiceSchema),
  refundInvoiceHandler,
);

export default router;
