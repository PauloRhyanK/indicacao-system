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

export async function investRoutes(app: FastifyInstance) {
  app.get("/investimentos/leads", { preHandler: [...investView] }, getInvestLeads);

  app.get("/investimentos/export/csv", { preHandler: [...investView] }, getInvestLeadsCsv);

  app.post("/investimentos/leads", { preHandler: [...investManage] }, postInvestLead);

  app.patch("/investimentos/leads/:id", { preHandler: [...investManage] }, patchInvestLead);

  app.patch(
    "/investimentos/leads/:id/etapa",
    { preHandler: [...investManage] },
    patchInvestLeadEtapa,
  );

  app.delete("/investimentos/leads/:id", { preHandler: [...investManage] }, deleteInvestLead);

  app.get("/investimentos/config", { preHandler: [...investView] }, getInvestConfigHandler);

  app.put("/investimentos/config", { preHandler: [...investManage] }, putInvestConfig);

  app.post("/investimentos/import", { preHandler: [...investImport] }, postInvestImport);
}
