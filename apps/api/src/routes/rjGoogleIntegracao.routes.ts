import type { FastifyInstance } from "fastify";
import {
  deleteGoogleIntegracao,
  getGoogleAuthUrl,
  getGoogleIntegracaoStatusHandler,
  getGoogleOAuthCallback,
} from "../controllers/rjGoogleIntegracao.controller.js";
import { authenticate, requireConfidencialApproved } from "../middlewares/auth.js";

const confidencialUser = [authenticate, requireConfidencialApproved] as const;

export async function rjGoogleIntegracaoRoutes(app: FastifyInstance) {
  app.get(
    "/rj/integracoes/google/auth-url",
    { preHandler: [...confidencialUser] },
    getGoogleAuthUrl,
  );

  app.get("/rj/integracoes/google/callback", getGoogleOAuthCallback);

  app.get(
    "/rj/integracoes/google/status",
    { preHandler: [...confidencialUser] },
    getGoogleIntegracaoStatusHandler,
  );

  app.delete(
    "/rj/integracoes/google",
    { preHandler: [...confidencialUser] },
    deleteGoogleIntegracao,
  );
}
