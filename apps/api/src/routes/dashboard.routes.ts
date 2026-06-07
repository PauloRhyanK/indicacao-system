import type { FastifyInstance } from "fastify";
import { getPersonalDashboard } from "../services/dashboard.service.js";
import { authenticate } from "../middlewares/auth.js";

export async function dashboardRoutes(app: FastifyInstance) {
  app.get("/dashboard/personal", { preHandler: [authenticate] }, async (request, reply) => {
    const data = await getPersonalDashboard(request.user.sub);
    return reply.send({ data });
  });
}
