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
import { authenticate } from "../middlewares/auth.js";

const ROUTE_MAP: Record<string, LookupKind> = {
  "lead-statuses": "status",
  "lead-sources": "source",
  "next-actions": "action",
};

export async function settingsRoutes(app: FastifyInstance) {
  app.get("/settings/lookups", { preHandler: [authenticate] }, getLookups);

  app.get("/settings/consortium-types", { preHandler: [authenticate] }, getConsortiumTypes);
  app.post("/settings/consortium-types", { preHandler: [authenticate] }, postConsortiumType);
  app.patch("/settings/consortium-types/:id", { preHandler: [authenticate] }, patchConsortiumType);
  app.delete("/settings/consortium-types/:id", { preHandler: [authenticate] }, removeConsortiumType);

  for (const [route, kind] of Object.entries(ROUTE_MAP)) {
    app.get(`/settings/${route}`, { preHandler: [authenticate] }, async (_req, reply) => {
      const data = await listLookups(kind);
      return reply.send({ data });
    });

    app.post(`/settings/${route}`, { preHandler: [authenticate] }, postLookupItem);
    app.patch(`/settings/${route}/:id`, { preHandler: [authenticate] }, patchLookup);
    app.delete(`/settings/${route}/:id`, { preHandler: [authenticate] }, removeLookup);
  }
}
