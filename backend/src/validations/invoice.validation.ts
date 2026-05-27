import { z } from "zod";

const paymentMethods = ["CASH", "CARD", "BANK_TRANSFER", "MOMO", "VNPAY", "OTHER"] as const;

export const createInvoiceSchema = z.object({
  bhytDiscount: z.number().int().min(0, "Giam tru BHYT khong duoc am").optional(),
});

export const payInvoiceSchema = z.object({
  paymentMethod: z
    .string("Phuong thuc thanh toan la bat buoc")
    .trim()
    .min(1, "Phuong thuc thanh toan la bat buoc")
    .refine((value) => paymentMethods.includes(value as typeof paymentMethods[number]), {
      message: "Phuong thuc thanh toan khong hop le. Gia tri hop le: CASH, CARD, BANK_TRANSFER, MOMO, VNPAY, OTHER",
    }),
});
