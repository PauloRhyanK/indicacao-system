import type { FastifyInstance } from "fastify";
import { login, me, register, setInitialPasswordHandler } from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/auth.js";

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/login", login);
  app.post("/auth/register", register);
  app.post("/auth/set-initial-password", setInitialPasswordHandler);
  app.get("/auth/me", { preHandler: [authenticate] }, me);
}
