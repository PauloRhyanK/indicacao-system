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

  await app.register(async function goalProtectedRoutes(protectedApp) {
    protectedApp.addHook("preHandler", authenticate);

    protectedApp.get("/goals/current", getCurrent);
    protectedApp.patch("/goals/:id", { preHandler: [authorize("ADMIN")] }, patchGoal);
    protectedApp.get("/dashboard/summary", getSummary);

    protectedApp.get("/goals/daily/defaults", { preHandler: [authorize("ADMIN")] }, getDailyDefaults);
    protectedApp.put("/goals/daily/defaults", { preHandler: [authorize("ADMIN")] }, putDailyDefaults);
    protectedApp.get("/goals/daily/overrides", { preHandler: [authorize("ADMIN")] }, getDailyOverrides);
    protectedApp.put("/goals/daily/overrides/:date", { preHandler: [authorize("ADMIN")] }, putDailyOverride);
    protectedApp.delete("/goals/daily/overrides/:date", { preHandler: [authorize("ADMIN")] }, removeDailyOverride);
  });
}
