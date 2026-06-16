import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { registerRoutes } from "./routes/index.js";
import { ensureAllCampaignRewardsGenerated } from "./services/campaignReward.service.js";
import { ensureSystemRoles } from "./services/permission.service.js";

async function buildServer() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === "production" ? "info" : "debug",
      transport:
        env.NODE_ENV === "development"
          ? { target: "pino-pretty", options: { translateTime: "HH:MM:ss", ignore: "pid,hostname" } }
          : undefined,
    },
  });

  app.setErrorHandler(errorHandler);

  await app.register(cors, {
    origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN.split(",").map((o) => o.trim()),
    credentials: true,
  });

  await app.register(jwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: env.JWT_EXPIRES_IN },
  });

  await app.register(multipart, {
    limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024 },
  });

  await app.register(
    async (api) => {
      await registerRoutes(api);
    },
    { prefix: "/api/v1" }
  );

  return app;
}

async function runStartupTasks(app: Awaited<ReturnType<typeof buildServer>>) {
  try {
    await ensureSystemRoles();
    app.log.info("Papéis e permissões do sistema sincronizados");
  } catch (err) {
    app.log.warn(err, "Sincronização de papéis ignorada na inicialização");
  }

  try {
    const result = await ensureAllCampaignRewardsGenerated();
    if (result.processed > 0) {
      app.log.info(`Recompensas da campanha geradas para ${result.processed} venda(s)`);
    }
    if (result.remaining > 0) {
      app.log.warn(`${result.remaining} venda(s) ainda sem recompensas geradas`);
    }
    if (result.errors.length > 0) {
      app.log.warn({ err: result.errors }, "Falhas ao gerar recompensas da campanha");
    }
  } catch (err) {
    app.log.warn(err, "Backfill de recompensas ignorado na inicialização");
  }
}

async function start() {
  const app = await buildServer();

  await runStartupTasks(app);

  const shutdown = async (signal: string) => {
    app.log.info(`Recebido ${signal}, encerrando...`);
    await app.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  try {
    await app.listen({ port: env.PORT, host: "0.0.0.0" });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void start();
