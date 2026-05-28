import { Prisma } from "../../generated/prisma/client.js";
import type { PaymentMethod, PaymentProvider } from "../../generated/prisma/enums.js";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/appError.js";
import { generatePaymentTransactionCode } from "../utils/paymentCode.js";
import { getPaymentProviderAdapter } from "./paymentProviders/index.js";

const PAYMENT_EXPIRES_MINUTES = 15;

type CreatePaymentTransactionInput = {
  provider: PaymentProvider;
};

export const paymentTransactionSelect = {
  id: true,
  provider: true,
  status: true,
  amount: true,
  transactionCode: true,
  providerOrderId: true,
  paymentUrl: true,
  rawResponse: true,
  paidAt: true,
  expiredAt: true,
  createdAt: true,
  updatedAt: true,
  invoice: {
    select: {
      id: true,
      invoiceCode: true,
      barcode: true,
      totalAmount: true,
      bhytDiscount: true,
      finalAmount: true,
      status: true,
      paymentMethod: true,
      paidAt: true,
      appointment: {
        select: {
          id: true,
          bookingCode: true,
          patientName: true,
          patientPhone: true,
        },
      },
    },
  },
} satisfies Prisma.PaymentTransactionSelect;

const mapProviderToPaymentMethod = (provider: PaymentProvider): PaymentMethod => {
  if (provider === "MOMO") return "MOMO";
  if (provider === "VNPAY") return "VNPAY";
  return "OTHER";
};

