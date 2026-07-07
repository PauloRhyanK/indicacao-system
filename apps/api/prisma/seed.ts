import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { assignRoleToUser, ensureSystemRoles } from "./lib/seed-rbac.js";
import { slugify } from "./lib/slugify.js";
import { INVEST_PITCH_SEED } from "./data/invest-pitches.js";

const prisma = new PrismaClient();

const LEAD_STATUSES = [
  "Reunião agendada",
  "Reunião realizada",
  "Pensando",
  "Mandar proposta",
  "Proposta enviada",
  "Em negociação",
  "Fechado",
  "Perdido",
  "Sem retorno",
  "Follow-up",
  "Reagendar",
];

const CONSORTIUM_TYPES = ["Imóvel", "Automóvel"];

async function seedLookups() {
  for (const name of LEAD_STATUSES) {
    const slug = slugify(name);
    await prisma.leadStatus.upsert({
      where: { slug },
      update: { name },
      create: { slug, name },
    });
  }
  for (const name of CONSORTIUM_TYPES) {
    const slug = slugify(name);
    await prisma.consortiumType.upsert({
      where: { slug },
      update: { name },
      create: { slug, name },
    });
  }
}

async function seedAdminUser(adminRoleId: string) {
  const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    throw new Error(
      "Defina SEED_ADMIN_EMAIL e SEED_ADMIN_PASSWORD no ambiente (arquivo .env na VPS).",
    );
  }
  if (adminPassword.length < 6) {
    throw new Error("SEED_ADMIN_PASSWORD deve ter ao menos 6 caracteres.");
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash, name: "Administrador", accessScope: "INTERNAL" },
    create: {
      name: "Administrador",
      email: adminEmail,
      passwordHash,
      accessScope: "INTERNAL",
    },
  });
  await assignRoleToUser(prisma, admin.id, adminRoleId);
  return admin.email;
}

async function seedRjAdminUser(adminRjRoleId: string) {
  const email = process.env.SEED_RJ_ADMIN_EMAIL?.trim();
  const password = process.env.SEED_RJ_ADMIN_PASSWORD;

  if (!email || !password) {
    console.log("SEED_RJ_ADMIN_* não definido — admin RJ não criado.");
    return null;
  }
  if (password.length < 6) {
    throw new Error("SEED_RJ_ADMIN_PASSWORD deve ter ao menos 6 caracteres.");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      name: "Administrador RJ",
      accessScope: "CONFIDENCIAL",
      confidencialApprovedAt: new Date(),
    },
    create: {
      name: "Administrador RJ",
      email,
      passwordHash,
      accessScope: "CONFIDENCIAL",
      confidencialApprovedAt: new Date(),
    },
  });
  await assignRoleToUser(prisma, user.id, adminRjRoleId);
  await prisma.userRole.deleteMany({
    where: { userId: user.id, roleId: { not: adminRjRoleId } },
  });
  return user.email;
}

/**
 * Semeia a biblioteca de pitches do playbook. Idempotente: identifica cada pitch
 * pela combinação (faixa + título) entre os não-excluídos e atualiza o conteúdo,
 * criando quando não existe. Não sobrescreve pitches criados manualmente.
 */
async function seedInvestPitches() {
  for (const p of INVEST_PITCH_SEED) {
    const existing = await prisma.investPitch.findFirst({
      where: { faixa: p.faixa, titulo: p.titulo, deletedAt: null },
      select: { id: true },
    });
    const data = {
      faixa: p.faixa,
      titulo: p.titulo,
      gancho: p.gancho,
      padraoDoSegmento: p.padraoDoSegmento,
      ativo: true,
      conteudo: p.conteudo,
    };
    if (existing) {
      await prisma.investPitch.update({ where: { id: existing.id }, data });
    } else {
      await prisma.investPitch.create({ data });
    }
  }
}

async function main() {
  await seedLookups();
  await seedInvestPitches();
  const { adminRoleId, adminRjRoleId } = await ensureSystemRoles(prisma);
  const adminEmail = await seedAdminUser(adminRoleId);
  const rjAdminEmail = await seedRjAdminUser(adminRjRoleId);

  console.log("Seed concluído.");
  console.log("Domínios (status, consórcios) e papéis RBAC sincronizados.");
  console.log(`Administrador CRM: ${adminEmail} (SEED_ADMIN_PASSWORD no .env)`);
  if (rjAdminEmail) {
    console.log(`Administrador RJ: ${rjAdminEmail} (SEED_RJ_ADMIN_PASSWORD no .env)`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
