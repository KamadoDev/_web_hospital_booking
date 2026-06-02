CREATE TABLE "OtpSecurityBlock" (
    "id" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "purpose" "OtpPurpose",
    "blockedUntil" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpSecurityBlock_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OtpVerifyAttempt" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "purpose" "OtpPurpose" NOT NULL,
    "ipAddress" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpVerifyAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OtpSecurityBlock_targetType_target_idx" ON "OtpSecurityBlock"("targetType", "target");
CREATE INDEX "OtpSecurityBlock_purpose_idx" ON "OtpSecurityBlock"("purpose");
CREATE INDEX "OtpSecurityBlock_blockedUntil_idx" ON "OtpSecurityBlock"("blockedUntil");
CREATE INDEX "OtpVerifyAttempt_phone_purpose_createdAt_idx" ON "OtpVerifyAttempt"("phone", "purpose", "createdAt");
CREATE INDEX "OtpVerifyAttempt_ipAddress_createdAt_idx" ON "OtpVerifyAttempt"("ipAddress", "createdAt");
CREATE INDEX "OtpVerifyAttempt_success_idx" ON "OtpVerifyAttempt"("success");