class PaymentService {
  async createForInvoice(invoiceId: string, input: CreatePaymentTransactionInput) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        invoiceCode: true,
        finalAmount: true,
        status: true,
        paymentTransactions: {
          where: {
            provider: input.provider,
            status: "PENDING",
            expiredAt: {
              gt: new Date(),
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
          select: {
            id: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new AppError("Khong tim thay hoa don", 404);
    }

    if (invoice.status !== "UNPAID") {
      throw new AppError("Chi co the tao thanh toan online cho hoa don chua thanh toan", 400);
    }

    if (invoice.finalAmount <= 0) {
      throw new AppError("So tien thanh toan khong hop le", 400);
    }

    const pendingTransaction = invoice.paymentTransactions[0];

    if (pendingTransaction) {
      return this.getById(pendingTransaction.id);
    }

    return prisma.$transaction(async (tx) => {
      const transactionCode = await this.generateUniqueTransactionCode(tx);
      const expiredAt = new Date(Date.now() + PAYMENT_EXPIRES_MINUTES * 60 * 1000);
      const adapter = getPaymentProviderAdapter(input.provider);
      const providerResult = await adapter.createPayment({
        provider: input.provider,
        transactionCode,
        invoiceId: invoice.id,
        invoiceCode: invoice.invoiceCode,
        amount: invoice.finalAmount,
        orderInfo: `Thanh toan hoa don ${invoice.invoiceCode}`,
        expiredAt,
      });

      const transaction = await tx.paymentTransaction.create({
        data: {
          invoiceId: invoice.id,
          provider: input.provider,
          amount: invoice.finalAmount,
          transactionCode,
          providerOrderId: providerResult.providerOrderId,
          paymentUrl: providerResult.paymentUrl,
          expiredAt,
          rawRequest: providerResult.rawRequest,
          rawResponse: providerResult.rawResponse,
        },
        select: {
          id: true,
        },
      });

      return tx.paymentTransaction.findUniqueOrThrow({
        where: {
          id: transaction.id,
        },
        select: paymentTransactionSelect,
      });
    });
  }

  async getById(id: string) {
    const transaction = await prisma.paymentTransaction.findUnique({
      where: { id },
      select: paymentTransactionSelect,
    });

    if (!transaction) {
      throw new AppError("Khong tim thay giao dich thanh toan", 404);
    }

    return transaction;
  }

  async getByTransactionCode(transactionCode: string) {
    const transaction = await prisma.paymentTransaction.findUnique({
      where: { transactionCode },
      select: paymentTransactionSelect,
    });

    if (!transaction) {
      throw new AppError("Khong tim thay giao dich thanh toan", 404);
    }

    return transaction;
  }

  async markMockSuccess(transactionCode: string) {
    const transaction = await prisma.paymentTransaction.findUnique({
      where: { transactionCode },
      select: {
        id: true,
        invoiceId: true,
        provider: true,
        status: true,
        amount: true,
        expiredAt: true,
        invoice: {
          select: {
            status: true,
            finalAmount: true,
          },
        },
      },
    });

    if (!transaction) {
      throw new AppError("Khong tim thay giao dich thanh toan", 404);
    }

    this.ensurePendingTransaction(transaction.status, transaction.expiredAt);

    if (transaction.invoice.status !== "UNPAID") {
      throw new AppError("Hoa don khong con o trang thai cho thanh toan", 400);
    }

    if (transaction.amount !== transaction.invoice.finalAmount) {
      throw new AppError("So tien giao dich khong khop voi hoa don", 400);
    }

    const paidAt = new Date();

    return prisma.$transaction(async (tx) => {
      await tx.paymentTransaction.update({
        where: {
          id: transaction.id,
        },
        data: {
          status: "SUCCESS",
          paidAt,
          rawResponse: {
            mode: "MOCK",
            result: "SUCCESS",
            paidAt: paidAt.toISOString(),
          },
        },
      });

      await tx.invoice.update({
        where: {
          id: transaction.invoiceId,
        },
        data: {
          status: "PAID",
          paymentMethod: mapProviderToPaymentMethod(transaction.provider),
          paidAt,
        },
      });

      return tx.paymentTransaction.findUniqueOrThrow({
        where: {
          id: transaction.id,
        },
        select: paymentTransactionSelect,
      });
    });
  }

  async markMockFailed(transactionCode: string) {
    const transaction = await prisma.paymentTransaction.findUnique({
      where: { transactionCode },
      select: {
        id: true,
        status: true,
        expiredAt: true,
      },
    });

    if (!transaction) {
      throw new AppError("Khong tim thay giao dich thanh toan", 404);
    }

    this.ensurePendingTransaction(transaction.status, transaction.expiredAt);

    return prisma.paymentTransaction.update({
      where: {
        id: transaction.id,
      },
      data: {
        status: "FAILED",
        rawResponse: {
          mode: "MOCK",
          result: "FAILED",
          failedAt: new Date().toISOString(),
        },
      },
      select: paymentTransactionSelect,
    });
  }

  async cancel(id: string) {
    const transaction = await prisma.paymentTransaction.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
      },
    });

    if (!transaction) {
      throw new AppError("Khong tim thay giao dich thanh toan", 404);
    }

    if (transaction.status !== "PENDING") {
      throw new AppError("Chi co the huy giao dich dang cho thanh toan", 400);
    }

    return prisma.paymentTransaction.update({
      where: { id },
      data: {
        status: "CANCELLED",
      },
      select: paymentTransactionSelect,
    });
  }

  private ensurePendingTransaction(status: string, expiredAt: Date) {
    if (status !== "PENDING") {
      throw new AppError("Giao dich khong con o trang thai cho thanh toan", 400);
    }

    if (expiredAt.getTime() <= Date.now()) {
      throw new AppError("Giao dich thanh toan da het han", 400);
    }
  }

  private async generateUniqueTransactionCode(tx: Prisma.TransactionClient) {
    for (let index = 0; index < 10; index += 1) {
      const transactionCode = generatePaymentTransactionCode();
      const existing = await tx.paymentTransaction.findUnique({
        where: { transactionCode },
        select: { id: true },
      });

      if (!existing) {
        return transactionCode;
      }
    }

    throw new AppError("Khong the tao ma giao dich thanh toan", 500);
  }
}

export default new PaymentService();
