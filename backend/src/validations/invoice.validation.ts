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

export const refundInvoiceSchema = z.object({
  refundReason: z
    .string("Ly do hoan tien la bat buoc")
    .trim()
    .min(5, "Ly do hoan tien phai co it nhat 5 ky tu")
    .max(500, "Ly do hoan tien khong duoc vuot qua 500 ky tu"),
});
