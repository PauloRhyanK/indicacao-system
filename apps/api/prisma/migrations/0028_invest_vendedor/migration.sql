-- KUS-139: dupla Responsável + Vendedor/Assessor e co-vendedor no lead de investimento.

ALTER TABLE "invest_leads" ADD COLUMN "vendedor_id" UUID;
ALTER TABLE "invest_leads" ADD COLUMN "co_vendedor_id" UUID;

ALTER TABLE "invest_leads"
    ADD CONSTRAINT "invest_leads_vendedor_id_fkey"
    FOREIGN KEY ("vendedor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "invest_leads"
    ADD CONSTRAINT "invest_leads_co_vendedor_id_fkey"
    FOREIGN KEY ("co_vendedor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "invest_leads_vendedor_id_idx" ON "invest_leads"("vendedor_id");
