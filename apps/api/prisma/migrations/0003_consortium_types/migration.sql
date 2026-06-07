-- CreateTable consortium_types
CREATE TABLE "consortium_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "consortium_types_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "consortium_types_slug_key" ON "consortium_types"("slug");

INSERT INTO "consortium_types" ("slug", "name") VALUES
  ('imovel', 'Imóvel'),
  ('auto', 'Automóvel'),
  ('pesados', 'Pesados (Caminhões/Tratores)'),
  ('nautico', 'Náutico'),
  ('servicos', 'Serviços');

-- users.phone
ALTER TABLE "users" ADD COLUMN "phone" TEXT;

-- purchases.consortium_type_id
ALTER TABLE "purchases" ADD COLUMN "consortium_type_id" UUID;

ALTER TABLE "purchases" ADD CONSTRAINT "purchases_consortium_type_id_fkey"
  FOREIGN KEY ("consortium_type_id") REFERENCES "consortium_types"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "purchases_consortium_type_id_idx" ON "purchases"("consortium_type_id");
