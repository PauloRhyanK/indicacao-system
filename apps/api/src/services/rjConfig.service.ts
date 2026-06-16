import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";

const SINGLETON_ID = "singleton";

export async function getConfig() {
  const config = await prisma.rjConfig.upsert({
    where: { id: SINGLETON_ID },
    update: {},
    create: { id: SINGLETON_ID, passivo: 0 },
  });

  return {
    passivo: Number(config.passivo),
    updated_at: config.updatedAt.toISOString(),
  };
}

export async function updateConfig(passivo: number) {
  const config = await prisma.rjConfig.upsert({
    where: { id: SINGLETON_ID },
    update: { passivo: new Prisma.Decimal(passivo) },
    create: { id: SINGLETON_ID, passivo: new Prisma.Decimal(passivo) },
  });

  return {
    passivo: Number(config.passivo),
    updated_at: config.updatedAt.toISOString(),
  };
}
