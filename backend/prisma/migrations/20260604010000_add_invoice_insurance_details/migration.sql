-- CreateEnum
CREATE TYPE "InsuranceRouteType" AS ENUM ('RIGHT_ROUTE', 'WRONG_ROUTE', 'REFERRAL', 'EMERGENCY', 'SERVICE');

-- AlterTable
ALTER TABLE "Invoice"
ADD COLUMN "insuranceEligibleAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "insuranceCoverageRate" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "insuranceDiscountAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "insuranceRouteType" "InsuranceRouteType",
ADD COLUMN "insuranceNote" TEXT;
