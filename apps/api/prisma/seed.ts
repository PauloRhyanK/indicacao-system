import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { assignRoleToUser, ensureSystemRoles } from "./lib/seed-rbac.js";
import { slugify } from "./lib/slugify.js";

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

const LEAD_SOURCES = [
  "Base interna",
  "MPA",
  "Reativação",
  "Prospecção ativa",
  "Base Lucas",
  "WhatsApp",
  "Outro",
  "Evento mulheres",
];

const CONSORTIUM_TYPES = [
  "Imóvel",
  "Automóvel",
];

const NEXT_ACTIONS = [
  "Cobrar decisão",
  "Mandar proposta",
  "Reenviar proposta",
  "Agendar retorno",
  "Ligar novamente",
  "Enviar mensagem",
  "Aguardar cliente",
  "Sem ação",
  "Fechado",
  "Encerrado",
];

async function seedLookups() {
  for (const name of LEAD_STATUSES) {
    const slug = slugify(name);
    await prisma.leadStatus.upsert({
      where: { slug },
      update: { name },
      create: { slug, name },
    });
  }
  for (const name of LEAD_SOURCES) {
    const slug = slugify(name);
    await prisma.leadSource.upsert({
      where: { slug },
      update: { name },
      create: { slug, name },
    });
  }
  for (const name of NEXT_ACTIONS) {
    const slug = slugify(name);
    await prisma.nextAction.upsert({
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

async function seedAdmin(adminRoleId: string) {
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
    update: { passwordHash, name: "Administrador" },
    create: {
      name: "Administrador",
      email: adminEmail,
      passwordHash,
    },
  });
  await assignRoleToUser(prisma, admin.id, adminRoleId);
  return admin.email;
}

async function main() {
  await seedLookups();
  const { adminRoleId } = await ensureSystemRoles(prisma);
  const adminEmail = await seedAdmin(adminRoleId);

  console.log("Seed concluído.");
  console.log("Domínios (status, origens, ações, consórcios) e papéis RBAC sincronizados.");
  console.log(`Administrador: ${adminEmail} (senha de SEED_ADMIN_PASSWORD no .env)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
