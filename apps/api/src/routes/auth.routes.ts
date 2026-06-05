import type { FastifyInstance } from "fastify";
import { login, me } from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/auth.js";

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/login", login);
  app.get("/auth/me", { preHandler: [authenticate] }, me);
}
