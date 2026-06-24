import crypto from "crypto";
import type { Prisma } from "../../../generated/prisma/client.js";
import { AppError } from "../../utils/appError.js";
import type { PaymentProviderAdapter } from "./types.js";

type MomoCreateResponse = {
  payUrl?: string;
  deeplink?: string;
  qrCodeUrl?: string;
  orderId?: string;
  requestId?: string;
  resultCode?: number;
  message?: string;
  [key: string]: unknown;
};

const requiredEnv = (key: string) => {
  const value = process.env[key];

  if (!value) {
    throw new AppError(`Chưa cấu hình biến môi trường ${key}`, 500);
  }

  return value;
};

const optionalEnv = (key: string, fallback: string) =>
  process.env[key] || fallback;

const signMomo = (rawSignature: string, secretKey: string) =>
  crypto.createHmac("sha256", secretKey).update(rawSignature).digest("hex");

export const momoPaymentProvider: PaymentProviderAdapter = {
  provider: "MOMO",

  async createPayment(input) {
    const partnerCode = requiredEnv("MOMO_PARTNER_CODE");
    const accessKey = requiredEnv("MOMO_ACCESS_KEY");
    const secretKey = requiredEnv("MOMO_SECRET_KEY");
    const endpoint = optionalEnv(
      "MOMO_ENDPOINT",
      "https://test-payment.momo.vn/v2/gateway/api/create",
    );
    const redirectUrl = requiredEnv("MOMO_REDIRECT_URL");
    const ipnUrl = requiredEnv("MOMO_IPN_URL");
    const requestType = process.env.MOMO_REQUEST_TYPE || "captureWallet";
    const lang = process.env.MOMO_LANG || "vi";
    const extraData = "";
    const orderId = input.transactionCode;
    const requestId = input.transactionCode;

    const rawSignature = [
      `accessKey=${accessKey}`,
      `amount=${input.amount}`,
      `extraData=${extraData}`,
      `ipnUrl=${ipnUrl}`,
      `orderId=${orderId}`,
      `orderInfo=${input.orderInfo}`,
      `partnerCode=${partnerCode}`,
      `redirectUrl=${redirectUrl}`,
      `requestId=${requestId}`,
      `requestType=${requestType}`,
    ].join("&");
    const signature = signMomo(rawSignature, secretKey);

    const requestBody = {
      partnerCode,
      partnerName: process.env.MOMO_PARTNER_NAME || "Hospital Booking",
      storeId: process.env.MOMO_STORE_ID || "HospitalBooking",
      requestId,
      amount: input.amount,
      orderId,
      orderInfo: input.orderInfo,
      redirectUrl,
      ipnUrl,
      lang,
      requestType,
      autoCapture: true,
      extraData,
      signature,
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });
    const responseBody = (await response.json()) as MomoCreateResponse;

    if (!response.ok || responseBody.resultCode !== 0 || !responseBody.payUrl) {
      throw new AppError(
        responseBody.message || "MoMo không tạo được đường dẫn thanh toán",
        502,
      );
    }

    return {
      providerOrderId: responseBody.orderId || orderId,
      paymentUrl: responseBody.payUrl,
      rawRequest: requestBody,
      rawResponse: responseBody as Prisma.InputJsonObject,
    };
  },
};

export const verifyMomoSignature = (payload: Record<string, unknown>) => {
  const secretKey = requiredEnv("MOMO_SECRET_KEY");
  const signature = String(payload.signature || "");

  const rawSignature = [
    `accessKey=${requiredEnv("MOMO_ACCESS_KEY")}`,
    `amount=${payload.amount || ""}`,
    `extraData=${payload.extraData || ""}`,
    `message=${payload.message || ""}`,
    `orderId=${payload.orderId || ""}`,
    `orderInfo=${payload.orderInfo || ""}`,
    `orderType=${payload.orderType || ""}`,
    `partnerCode=${payload.partnerCode || ""}`,
    `payType=${payload.payType || ""}`,
    `requestId=${payload.requestId || ""}`,
    `responseTime=${payload.responseTime || ""}`,
    `resultCode=${payload.resultCode || ""}`,
    `transId=${payload.transId || ""}`,
  ].join("&");

  return signMomo(rawSignature, secretKey) === signature;
};
