import type { PaymentProvider } from "../../../generated/prisma/enums.js";
import { AppError } from "../../utils/appError.js";
import type { PaymentProviderAdapter } from "./types.js";

export const createUnsupportedProvider = (provider: PaymentProvider): PaymentProviderAdapter => ({
  provider,

  async createPayment() {
    throw new AppError(`${provider} chua duoc tich hop adapter thanh toan`, 501);
  },
});
