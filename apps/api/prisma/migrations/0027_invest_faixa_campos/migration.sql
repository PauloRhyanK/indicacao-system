-- Investimentos: faixa do cliente + campos extras do card (indicado por, celular)
-- e liberação do sistema de investimento para o papel Colaborador.

ALTER TABLE "invest_leads" ADD COLUMN "faixa" TEXT;
ALTER TABLE "invest_leads" ADD COLUMN "indicado_por" TEXT NOT NULL DEFAULT '';
ALTER TABLE "invest_leads" ADD COLUMN "celular" TEXT NOT NULL DEFAULT '';

-- Backfill da faixa a partir do PL (limiares do gestor: Private ≥ 5M, Wealth ≥ 30M).
UPDATE "invest_leads"
SET "faixa" = CASE
    WHEN "pl" >= 30000000 THEN 'wealth'
    WHEN "pl" >= 5000000 THEN 'private'
    ELSE 'digital'
END
WHERE "faixa" IS NULL;

-- Investimento passa a ser o sistema principal para todos: o papel Colaborador
-- recebe as permissões do sistema de investimento.
INSERT INTO "role_permissions" ("role_id", "permission_key")
SELECT r."id", p."key"
FROM "roles" r
CROSS JOIN (VALUES ('investimentos.view'), ('investimentos.manage'), ('investimentos.import')) AS p("key")
WHERE r."name" = 'Colaborador'
ON CONFLICT DO NOTHING;
