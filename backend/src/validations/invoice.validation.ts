import { z } from "zod";

const manualPaymentMethods = ["CASH", "CARD", "BANK_TRANSFER", "OTHER"] as const;

export const createInvoiceSchema = z.object({
  bhytDiscount: z.number().int().min(0, "Giam tru BHYT khong duoc am").optional(),
});

export const payInvoiceSchema = z.object({
  paymentMethod: z
    .string("Phuong thuc thanh toan la bat buoc")
    .trim()
    .min(1, "Phuong thuc thanh toan la bat buoc")
    .refine((value) => manualPaymentMethods.includes(value as typeof manualPaymentMethods[number]), {
      message: "Phuong thuc thanh toan thu cong khong hop le. Gia tri hop le: CASH, CARD, BANK_TRANSFER, OTHER. MOMO/VNPAY phai di qua API /api/payments.",
    }),
});
