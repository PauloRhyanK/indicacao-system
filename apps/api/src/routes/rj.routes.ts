import type { FastifyInstance } from "fastify";
import {
  deleteRjCredor,
  getRjConfig,
  getRjCredorHistorico,
  getRjCredores,
  getRjCredoresCsv,
  getRjCredoresXlsx,
  getRjHistorico,
  patchRjCredor,
  patchRjCredorStatus,
  postRjCredor,
  putRjConfig,
} from "../controllers/rj.controller.js";
import {
  getConfidencialUsers,
  postConfidencialUser,
  removeConfidencialUser,
  approveConfidencialUserHandler,
  resetConfidencialUserPasswordHandler,
} from "../controllers/confidencialUser.controller.js";
import {
  getRjPermissionsCatalog,
  getRjRoles,
  getRjUserRolesHandler,
  patchRjRole,
  postRjRole,
  putRjRolePermissions,
  putRjUserRoles,
  removeRjRole,
} from "../controllers/rjRole.controller.js";
import {
  authenticate,
  requireConfidencialApproved,
  requirePermission,
} from "../middlewares/auth.js";

const rjView = [authenticate, requireConfidencialApproved, requirePermission("rj.view")] as const;
const rjManage = [authenticate, requireConfidencialApproved, requirePermission("rj.manage")] as const;
const rjSettings = [authenticate, requireConfidencialApproved, requirePermission("rj.settings")] as const;

export async function rjRoutes(app: FastifyInstance) {
  app.get("/rj/credores", { preHandler: [...rjView] }, getRjCredores);

  app.get("/rj/credores/export/csv", { preHandler: [...rjView] }, getRjCredoresCsv);
  app.get("/rj/credores/export/xlsx", { preHandler: [...rjView] }, getRjCredoresXlsx);

  app.post("/rj/credores", { preHandler: [...rjManage] }, postRjCredor);

  app.patch("/rj/credores/:id", { preHandler: [...rjManage] }, patchRjCredor);

  app.patch("/rj/credores/:id/status", { preHandler: [...rjManage] }, patchRjCredorStatus);

  app.delete("/rj/credores/:id", { preHandler: [...rjManage] }, deleteRjCredor);

  app.get("/rj/config", { preHandler: [...rjView] }, getRjConfig);

  app.put("/rj/config", { preHandler: [...rjManage] }, putRjConfig);

  app.get("/rj/permissions/catalog", { preHandler: [...rjSettings] }, getRjPermissionsCatalog);

  app.get("/rj/roles", { preHandler: [...rjSettings] }, getRjRoles);

  app.post("/rj/roles", { preHandler: [...rjSettings] }, postRjRole);

  app.patch("/rj/roles/:id", { preHandler: [...rjSettings] }, patchRjRole);

  app.delete("/rj/roles/:id", { preHandler: [...rjSettings] }, removeRjRole);

  app.put("/rj/roles/:id/permissions", { preHandler: [...rjSettings] }, putRjRolePermissions);

  app.get("/rj/usuarios", { preHandler: [...rjSettings] }, getConfidencialUsers);

  app.post("/rj/usuarios", { preHandler: [...rjSettings] }, postConfidencialUser);

  app.delete("/rj/usuarios/:id", { preHandler: [...rjSettings] }, removeConfidencialUser);

  app.post("/rj/usuarios/:id/approve", { preHandler: [...rjSettings] }, approveConfidencialUserHandler);

  app.post(
    "/rj/usuarios/:id/reset-password",
    { preHandler: [...rjSettings] },
    resetConfidencialUserPasswordHandler,
  );

  app.get("/rj/usuarios/:id/roles", { preHandler: [...rjSettings] }, getRjUserRolesHandler);

  app.put("/rj/usuarios/:id/roles", { preHandler: [...rjSettings] }, putRjUserRoles);

  app.get("/rj/historico", { preHandler: [...rjSettings] }, getRjHistorico);

  app.get("/rj/credores/:id/historico", { preHandler: [...rjSettings] }, getRjCredorHistorico);
}
