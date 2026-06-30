ALTER TABLE "Department"
ADD COLUMN "symptomKeywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "triageDescription" TEXT,
ADD COLUMN "isTriageFallback" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Department_isTriageFallback_isActive_idx"
ON "Department"("isTriageFallback", "isActive");
