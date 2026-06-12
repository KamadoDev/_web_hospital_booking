CREATE TABLE "DashboardSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DashboardSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DashboardSession_refreshTokenHash_key" ON "DashboardSession"("refreshTokenHash");
CREATE INDEX "DashboardSession_userId_idx" ON "DashboardSession"("userId");
CREATE INDEX "DashboardSession_expiresAt_idx" ON "DashboardSession"("expiresAt");
CREATE INDEX "DashboardSession_revokedAt_idx" ON "DashboardSession"("revokedAt");

ALTER TABLE "DashboardSession" ADD CONSTRAINT "DashboardSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
