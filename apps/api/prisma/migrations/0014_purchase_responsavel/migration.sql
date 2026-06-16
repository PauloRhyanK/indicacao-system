-- Vendedor responsável por venda (sincronizado com o lead ao alterar responsável)
ALTER TABLE "purchases" ADD COLUMN "responsavel_id" UUID;

UPDATE "purchases" p
SET "responsavel_id" = l."responsavel_id"
FROM "leads" l
WHERE p."lead_id" = l."id";

ALTER TABLE "purchases"
  ADD CONSTRAINT "purchases_responsavel_id_fkey"
  FOREIGN KEY ("responsavel_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "purchases_responsavel_id_idx" ON "purchases"("responsavel_id");
