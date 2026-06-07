import type { FastifyReply, FastifyRequest } from "fastify";
import { env } from "../config/env.js";
import { userHasAnyPermission } from "../services/permission.service.js";
import {
  applyDailyPresetSchema,
  monthQuerySchema,
  upsertDailyDefaultsSchema,
  upsertDailyOverrideSchema,
} from "../schemas/dailyGoal.schema.js";
import {
  applyPresetToday,
  deleteOverride,
  getDailyTodaySummary,
  getDefaults,
  getOverridesForMonth,
  upsertDefaults,
  upsertOverride,
} from "../services/dailyGoal.service.js";
import { unauthorized } from "../utils/httpError.js";

export async function getDailyToday(_request: FastifyRequest, reply: FastifyReply) {
  const data = await getDailyTodaySummary();
  return reply.send({ data });
}

export async function getDailyDefaults(_request: FastifyRequest, reply: FastifyReply) {
  const data = await getDefaults();
  return reply.send({ data });
}

export async function putDailyDefaults(request: FastifyRequest, reply: FastifyReply) {
  const input = upsertDailyDefaultsSchema.parse(request.body);
  const data = await upsertDefaults(input);
  return reply.send({ data });
}

export async function getDailyOverrides(request: FastifyRequest, reply: FastifyReply) {
  const { month } = monthQuerySchema.parse(request.query);
  const [year, m] = month.split("-").map(Number);
  const data = await getOverridesForMonth(year, m);
  return reply.send({ data });
}

export async function putDailyOverride(request: FastifyRequest, reply: FastifyReply) {
  const { date } = request.params as { date: string };
  const input = upsertDailyOverrideSchema.parse(request.body);
  const data = await upsertOverride(date, input);
  return reply.send({ data });
}

export async function removeDailyOverride(request: FastifyRequest, reply: FastifyReply) {
  const { date } = request.params as { date: string };
  await deleteOverride(date);
  return reply.status(204).send();
}

async function canApplyPreset(request: FastifyRequest): Promise<boolean> {
  const tvHeader = request.headers["x-tv-token"];
  const tvToken = Array.isArray(tvHeader) ? tvHeader[0] : tvHeader;
  if (env.TV_API_TOKEN && tvToken === env.TV_API_TOKEN) return true;

  try {
    await request.jwtVerify();
    return userHasAnyPermission(request.user.sub, ["meta.configure_day"]);
  } catch {
    return false;
  }
}

export async function postDailyPresetToday(request: FastifyRequest, reply: FastifyReply) {
  if (!(await canApplyPreset(request))) {
    throw unauthorized("Token de TV ou permissão meta.configure_day necessária");
  }
  const input = applyDailyPresetSchema.parse(request.body);
  const data = await applyPresetToday(input.presetSlug);
  return reply.send({ data });
}
