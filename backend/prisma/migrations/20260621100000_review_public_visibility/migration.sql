-- Reviews are private until an ADMIN or STAFF member approves public display.
ALTER TABLE "Review" ALTER COLUMN "isVisible" SET DEFAULT false;
UPDATE "Review" SET "isVisible" = false;
