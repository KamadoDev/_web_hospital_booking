import { Router } from "express";
import {
  cancelPaymentTransactionHandler,
  createPaymentTransactionHandler,
  getMockCheckoutHandler,
  getPaymentTransactionHandler,
  mockPaymentFailHandler,
  mockPaymentSuccessHandler,
  paymentProviderReturnHandler,
  paymentProviderWebhookHandler,
} from "../controllers/payment.controller.js";
import { validate } from "../middlewares/validate.middleware.js";
import { createPaymentTransactionSchema } from "../validations/payment.validation.js";

const router = Router();

router.post(
  "/invoices/:invoiceId/create",
  validate(createPaymentTransactionSchema),
  createPaymentTransactionHandler,
);
router.get("/:id", getPaymentTransactionHandler);
router.patch("/:id/cancel", cancelPaymentTransactionHandler);

router.get("/mock/checkout/:transactionCode", getMockCheckoutHandler);
router.post("/mock/:transactionCode/success", mockPaymentSuccessHandler);
router.post("/mock/:transactionCode/fail", mockPaymentFailHandler);

router.post("/:provider/webhook", paymentProviderWebhookHandler);
router.get("/:provider/return", paymentProviderReturnHandler);

export default router;
