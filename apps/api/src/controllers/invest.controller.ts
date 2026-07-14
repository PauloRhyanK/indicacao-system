import type { FastifyReply, FastifyRequest } from "fastify";
import {
  createInvestLeadSchema,
  checkParticipantesSchema,
  createInvestReuniaoSchema,
  investGridQuerySchema,
  importInvestLeadsSchema,
  listReunioesQuerySchema,
  qualifyInvestLeadSchema,
  setAssessorFaixasSchema,
  updateInvestConfigSchema,
  updateInvestEtapaSchema,
  updateInvestLeadSchema,
} from "../schemas/invest.schema.js";
import {
  cancelReuniao,
  createReuniao,
  getAssessorFaixasMap,
  getParticipantConflicts,
  listAssessoresParaFaixa,
  listReunioes,
  setAssessorFaixas,
  getAssessorSlots,
} from "../services/investAgenda.service.js";
import type { InvestFaixa } from "../constants/invest.js";
import {
  createInvestLead,
  exportInvestLeadsCsv,
  getInvestConfig,
  getInvestTvData,
  importInvestLeads,
  listInvestLeads,
  listInvestLeadsGrid,
  qualifyLead,
  softDeleteInvestLead,
  updateInvestConfig,
  updateInvestEtapa,
  updateInvestLead,
} from "../services/invest.service.js";
import { getOutlookAuthUrl, handleOutlookCallback } from "../services/outlook.service.js";
import {
  convertInvestClienteToLead,
  getInvestClienteById,
  importInvestClientes,
  listInvestClienteAssessores,
  listInvestClientes,
} from "../services/investCliente.service.js";
import {
  convertInvestClienteSchema,
  importInvestClientesSchema,
  investClientesQuerySchema,
} from "../schemas/investCliente.schema.js";

function actorId(request: FastifyRequest) {
  return request.user?.sub;
}

/** Escapa texto para inserção segura em HTML (evita XSS refletido). */
function escapeHtml(value: string): string {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

export async function getInvestLeads(_request: FastifyRequest, reply: FastifyReply) {
  const data = await listInvestLeads();
  return reply.send({ data });
}

export async function getInvestLeadsGrid(request: FastifyRequest, reply: FastifyReply) {
  const query = investGridQuerySchema.parse(request.query);
  const data = await listInvestLeadsGrid(query, actorId(request));
  return reply.send({ data });
}

export async function postInvestLead(request: FastifyRequest, reply: FastifyReply) {
  const input = createInvestLeadSchema.parse(request.body);
  const data = await createInvestLead(input, actorId(request));
  return reply.status(201).send({ data });
}

export async function patchInvestLead(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const input = updateInvestLeadSchema.parse(request.body);
  const data = await updateInvestLead(id, input, actorId(request));
  return reply.send({ data });
}

export async function patchInvestLeadEtapa(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const input = updateInvestEtapaSchema.parse(request.body);
  const data = await updateInvestEtapa(id, input);
  return reply.send({ data });
}

export async function deleteInvestLead(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  await softDeleteInvestLead(id);
  return reply.status(204).send();
}

export async function postInvestQualify(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const input = qualifyInvestLeadSchema.parse(request.body);
  const data = await qualifyLead(id, input.faixa, actorId(request), input.pitchId);
  return reply.send({ data });
}

export async function getInvestConfigHandler(_request: FastifyRequest, reply: FastifyReply) {
  const data = await getInvestConfig();
  return reply.send({ data });
}

export async function getInvestTv(_request: FastifyRequest, reply: FastifyReply) {
  const data = await getInvestTvData();
  return reply.send({ data });
}

export async function putInvestConfig(request: FastifyRequest, reply: FastifyReply) {
  const input = updateInvestConfigSchema.parse(request.body);
  const data = await updateInvestConfig(input);
  return reply.send({ data });
}

export async function postInvestImport(request: FastifyRequest, reply: FastifyReply) {
  const input = importInvestLeadsSchema.parse(request.body);
  const data = await importInvestLeads(input.rows, input.aliases, actorId(request));
  return reply.send({ data });
}

export async function getInvestLeadsCsv(_request: FastifyRequest, reply: FastifyReply) {
  const csv = await exportInvestLeadsCsv();
  return reply
    .header("Content-Type", "text/csv; charset=utf-8")
    .header("Content-Disposition", 'attachment; filename="pipeline_investimentos.csv"')
    .send(`\ufeff${csv}`);
}

// --- Agenda de reuni\u00f5es (KUS-153/149) --------------------------------------

export async function getInvestAssessores(request: FastifyRequest, reply: FastifyReply) {
  const { faixa } = request.query as { faixa?: string };
  const data = await listAssessoresParaFaixa((faixa ?? null) as InvestFaixa | null);
  return reply.send({ data });
}

export async function getInvestAssessorSlotsHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const { date, duracaoMinutos } = request.query as { date: string; duracaoMinutos?: string }; // YYYY-MM-DD
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return reply.status(400).send({ message: "Data inválida ou ausente (use YYYY-MM-DD)." });
  }
  const minutos = duracaoMinutos ? Number(duracaoMinutos) : 60;
  const durationMs = (Number.isFinite(minutos) && minutos > 0 ? minutos : 60) * 60 * 1000;
  const data = await getAssessorSlots(id, date, durationMs);
  return reply.send({ data });
}

