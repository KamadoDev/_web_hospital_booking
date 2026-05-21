-- AlterTable
ALTER TABLE "OtpCode" ADD COLUMN "challengeId" TEXT;

-- CreateTable
CREATE TABLE "DashboardLoginChallenge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purpose" "OtpPurpose" NOT NULL,
    "ipAddress" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DashboardLoginChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OtpCode_challengeId_idx" ON "OtpCode"("challengeId");

-- CreateIndex
CREATE INDEX "DashboardLoginChallenge_userId_idx" ON "DashboardLoginChallenge"("userId");

-- CreateIndex
CREATE INDEX "DashboardLoginChallenge_expiresAt_idx" ON "DashboardLoginChallenge"("expiresAt");

-- CreateIndex
CREATE INDEX "DashboardLoginChallenge_isUsed_idx" ON "DashboardLoginChallenge"("isUsed");

-- AddForeignKey
ALTER TABLE "OtpCode" ADD CONSTRAINT "OtpCode_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "DashboardLoginChallenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DashboardLoginChallenge" ADD CONSTRAINT "DashboardLoginChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
