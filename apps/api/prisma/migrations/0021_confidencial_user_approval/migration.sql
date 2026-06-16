-- Aprovação manual de usuários confidenciais antes do primeiro acesso ao conteúdo
ALTER TABLE "users" ADD COLUMN "confidencial_approved_at" TIMESTAMP(3);

-- Usuários confidenciais existentes permanecem aprovados
UPDATE "users"
SET "confidencial_approved_at" = COALESCE("created_at", NOW())
WHERE "access_scope" = 'CONFIDENCIAL'
  AND "confidencial_approved_at" IS NULL;
