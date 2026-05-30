-- CreateTable
CREATE TABLE "ChatbotSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "guestPhone" TEXT,
    "draft" JSONB NOT NULL DEFAULT '{}',
    "currentIntent" TEXT,
    "currentState" TEXT,
    "lastActions" JSONB,
    "lastMessage" TEXT,
    "lastResponse" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatbotSession_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "ChatbotLog" ADD COLUMN "sessionId" TEXT;

-- CreateIndex
CREATE INDEX "ChatbotSession_userId_idx" ON "ChatbotSession"("userId");

-- CreateIndex
CREATE INDEX "ChatbotSession_guestPhone_idx" ON "ChatbotSession"("guestPhone");

-- CreateIndex
CREATE INDEX "ChatbotSession_currentIntent_idx" ON "ChatbotSession"("currentIntent");

-- CreateIndex
CREATE INDEX "ChatbotSession_currentState_idx" ON "ChatbotSession"("currentState");

-- CreateIndex
CREATE INDEX "ChatbotSession_isActive_idx" ON "ChatbotSession"("isActive");

-- CreateIndex
CREATE INDEX "ChatbotSession_expiresAt_idx" ON "ChatbotSession"("expiresAt");

-- CreateIndex
CREATE INDEX "ChatbotLog_sessionId_idx" ON "ChatbotLog"("sessionId");

-- AddForeignKey
ALTER TABLE "ChatbotSession" ADD CONSTRAINT "ChatbotSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatbotLog" ADD CONSTRAINT "ChatbotLog_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ChatbotSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
