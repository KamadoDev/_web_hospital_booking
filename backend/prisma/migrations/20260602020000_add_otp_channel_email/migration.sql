CREATE TYPE "OtpChannel" AS ENUM ('SMS', 'EMAIL');

ALTER TABLE "OtpCode"
ADD COLUMN "email" TEXT,
ADD COLUMN "target" TEXT,
ADD COLUMN "channel" "OtpChannel" NOT NULL DEFAULT 'SMS';

UPDATE "OtpCode"
SET "target" = "phone"
WHERE "target" IS NULL;

ALTER TABLE "OtpVerifyAttempt"
ADD COLUMN "email" TEXT,
ADD COLUMN "target" TEXT,
ADD COLUMN "channel" "OtpChannel" NOT NULL DEFAULT 'SMS';

UPDATE "OtpVerifyAttempt"
SET "target" = "phone"
WHERE "target" IS NULL;

ALTER TABLE "Appointment"
ADD COLUMN "otpChannel" "OtpChannel" NOT NULL DEFAULT 'SMS';

CREATE INDEX "OtpCode_email_idx" ON "OtpCode"("email");
CREATE INDEX "OtpCode_target_idx" ON "OtpCode"("target");
CREATE INDEX "OtpCode_channel_idx" ON "OtpCode"("channel");
CREATE INDEX "OtpVerifyAttempt_target_channel_purpose_createdAt_idx" ON "OtpVerifyAttempt"("target", "channel", "purpose", "createdAt");
