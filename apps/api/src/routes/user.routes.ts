import type { FastifyInstance } from "fastify";
import {
  deleteUserHandler,
  getUsers,
  patchPersonalDailyTarget,
  postUser,
  requirePasswordSetupHandler,
} from "../controllers/user.controller.js";
import { authenticate, requirePermission } from "../middlewares/auth.js";

export async function userRoutes(app: FastifyInstance) {
  app.get("/users", { preHandler: [authenticate] }, getUsers);
  app.post(
    "/users",
    { preHandler: [authenticate, requirePermission("users.manage")] },
    postUser,
  );
  app.patch("/users/me/personal-daily-target", { preHandler: [authenticate] }, patchPersonalDailyTarget);
  app.patch(
    "/users/:id/require-password-setup",
    { preHandler: [authenticate, requirePermission("users.manage")] },
    requirePasswordSetupHandler,
  );

  app.delete(
    "/users/:id",
    { preHandler: [authenticate, requirePermission("users.manage")] },
    deleteUserHandler,
  );
}
