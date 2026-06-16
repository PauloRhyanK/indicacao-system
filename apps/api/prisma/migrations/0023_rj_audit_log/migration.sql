-- Trilha de auditoria do módulo RJ (credores, config, usuários, papéis)

CREATE TABLE "rj_audit_logs" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor_id" UUID,
    "actor_name" TEXT NOT NULL,
    "actor_email" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "entity_label" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "changes" JSONB,

    CONSTRAINT "rj_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "rj_audit_logs_created_at_idx" ON "rj_audit_logs"("created_at" DESC);
CREATE INDEX "rj_audit_logs_entity_type_entity_id_idx" ON "rj_audit_logs"("entity_type", "entity_id");
CREATE INDEX "rj_audit_logs_actor_id_idx" ON "rj_audit_logs"("actor_id");
