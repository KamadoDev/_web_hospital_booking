import type { PaymentProvider } from "../../../generated/prisma/enums.js";
import { mockPaymentProvider } from "./mock.provider.js";
import { momoPaymentProvider } from "./momo.provider.js";
import { createUnsupportedProvider } from "./unsupported.provider.js";
import type { PaymentProviderAdapter } from "./types.js";

const adapters = {
  MOCK: mockPaymentProvider,
  MOMO: momoPaymentProvider,
  VNPAY: createUnsupportedProvider("VNPAY"),
  ZALOPAY: createUnsupportedProvider("ZALOPAY"),
} satisfies Record<PaymentProvider, PaymentProviderAdapter>;

export const getPaymentProviderAdapter = (provider: PaymentProvider) =>
  adapters[provider];

export type { CreateProviderPaymentResult, PaymentProviderAdapter } from "./types.js";
export { verifyMomoSignature } from "./momo.provider.js";
