-- Commercial roles: responsavel, vendedor, co-vendedor (migrate from assigned_to_user_id)

ALTER TABLE "leads" ADD COLUMN "responsavel_id" UUID;
ALTER TABLE "leads" ADD COLUMN "vendedor_id" UUID;
ALTER TABLE "leads" ADD COLUMN "co_vendedor_id" UUID;

UPDATE "leads" SET "responsavel_id" = "assigned_to_user_id" WHERE "assigned_to_user_id" IS NOT NULL;

ALTER TABLE "leads" DROP CONSTRAINT IF EXISTS "leads_assigned_to_user_id_fkey";
DROP INDEX IF EXISTS "leads_assigned_to_user_id_idx";
ALTER TABLE "leads" DROP COLUMN "assigned_to_user_id";

ALTER TABLE "leads" ADD CONSTRAINT "leads_responsavel_id_fkey"
  FOREIGN KEY ("responsavel_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "leads" ADD CONSTRAINT "leads_vendedor_id_fkey"
  FOREIGN KEY ("vendedor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "leads" ADD CONSTRAINT "leads_co_vendedor_id_fkey"
  FOREIGN KEY ("co_vendedor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "leads_responsavel_id_idx" ON "leads"("responsavel_id");
CREATE INDEX "leads_vendedor_id_idx" ON "leads"("vendedor_id");
CREATE INDEX "leads_co_vendedor_id_idx" ON "leads"("co_vendedor_id");
