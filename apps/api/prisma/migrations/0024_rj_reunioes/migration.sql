-- Agenda de reuniões do módulo RJ (reuniões com credores + participantes internos)

CREATE TABLE "rj_reunioes" (
    "id" UUID NOT NULL,
    "credor_id" UUID NOT NULL,
    "titulo" TEXT NOT NULL,
    "data_hora_inicio" TIMESTAMP(3) NOT NULL,
    "data_hora_fim" TIMESTAMP(3),
    "local" TEXT,
    "link_online" TEXT,
    "status" TEXT NOT NULL DEFAULT 'agendada',
    "pauta" TEXT,
    "resultado" TEXT,
    "criado_por_id" UUID NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rj_reunioes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "rj_reuniao_participantes" (
    "id" UUID NOT NULL,
    "reuniao_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "confirmado" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rj_reuniao_participantes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "rj_reunioes_credor_id_idx" ON "rj_reunioes"("credor_id");
CREATE INDEX "rj_reunioes_data_hora_inicio_idx" ON "rj_reunioes"("data_hora_inicio");
CREATE INDEX "rj_reunioes_deleted_at_idx" ON "rj_reunioes"("deleted_at");

CREATE INDEX "rj_reuniao_participantes_user_id_idx" ON "rj_reuniao_participantes"("user_id");
CREATE UNIQUE INDEX "rj_reuniao_participantes_reuniao_id_user_id_key" ON "rj_reuniao_participantes"("reuniao_id", "user_id");

ALTER TABLE "rj_reunioes" ADD CONSTRAINT "rj_reunioes_credor_id_fkey" FOREIGN KEY ("credor_id") REFERENCES "rj_credores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rj_reunioes" ADD CONSTRAINT "rj_reunioes_criado_por_id_fkey" FOREIGN KEY ("criado_por_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "rj_reuniao_participantes" ADD CONSTRAINT "rj_reuniao_participantes_reuniao_id_fkey" FOREIGN KEY ("reuniao_id") REFERENCES "rj_reunioes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rj_reuniao_participantes" ADD CONSTRAINT "rj_reuniao_participantes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
