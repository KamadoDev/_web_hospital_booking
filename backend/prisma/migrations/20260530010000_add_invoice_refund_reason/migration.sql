ALTER TABLE "Invoice"
ADD COLUMN "refundReason" TEXT,
ADD COLUMN "refundedAt" TIMESTAMP(3);
