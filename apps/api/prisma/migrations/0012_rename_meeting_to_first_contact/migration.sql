-- Compatibilidade: renomeia coluna legada se a migration 0011 antiga já foi aplicada
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'leads'
      AND column_name = 'meeting_marked_by_id'
  ) THEN
    ALTER TABLE "leads" RENAME COLUMN "meeting_marked_by_id" TO "first_contact_id";
    ALTER TABLE "leads" DROP CONSTRAINT IF EXISTS "leads_meeting_marked_by_id_fkey";
    DROP INDEX IF EXISTS "leads_meeting_marked_by_id_idx";
  END IF;
END $$;

ALTER TABLE "leads" DROP CONSTRAINT IF EXISTS "leads_first_contact_id_fkey";
ALTER TABLE "leads" ADD CONSTRAINT "leads_first_contact_id_fkey"
  FOREIGN KEY ("first_contact_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "leads_first_contact_id_idx" ON "leads"("first_contact_id");
