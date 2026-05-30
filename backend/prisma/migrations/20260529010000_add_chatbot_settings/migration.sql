-- CreateTable
CREATE TABLE "ChatbotSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatbotSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChatbotSetting_key_key" ON "ChatbotSetting"("key");

-- CreateIndex
CREATE INDEX "ChatbotSetting_isActive_idx" ON "ChatbotSetting"("isActive");

-- Seed default runtime settings
INSERT INTO "ChatbotSetting" ("id", "key", "value", "description", "isActive", "createdAt", "updatedAt")
VALUES (
    gen_random_uuid(),
    'chatbot_runtime',
    '{"aiEnabled":true,"fallbackEnabled":true,"faqEnabled":true,"model":"gemini-2.5-flash","maxSuggestedActions":3,"sessionExpiresDays":7}'::jsonb,
    'Runtime settings for chatbot AI, FAQ, fallback and session behavior',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("key") DO NOTHING;
