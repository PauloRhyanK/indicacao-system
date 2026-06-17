import type { FastifyInstance } from "fastify";
import {
  deleteRjReuniao,
  getRjCredorReunioes,
  getRjReuniao,
  getRjReuniaoIcs,
  getRjReuniaoParticipantesOpcoes,
  getRjReunioes,
  patchRjReuniao,
  patchRjReuniaoStatus,
  postRjReuniao,
} from "../controllers/rjReuniao.controller.js";
import {
  authenticate,
  requireConfidencialApproved,
  requirePermission,
} from "../middlewares/auth.js";

const rjView = [authenticate, requireConfidencialApproved, requirePermission("rj.view")] as const;
const rjAgendaView = [
  authenticate,
  requireConfidencialApproved,
  requirePermission("rj.agenda.view"),
] as const;
const rjAgendaManage = [
  authenticate,
  requireConfidencialApproved,
  requirePermission("rj.agenda.manage"),
] as const;

export async function rjReuniaoRoutes(app: FastifyInstance) {
  app.get("/rj/reunioes", { preHandler: [...rjAgendaView] }, getRjReunioes);

  app.get(
    "/rj/reunioes/participantes-opcoes",
    { preHandler: [...rjAgendaManage] },
    getRjReuniaoParticipantesOpcoes,
  );

  app.get("/rj/reunioes/:id", { preHandler: [...rjAgendaView] }, getRjReuniao);

  app.post("/rj/reunioes", { preHandler: [...rjAgendaManage] }, postRjReuniao);

  app.patch("/rj/reunioes/:id", { preHandler: [...rjAgendaManage] }, patchRjReuniao);

  app.patch("/rj/reunioes/:id/status", { preHandler: [...rjAgendaManage] }, patchRjReuniaoStatus);

  app.delete("/rj/reunioes/:id", { preHandler: [...rjAgendaManage] }, deleteRjReuniao);

  app.get("/rj/reunioes/:id/ics", { preHandler: [...rjAgendaView] }, getRjReuniaoIcs);

  app.get("/rj/credores/:id/reunioes", { preHandler: [...rjView] }, getRjCredorReunioes);
}
