-- Soft delete columns
ALTER TABLE "leads" ADD COLUMN "deleted_at" TIMESTAMPTZ;
ALTER TABLE "users" ADD COLUMN "deleted_at" TIMESTAMPTZ;
ALTER TABLE "purchases" ADD COLUMN "deleted_at" TIMESTAMPTZ;

CREATE INDEX "leads_deleted_at_idx" ON "leads"("deleted_at");
CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");
CREATE INDEX "purchases_deleted_at_idx" ON "purchases"("deleted_at");

-- Consolidate vendedor into responsavel before dropping vendedor_id
UPDATE "leads"
SET "responsavel_id" = "vendedor_id"
WHERE "responsavel_id" IS NULL AND "vendedor_id" IS NOT NULL;

-- Soft-delete orphan purchases (lead no longer exists)
UPDATE "purchases" p
SET "deleted_at" = NOW()
WHERE NOT EXISTS (SELECT 1 FROM "leads" l WHERE l."id" = p."lead_id")
  AND p."deleted_at" IS NULL;

-- Recalculate period goals from valid purchases only
UPDATE "goals" g
SET "current_amount" = COALESCE((
  SELECT SUM(p."amount")
  FROM "purchases" p
  INNER JOIN "leads" l ON l."id" = p."lead_id"
  WHERE p."purchase_date" >= g."start_date"
    AND p."purchase_date" <= g."end_date"
    AND p."deleted_at" IS NULL
    AND l."deleted_at" IS NULL
), 0);

-- Drop obsolete lead FKs and columns
ALTER TABLE "leads" DROP CONSTRAINT IF EXISTS "leads_vendedor_id_fkey";
ALTER TABLE "leads" DROP CONSTRAINT IF EXISTS "leads_source_id_fkey";
ALTER TABLE "leads" DROP CONSTRAINT IF EXISTS "leads_next_action_id_fkey";

DROP INDEX IF EXISTS "leads_vendedor_id_idx";
DROP INDEX IF EXISTS "leads_source_id_idx";
DROP INDEX IF EXISTS "leads_next_follow_up_at_idx";

ALTER TABLE "leads" DROP COLUMN IF EXISTS "vendedor_id";
ALTER TABLE "leads" DROP COLUMN IF EXISTS "source_id";
ALTER TABLE "leads" DROP COLUMN IF EXISTS "next_action_id";
ALTER TABLE "leads" DROP COLUMN IF EXISTS "next_follow_up_at";

-- Drop obsolete lookup tables
DROP TABLE IF EXISTS "lead_sources";
DROP TABLE IF EXISTS "next_actions";
