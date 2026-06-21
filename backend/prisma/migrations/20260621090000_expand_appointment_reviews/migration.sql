-- Add a dedicated OTP purpose for patient reviews.
ALTER TYPE "OtpPurpose" ADD VALUE IF NOT EXISTS 'REVIEW_APPOINTMENT';

-- Expand the one-review-per-appointment record into three measurable criteria.
ALTER TABLE "Review"
  ALTER COLUMN "rating" TYPE DOUBLE PRECISION USING "rating"::DOUBLE PRECISION,
  ADD COLUMN "doctorRating" INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN "serviceRating" INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN "facilityRating" INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN "isVisible" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "moderationNote" TEXT,
  ADD COLUMN "moderatedAt" TIMESTAMP(3);

CREATE INDEX "Review_isVisible_idx" ON "Review"("isVisible");
CREATE INDEX "Review_createdAt_idx" ON "Review"("createdAt");
