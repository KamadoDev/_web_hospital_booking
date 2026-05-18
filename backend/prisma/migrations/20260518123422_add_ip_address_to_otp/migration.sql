-- AlterTable
ALTER TABLE "OtpCode" ADD COLUMN     "ipAddress" TEXT;

-- CreateIndex
CREATE INDEX "OtpCode_ipAddress_idx" ON "OtpCode"("ipAddress");
