import type { FastifyInstance } from "fastify";
import {
  getDailyDefaults,
  getDailyOverrides,
  getDailyToday,
  postDailyPresetToday,
  putDailyDefaults,
  putDailyOverride,
  removeDailyOverride,
} from "../controllers/dailyGoal.controller.js";
import { getCurrent, getSummary, patchGoal } from "../controllers/goal.controller.js";
import { authenticate, authorize } from "../middlewares/auth.js";

export async function goalRoutes(app: FastifyInstance) {
  app.get("/goals/daily/today", getDailyToday);
  app.post("/goals/daily/today/preset", postDailyPresetToday);

  app.addHook("preHandler", authenticate);

  app.get("/goals/current", getCurrent);
  app.patch("/goals/:id", { preHandler: [authorize("ADMIN")] }, patchGoal);
  app.get("/dashboard/summary", getSummary);

  app.get("/goals/daily/defaults", { preHandler: [authorize("ADMIN")] }, getDailyDefaults);
  app.put("/goals/daily/defaults", { preHandler: [authorize("ADMIN")] }, putDailyDefaults);
  app.get("/goals/daily/overrides", { preHandler: [authorize("ADMIN")] }, getDailyOverrides);
  app.put("/goals/daily/overrides/:date", { preHandler: [authorize("ADMIN")] }, putDailyOverride);
  app.delete("/goals/daily/overrides/:date", { preHandler: [authorize("ADMIN")] }, removeDailyOverride);
}
