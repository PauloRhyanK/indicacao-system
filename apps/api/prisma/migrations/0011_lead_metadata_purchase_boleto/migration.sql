-- Lead: criado por e primeiro contato
ALTER TABLE "leads" ADD COLUMN "created_by_id" UUID;
ALTER TABLE "leads" ADD COLUMN "first_contact_id" UUID;

UPDATE "leads"
SET "first_contact_id" = "responsavel_id"
WHERE "first_contact_id" IS NULL AND "responsavel_id" IS NOT NULL;

ALTER TABLE "leads" ADD CONSTRAINT "leads_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "leads" ADD CONSTRAINT "leads_first_contact_id_fkey"
  FOREIGN KEY ("first_contact_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "leads_created_by_id_idx" ON "leads"("created_by_id");
CREATE INDEX "leads_first_contact_id_idx" ON "leads"("first_contact_id");

-- Purchase: status de pagamento do boleto
ALTER TABLE "purchases" ADD COLUMN "boleto_paid" BOOLEAN NOT NULL DEFAULT false;
