import type { FastifyInstance } from "fastify";
import {
  deleteInvestLead,
  getInvestConfigHandler,
  getInvestLeads,
  getInvestLeadsCsv,
  patchInvestLead,
  patchInvestLeadEtapa,
  postInvestImport,
  postInvestLead,
  putInvestConfig,
} from "../controllers/invest.controller.js";
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

export async function investRoutes(app: FastifyInstance) {
  app.get("/investimentos/leads", { preHandler: [...investView] }, getInvestLeads);

  app.get("/investimentos/export/csv", { preHandler: [...investView] }, getInvestLeadsCsv);

  app.post("/investimentos/leads", { preHandler: [...investCreate] }, postInvestLead);

  app.patch("/investimentos/leads/:id", { preHandler: [...investEdit] }, patchInvestLead);

  app.patch(
    "/investimentos/leads/:id/etapa",
    { preHandler: [...investEdit] },
    patchInvestLeadEtapa,
  );

  app.delete("/investimentos/leads/:id", { preHandler: [...investManage] }, deleteInvestLead);

  app.get("/investimentos/config", { preHandler: [...investView] }, getInvestConfigHandler);

  app.put("/investimentos/config", { preHandler: [...investManage] }, putInvestConfig);

  app.post("/investimentos/import", { preHandler: [...investImport] }, postInvestImport);
}
