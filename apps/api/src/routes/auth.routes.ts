import type { FastifyInstance } from "fastify";
import { login, me, register } from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/auth.js";

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/login", login);
  app.post("/auth/register", register);
  app.get("/auth/me", { preHandler: [authenticate] }, me);
}
