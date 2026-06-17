-- CreateTable
CREATE TABLE "rj_google_integracoes" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "google_email" TEXT NOT NULL,
    "refresh_token_enc" TEXT NOT NULL,
    "calendar_id" TEXT NOT NULL,
    "conectado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimo_sync_em" TIMESTAMP(3),
    "ultimo_erro" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rj_google_integracoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rj_reuniao_google_eventos" (
    "id" UUID NOT NULL,
    "reuniao_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "google_event_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'sincronizado',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rj_reuniao_google_eventos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rj_google_integracoes_user_id_key" ON "rj_google_integracoes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "rj_reuniao_google_eventos_reuniao_id_user_id_key" ON "rj_reuniao_google_eventos"("reuniao_id", "user_id");

-- CreateIndex
CREATE INDEX "rj_reuniao_google_eventos_user_id_idx" ON "rj_reuniao_google_eventos"("user_id");

-- AddForeignKey
ALTER TABLE "rj_google_integracoes" ADD CONSTRAINT "rj_google_integracoes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rj_reuniao_google_eventos" ADD CONSTRAINT "rj_reuniao_google_eventos_reuniao_id_fkey" FOREIGN KEY ("reuniao_id") REFERENCES "rj_reunioes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rj_reuniao_google_eventos" ADD CONSTRAINT "rj_reuniao_google_eventos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
