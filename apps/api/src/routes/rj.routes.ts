import type { FastifyInstance } from "fastify";
import {
  deleteRjCredor,
  getRjConfig,
  getRjCredores,
  getRjCredoresCsv,
  patchRjCredor,
  patchRjCredorStatus,
  postRjCredor,
  putRjConfig,
} from "../controllers/rj.controller.js";
import { authenticate, requirePermission } from "../middlewares/auth.js";

export async function rjRoutes(app: FastifyInstance) {
  app.get(
    "/rj/credores",
    { preHandler: [authenticate, requirePermission("rj.view")] },
    getRjCredores,
  );

  app.get(
    "/rj/credores/export/csv",
    { preHandler: [authenticate, requirePermission("rj.view")] },
    getRjCredoresCsv,
  );

  app.post(
    "/rj/credores",
    { preHandler: [authenticate, requirePermission("rj.manage")] },
    postRjCredor,
  );

  app.patch(
    "/rj/credores/:id",
    { preHandler: [authenticate, requirePermission("rj.manage")] },
    patchRjCredor,
  );

  app.patch(
    "/rj/credores/:id/status",
    { preHandler: [authenticate, requirePermission("rj.manage")] },
    patchRjCredorStatus,
  );

  app.delete(
    "/rj/credores/:id",
    { preHandler: [authenticate, requirePermission("rj.manage")] },
    deleteRjCredor,
  );

  app.get(
    "/rj/config",
    { preHandler: [authenticate, requirePermission("rj.view")] },
    getRjConfig,
  );

  app.put(
    "/rj/config",
    { preHandler: [authenticate, requirePermission("rj.manage")] },
    putRjConfig,
  );
}
