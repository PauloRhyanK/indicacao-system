-- AlterTable
ALTER TABLE "users" 
ADD COLUMN IF NOT EXISTS "outlook_refresh_token" TEXT,
ADD COLUMN IF NOT EXISTS "outlook_access_token" TEXT,
ADD COLUMN IF NOT EXISTS "outlook_token_expires_at" TIMESTAMP(3);
