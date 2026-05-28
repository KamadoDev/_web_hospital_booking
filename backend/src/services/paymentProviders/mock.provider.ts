import type { PaymentProviderAdapter } from "./types.js";

const getApiBaseUrl = () =>
  process.env.APP_BASE_URL ||
  process.env.API_BASE_URL ||
  process.env.BACKEND_URL ||
  "http://localhost:4000";

export const mockPaymentProvider: PaymentProviderAdapter = {
  provider: "MOCK",

  async createPayment(input) {
    const paymentUrl = `${getApiBaseUrl()}/api/payments/mock/checkout/${input.transactionCode}`;

    return {
      providerOrderId: input.transactionCode,
      paymentUrl,
      rawRequest: {
        invoiceId: input.invoiceId,
        invoiceCode: input.invoiceCode,
        provider: input.provider,
        amount: input.amount,
        transactionCode: input.transactionCode,
      },
      rawResponse: {
        mode: "MOCK",
        message: "Dung mock success/fail de gia lap ket qua thanh toan.",
        paymentUrl,
      },
    };
  },
};
