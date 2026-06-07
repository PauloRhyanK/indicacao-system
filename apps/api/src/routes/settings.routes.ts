import type { FastifyInstance } from "fastify";
import {
  getConsortiumTypes,
  patchConsortiumType,
  postConsortiumType,
  removeConsortiumType,
} from "../controllers/consortiumType.controller.js";
import {
  getLookups,
  patchLookup,
  postLookupItem,
  removeLookup,
} from "../controllers/settings.controller.js";
import { listLookups, type LookupKind } from "../services/lookup.service.js";
import { authenticate, requirePermission } from "../middlewares/auth.js";

const ROUTE_MAP: Record<string, LookupKind> = {
  "lead-statuses": "status",
  "lead-sources": "source",
  "next-actions": "action",
};

const authManage = [authenticate, requirePermission("settings.manage")];
const authRead = [authenticate];

export async function settingsRoutes(app: FastifyInstance) {
  app.get("/settings/lookups", { preHandler: authRead }, getLookups);

  app.get("/settings/consortium-types", { preHandler: authRead }, getConsortiumTypes);
  app.post("/settings/consortium-types", { preHandler: authManage }, postConsortiumType);
  app.patch("/settings/consortium-types/:id", { preHandler: authManage }, patchConsortiumType);
  app.delete("/settings/consortium-types/:id", { preHandler: authManage }, removeConsortiumType);

  for (const [route, kind] of Object.entries(ROUTE_MAP)) {
    app.get(`/settings/${route}`, { preHandler: authRead }, async (_req, reply) => {
      const data = await listLookups(kind);
      return reply.send({ data });
    });

    app.post(`/settings/${route}`, { preHandler: authManage }, postLookupItem);
    app.patch(`/settings/${route}/:id`, { preHandler: authManage }, patchLookup);
    app.delete(`/settings/${route}/:id`, { preHandler: authManage }, removeLookup);
  }
}
