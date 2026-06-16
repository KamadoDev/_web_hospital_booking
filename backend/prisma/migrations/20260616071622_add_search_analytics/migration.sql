-- CreateTable
CREATE TABLE "SearchAnalyticsLog" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'all',
    "source" TEXT,
    "resultCount" INTEGER NOT NULL DEFAULT 0,
    "hasResults" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchAnalyticsLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SearchAnalyticsLog_normalized_idx" ON "SearchAnalyticsLog"("normalized");

-- CreateIndex
CREATE INDEX "SearchAnalyticsLog_type_idx" ON "SearchAnalyticsLog"("type");

-- CreateIndex
CREATE INDEX "SearchAnalyticsLog_hasResults_idx" ON "SearchAnalyticsLog"("hasResults");

-- CreateIndex
CREATE INDEX "SearchAnalyticsLog_createdAt_idx" ON "SearchAnalyticsLog"("createdAt");
