import type { FastifyInstance } from "fastify";
import { authenticate, requirePermission } from "../middlewares/auth.js";
import {
  getPermissionsCatalog,
  getRoles,
  getUserRolesHandler,
  patchRole,
  postRole,
  putRolePermissions,
  putUserRoles,
  removeRole,
} from "../controllers/role.controller.js";

export async function roleRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.get("/permissions/catalog", { preHandler: [requirePermission("roles.manage")] }, getPermissionsCatalog);
  app.get("/roles", { preHandler: [requirePermission("roles.manage")] }, getRoles);
  app.post("/roles", { preHandler: [requirePermission("roles.manage")] }, postRole);
  app.patch("/roles/:id", { preHandler: [requirePermission("roles.manage")] }, patchRole);
  app.delete("/roles/:id", { preHandler: [requirePermission("roles.manage")] }, removeRole);
  app.put("/roles/:id/permissions", { preHandler: [requirePermission("roles.manage")] }, putRolePermissions);

  app.get("/users/:id/roles", { preHandler: [requirePermission("users.manage")] }, getUserRolesHandler);
  app.put("/users/:id/roles", { preHandler: [requirePermission("users.manage")] }, putUserRoles);
}
