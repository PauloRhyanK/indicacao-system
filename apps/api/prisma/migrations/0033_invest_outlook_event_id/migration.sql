-- Outlook: id do evento criado no calendário do assessor, por reunião.
-- Idempotente: em dev a coluna já existe (via db push); em produção é criada.
ALTER TABLE "invest_reunioes" ADD COLUMN IF NOT EXISTS "outlook_event_id" TEXT;
