import type { Prisma, ReferrerType } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { badRequest, notFound } from "../utils/httpError.js";

export interface ReferrerInput {
  type: ReferrerType;
  id: string;
}

/**
 * Valida a existência do indicador (polimórfico) e regras de integridade.
 * Lança erro tipado quando inválido.
 */
export async function validateReferrer(referrer: ReferrerInput, referredLeadId: string) {
  if (referrer.type === "LEAD") {
    if (referrer.id === referredLeadId) {
      throw badRequest("Um lead não pode indicar a si mesmo");
    }
    const exists = await prisma.lead.findFirst({
      where: { id: referrer.id, deletedAt: null },
      select: { id: true },
    });
    if (!exists) throw notFound("Lead indicador não encontrado");
  } else {
    const exists = await prisma.user.findFirst({
      where: { id: referrer.id, deletedAt: null },
      select: { id: true },
    });
    if (!exists) throw notFound("Usuário indicador não encontrado");
  }
}

/**
 * Cria ou substitui o vínculo de indicação de um lead (cada lead tem no máximo um indicador).
 * Aceita um client transacional opcional.
 */
export async function upsertReferral(
  referredLeadId: string,
  referrer: ReferrerInput,
  tx: Prisma.TransactionClient = prisma
) {
  await validateReferrer(referrer, referredLeadId);
  return tx.referral.upsert({
    where: { referredLeadId },
    update: { referrerType: referrer.type, referrerId: referrer.id },
    create: {
      referredLeadId,
      referrerType: referrer.type,
      referrerId: referrer.id,
    },
  });
}

/**
 * Resolve o nó indicador (nome + tipo) de um lead, se houver.
 */
export async function getReferrerOf(leadId: string) {
  const referral = await prisma.referral.findUnique({ where: { referredLeadId: leadId } });
  if (!referral) return null;

  if (referral.referrerType === "USER") {
    const user = await prisma.user.findUnique({
      where: { id: referral.referrerId },
      select: { id: true, name: true, deletedAt: true },
    });
    if (!user) return null;
    return {
      type: "USER" as const,
      id: user.id,
      name: user.deletedAt ? "Usuário excluído" : user.name,
    };
  }

  const lead = await prisma.lead.findUnique({
    where: { id: referral.referrerId },
    select: { id: true, name: true, deletedAt: true },
  });
  if (!lead) return null;
  return {
    type: "LEAD" as const,
    id: lead.id,
    name: lead.deletedAt ? "Lead excluído" : lead.name,
  };
}
