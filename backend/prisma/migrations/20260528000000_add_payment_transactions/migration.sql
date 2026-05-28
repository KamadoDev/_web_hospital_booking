CREATE TYPE "PaymentProvider" AS ENUM ('MOCK', 'VNPAY', 'MOMO', 'ZALOPAY');

CREATE TYPE "PaymentTransactionStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'EXPIRED');

CREATE TABLE "PaymentTransaction" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "status" "PaymentTransactionStatus" NOT NULL DEFAULT 'PENDING',
    "amount" INTEGER NOT NULL,
    "transactionCode" TEXT NOT NULL,
    "providerOrderId" TEXT,
    "paymentUrl" TEXT,
    "rawRequest" JSONB,
    "rawResponse" JSONB,
    "paidAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentTransaction_transactionCode_key" ON "PaymentTransaction"("transactionCode");

CREATE INDEX "PaymentTransaction_invoiceId_idx" ON "PaymentTransaction"("invoiceId");

CREATE INDEX "PaymentTransaction_provider_idx" ON "PaymentTransaction"("provider");

CREATE INDEX "PaymentTransaction_status_idx" ON "PaymentTransaction"("status");

CREATE INDEX "PaymentTransaction_transactionCode_idx" ON "PaymentTransaction"("transactionCode");

CREATE INDEX "PaymentTransaction_providerOrderId_idx" ON "PaymentTransaction"("providerOrderId");

CREATE INDEX "PaymentTransaction_expiredAt_idx" ON "PaymentTransaction"("expiredAt");

ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
