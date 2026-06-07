import type { FastifyInstance } from "fastify";
import { getUsers, patchPersonalDailyTarget, postUser } from "../controllers/user.controller.js";
import { authenticate, authorize } from "../middlewares/auth.js";

export async function userRoutes(app: FastifyInstance) {
  app.get("/users", { preHandler: [authenticate] }, getUsers);
  app.post("/users", { preHandler: [authenticate, authorize("ADMIN")] }, postUser);
  app.patch("/users/me/personal-daily-target", { preHandler: [authenticate] }, patchPersonalDailyTarget);
}
