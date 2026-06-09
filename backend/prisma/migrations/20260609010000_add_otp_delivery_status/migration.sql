-- CreateEnum
CREATE TYPE "OtpDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- AlterTable
ALTER TABLE "OtpCode"
ADD COLUMN "deliveryStatus" "OtpDeliveryStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "deliveryError" TEXT,
ADD COLUMN "deliveredAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "OtpCode_deliveryStatus_idx" ON "OtpCode"("deliveryStatus");
