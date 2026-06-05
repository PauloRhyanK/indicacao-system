import type { FastifyInstance } from "fastify";
import { getCurrent, getSummary, patchGoal } from "../controllers/goal.controller.js";
import { authenticate, authorize } from "../middlewares/auth.js";

export async function goalRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.get("/goals/current", getCurrent);
  app.patch("/goals/:id", { preHandler: [authorize("ADMIN")] }, patchGoal);
  app.get("/dashboard/summary", getSummary);
}
