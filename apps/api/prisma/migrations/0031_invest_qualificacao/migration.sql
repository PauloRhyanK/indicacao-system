-- KUS-152: qualificação neutra — registro de quem qualificou e quando.

ALTER TABLE "invest_leads" ADD COLUMN "qualificado_por_id" UUID;
ALTER TABLE "invest_leads" ADD COLUMN "qualificado_em" TIMESTAMP(3);

ALTER TABLE "invest_leads"
    ADD CONSTRAINT "invest_leads_qualificado_por_id_fkey"
    FOREIGN KEY ("qualificado_por_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
