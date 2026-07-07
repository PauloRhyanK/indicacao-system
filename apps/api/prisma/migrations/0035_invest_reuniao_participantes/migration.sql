-- Participantes adicionais (colegas internos) em reuniões de investimento (KUS).

CREATE TABLE "invest_reuniao_participantes" (
    "id" UUID NOT NULL,
    "reuniao_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invest_reuniao_participantes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "invest_reuniao_participantes_reuniao_id_user_id_key" ON "invest_reuniao_participantes"("reuniao_id", "user_id");
CREATE INDEX "invest_reuniao_participantes_user_id_idx" ON "invest_reuniao_participantes"("user_id");

ALTER TABLE "invest_reuniao_participantes"
    ADD CONSTRAINT "invest_reuniao_participantes_reuniao_id_fkey"
    FOREIGN KEY ("reuniao_id") REFERENCES "invest_reunioes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "invest_reuniao_participantes"
    ADD CONSTRAINT "invest_reuniao_participantes_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
