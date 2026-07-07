import type { FastifyInstance } from "fastify";
import {
  deleteInvestLead,
  deleteInvestReuniao,
  getInvestAssessorFaixas,
  getInvestAssessores,
  getInvestAssessorSlotsHandler,
  getInvestConfigHandler,
  getInvestLeads,
  getInvestLeadsGrid,
  getInvestLeadsCsv,
  getInvestReunioes,
  getInvestTv,
  patchInvestLead,
  patchInvestLeadEtapa,
  postInvestCheckParticipantes,
  postInvestImport,
  postInvestLead,
  postInvestQualify,
  postInvestReuniao,
  putInvestAssessorFaixas,
  putInvestConfig,
  getInvestOutlookAuth,
  getInvestOutlookCallback,
} from "../controllers/invest.controller.js";
import {
  deleteInvestPitch,
  getInvestPitchById,
  getInvestPitches,
  patchInvestPitch,
  postInvestPitch,
} from "../controllers/invest-pitch.controller.js";
import { authenticate, requirePermission } from "../middlewares/auth.js";

const investView = [authenticate, requirePermission("investimentos.view")] as const;
const investManage = [authenticate, requirePermission("investimentos.manage")] as const;
const investImport = [authenticate, requirePermission("investimentos.import")] as const;
// Captação: qualquer colaborador com create (ou gestão) pode cadastrar lead.
const investCreate = [
  authenticate,
  requirePermission("investimentos.create", "investimentos.manage"),
] as const;
// Edição: SDR/Assessor/Qualificador editam leads; gestão total também.
const investEdit = [
  authenticate,
  requirePermission("investimentos.edit", "investimentos.manage"),
] as const;
// Agendar reunião: SDR (schedule) ou gestão.
const investSchedule = [
  authenticate,
  requirePermission("investimentos.schedule", "investimentos.manage"),
] as const;
// Qualificar: Qualificador (qualify) ou gestão.
const investQualify = [
  authenticate,
  requirePermission("investimentos.qualify", "investimentos.manage"),
] as const;

export async function investRoutes(app: FastifyInstance) {
  // Painel TV — público (sala comercial), como o /goals/daily/today do consórcio.
  app.get("/investimentos/tv", getInvestTv);

  app.get("/investimentos/leads", { preHandler: [...investView] }, getInvestLeads);

  app.get("/investimentos/leads/grid", { preHandler: [...investView] }, getInvestLeadsGrid);

  app.get("/investimentos/export/csv", { preHandler: [...investView] }, getInvestLeadsCsv);

  app.post("/investimentos/leads", { preHandler: [...investCreate] }, postInvestLead);

  app.patch("/investimentos/leads/:id", { preHandler: [...investEdit] }, patchInvestLead);

  app.patch(
    "/investimentos/leads/:id/etapa",
    { preHandler: [...investEdit] },
    patchInvestLeadEtapa,
  );

  app.delete("/investimentos/leads/:id", { preHandler: [...investManage] }, deleteInvestLead);

  app.post("/investimentos/leads/:id/qualificar", { preHandler: [...investQualify] }, postInvestQualify);

  app.get("/investimentos/config", { preHandler: [...investView] }, getInvestConfigHandler);

  app.put("/investimentos/config", { preHandler: [...investManage] }, putInvestConfig);

  app.post("/investimentos/import", { preHandler: [...investImport] }, postInvestImport);

  // Biblioteca de pitches (playbook) — leitura para todos com view, gestão para manage.
  app.get("/investimentos/pitches", { preHandler: [...investView] }, getInvestPitches);
  app.get("/investimentos/pitches/:id", { preHandler: [...investView] }, getInvestPitchById);
  app.post("/investimentos/pitches", { preHandler: [...investManage] }, postInvestPitch);
  app.patch("/investimentos/pitches/:id", { preHandler: [...investManage] }, patchInvestPitch);
  app.delete("/investimentos/pitches/:id", { preHandler: [...investManage] }, deleteInvestPitch);

  // Agenda de reuniões (KUS-153/149)
  app.get("/investimentos/assessores", { preHandler: [...investView] }, getInvestAssessores);
  app.get("/investimentos/assessores/:id/slots", { preHandler: [...investSchedule] }, getInvestAssessorSlotsHandler);
  app.get("/investimentos/reunioes", { preHandler: [...investView] }, getInvestReunioes);
  app.post(
    "/investimentos/reunioes/check-participantes",
    { preHandler: [...investSchedule] },
    postInvestCheckParticipantes,
  );
  app.post("/investimentos/reunioes", { preHandler: [...investSchedule] }, postInvestReuniao);
  app.delete("/investimentos/reunioes/:id", { preHandler: [...investSchedule] }, deleteInvestReuniao);
  app.get("/investimentos/assessor-faixas", { preHandler: [...investManage] }, getInvestAssessorFaixas);
  app.put(
    "/investimentos/assessores/:id/faixas",
    { preHandler: [...investManage] },
    putInvestAssessorFaixas,
  );

  // Microsoft Outlook Integration
  app.get("/investimentos/outlook/auth", { preHandler: [authenticate] }, getInvestOutlookAuth);
  app.get("/investimentos/outlook/callback", getInvestOutlookCallback);
}