export async function postInvestReuniao(request: FastifyRequest, reply: FastifyReply) {
  const input = createInvestReuniaoSchema.parse(request.body);
  const data = await createReuniao(input, actorId(request));
  return reply.status(201).send({ data });
}

const CHECK_DEFAULT_DURATION_MS = 60 * 60 * 1000;

export async function postInvestCheckParticipantes(request: FastifyRequest, reply: FastifyReply) {
  const input = checkParticipantesSchema.parse(request.body);
  const inicio = new Date(input.dataHoraInicio);
  if (Number.isNaN(inicio.getTime())) {
    return reply.status(400).send({ message: "Data/hora inválida." });
  }
  const fim = input.dataHoraFim
    ? new Date(input.dataHoraFim)
    : new Date(inicio.getTime() + CHECK_DEFAULT_DURATION_MS);
  const data = await getParticipantConflicts(inicio, fim, input.participantIds);
  return reply.send({ data });
}

export async function getInvestReunioes(request: FastifyRequest, reply: FastifyReply) {
  const query = listReunioesQuerySchema.parse(request.query);
  const assessorId = query.scope === "mine" ? actorId(request) : query.assessorId;
  const data = await listReunioes({ assessorId, leadId: query.leadId });
  return reply.send({ data });
}

export async function deleteInvestReuniao(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  await cancelReuniao(id);
  return reply.status(204).send();
}

export async function getInvestAssessorFaixas(_request: FastifyRequest, reply: FastifyReply) {
  const data = await getAssessorFaixasMap();
  return reply.send({ data });
}

export async function putInvestAssessorFaixas(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const input = setAssessorFaixasSchema.parse(request.body);
  const data = await setAssessorFaixas(id, input);
  return reply.send({ data });
}

export async function getInvestOutlookAuth(request: FastifyRequest, reply: FastifyReply) {
  const url = getOutlookAuthUrl(actorId(request));
  return reply.send({ url });
}

export async function getInvestOutlookCallback(request: FastifyRequest, reply: FastifyReply) {
  const query = request.query as Record<string, string>;
  const { code, state, admin_consent, error, error_description } = query;

  // Se for o fluxo de admin consent, a Microsoft manda admin_consent=True
  if (admin_consent === "True") {
    reply.type("text/html").send(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Consentimento Concedido</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #f3f4f6; }
          .card { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); text-align: center; max-width: 400px; }
          h1 { color: #10b981; font-size: 1.5rem; margin-top: 0; }
          p { color: #4b5563; margin-bottom: 1.5rem; }
          button { background-color: #3b82f6; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; font-weight: 500; }
          button:hover { background-color: #2563eb; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>✅ Consentimento Concedido</h1>
          <p>O aplicativo CAIS INDICAÇÕES foi autorizado com sucesso para a sua organização.</p>
          <p>Os usuários já podem fazer login normalmente.</p>
          <button onclick="window.close()">Fechar esta aba</button>
        </div>
      </body>
      </html>
    `);
    return;
  }

  // Se o admin recusar, a Microsoft manda error
  if (error && !code) {
     reply.type("text/html").send(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Erro no Consentimento</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #f3f4f6; }
          .card { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); text-align: center; max-width: 400px; }
          h1 { color: #ef4444; font-size: 1.5rem; margin-top: 0; }
          p { color: #4b5563; margin-bottom: 1.5rem; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>❌ Consentimento Não Concedido</h1>
          <p>Houve um erro ou o consentimento foi recusado.</p>
          <p style="font-size: 0.875rem; color: #6b7280;">Detalhe: ${escapeHtml(error_description || error)}</p>
        </div>
      </body>
      </html>
    `);
    return;
  }

  if (!code || !state) {
    return reply.status(400).send({ error: "Faltando code ou state." });
  }

  // O state é assinado; handleOutlookCallback valida e extrai o userId.
  await handleOutlookCallback(code, state);

  // Redireciona de volta para a página de reuniões
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  return reply.redirect(`${frontendUrl}/investimentos/reunioes?outlook=connected`);
}

// --- Clientes BTG ----------------------------------------------------------------

export async function getInvestClientes(request: FastifyRequest, reply: FastifyReply) {
  const query = investClientesQuerySchema.parse(request.query);
  const data = await listInvestClientes(query);
  return reply.send({ data });
}

export async function getInvestCliente(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const data = await getInvestClienteById(id);
  return reply.send({ data });
}

export async function getInvestClienteAssessores(_request: FastifyRequest, reply: FastifyReply) {
  const data = await listInvestClienteAssessores();
  return reply.send({ data });
}

export async function postInvestClientesImport(request: FastifyRequest, reply: FastifyReply) {
  const input = importInvestClientesSchema.parse(request.body);
  const data = await importInvestClientes(input.rows, actorId(request));
  return reply.send({ data });
}

export async function postInvestClienteConverter(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const input = convertInvestClienteSchema.parse(request.body);
  const data = await convertInvestClienteToLead(id, input, actorId(request));
  return reply.status(data.alreadyConverted ? 200 : 201).send({ data });
}
