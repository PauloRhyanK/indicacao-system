import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { recordRjAudit } from "./rjAudit.service.js";

const SINGLETON_ID = "singleton";

function formatPassivo(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

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

export async function updateConfig(passivo: number, actorUserId?: string) {
  const existing = await prisma.rjConfig.findUnique({ where: { id: SINGLETON_ID } });
  const oldPassivo = existing ? Number(existing.passivo) : 0;

  const config = await prisma.rjConfig.upsert({
    where: { id: SINGLETON_ID },
    update: { passivo: new Prisma.Decimal(passivo) },
    create: { id: SINGLETON_ID, passivo: new Prisma.Decimal(passivo) },
  });

  if (oldPassivo !== passivo) {
    await recordRjAudit({
      actorUserId,
      entityType: "config",
      entityId: SINGLETON_ID,
      entityLabel: "Passivo do condomínio",
      action: "update",
      summary: `Passivo total: ${formatPassivo(oldPassivo)} → ${formatPassivo(passivo)}`,
      changes: [
        {
          field: "passivo",
          label: "Passivo total",
          oldValue: formatPassivo(oldPassivo),
          newValue: formatPassivo(passivo),
        },
      ],
    });
  }

  return {
    passivo: Number(config.passivo),
    updated_at: config.updatedAt.toISOString(),
  };
}
