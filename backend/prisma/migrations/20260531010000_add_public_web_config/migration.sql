CREATE TABLE "SiteSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Banner" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "image" TEXT NOT NULL,
    "mobileImage" TEXT,
    "linkUrl" TEXT,
    "target" TEXT,
    "position" TEXT NOT NULL DEFAULT 'HOME_HERO',
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Banner_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PublicFAQ" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "category" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicFAQ_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SiteSetting_key_key" ON "SiteSetting"("key");
CREATE INDEX "SiteSetting_isActive_idx" ON "SiteSetting"("isActive");
CREATE INDEX "Banner_position_idx" ON "Banner"("position");
CREATE INDEX "Banner_isActive_idx" ON "Banner"("isActive");
CREATE INDEX "Banner_order_idx" ON "Banner"("order");
CREATE INDEX "PublicFAQ_category_idx" ON "PublicFAQ"("category");
CREATE INDEX "PublicFAQ_isActive_idx" ON "PublicFAQ"("isActive");
CREATE INDEX "PublicFAQ_order_idx" ON "PublicFAQ"("order");

INSERT INTO "SiteSetting" ("id", "key", "value", "description", "isActive", "createdAt", "updatedAt")
VALUES (
    gen_random_uuid(),
    'public_site_settings',
    '{
      "hospitalName": "Hospital Booking",
      "logo": null,
      "favicon": null,
      "hotline": null,
      "emergencyHotline": null,
      "email": null,
      "address": null,
      "workingHours": null,
      "mapUrl": null,
      "socialLinks": {}
    }'::jsonb,
    'Public website display settings',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);
