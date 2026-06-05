import { PrismaClient, ReferrerType, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { slugify } from "../src/utils/slugify.js";

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
}

async function main() {
  await seedLookups();

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@cais.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "admin123";

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: "Administrador",
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 10),
      role: UserRole.ADMIN,
    },
  });

  const lucas = await prisma.user.upsert({
    where: { email: "lucas@cais.local" },
    update: {},
    create: {
      name: "Lucas",
      email: "lucas@cais.local",
      passwordHash: await bcrypt.hash("consultor123", 10),
      role: UserRole.CONSULTANT,
    },
  });

  const carlos = await prisma.user.upsert({
    where: { email: "carlos@cais.local" },
    update: {},
    create: {
      name: "Carlos",
      email: "carlos@cais.local",
      passwordHash: await bcrypt.hash("consultor123", 10),
      role: UserRole.CONSULTANT,
    },
  });

  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const existingGoal = await prisma.goal.findFirst({
    where: { startDate: { lte: now }, endDate: { gte: now } },
  });
  if (!existingGoal) {
    await prisma.goal.create({
      data: {
        targetAmount: "1000000.00",
        currentAmount: "0.00",
        startDate,
        endDate,
      },
    });
  }

  const leadRoot = await prisma.lead.upsert({
    where: { externalCode: "OP-0001" },
    update: {},
    create: {
      externalCode: "OP-0001",
      name: "Maria Source",
      phone: "5511999990001",
      source: { connect: { slug: "base-interna" } },
      assignedTo: { connect: { id: lucas.id } },
      salesStatus: { connect: { slug: "em-negociacao" } },
      nextAction: { connect: { slug: "mandar-proposta" } },
      offeredAmount: "150000.00",
    },
  });

  const leadChild = await prisma.lead.upsert({
    where: { externalCode: "OP-0002" },
    update: {},
    create: {
      externalCode: "OP-0002",
      name: "João Indicado",
      phone: "5511999990002",
      source: { connect: { slug: "prospeccao-ativa" } },
      assignedTo: { connect: { id: carlos.id } },
      salesStatus: { connect: { slug: "follow-up" } },
      nextAction: { connect: { slug: "agendar-retorno" } },
      offeredAmount: "80000.00",
    },
  });

  const leadGrandChild = await prisma.lead.upsert({
    where: { externalCode: "OP-0003" },
    update: {},
    create: {
      externalCode: "OP-0003",
      name: "Ana Neta",
      phone: "5511999990003",
      source: { connect: { slug: "prospeccao-ativa" } },
      assignedTo: { connect: { id: carlos.id } },
      salesStatus: { connect: { slug: "fechado" } },
      closedAmount: "120000.00",
    },
  });

  await prisma.referral.upsert({
    where: { referredLeadId: leadChild.id },
    update: {},
    create: {
      referredLeadId: leadChild.id,
      referrerType: ReferrerType.LEAD,
      referrerId: leadRoot.id,
    },
  });

  await prisma.referral.upsert({
    where: { referredLeadId: leadGrandChild.id },
    update: {},
    create: {
      referredLeadId: leadGrandChild.id,
      referrerType: ReferrerType.LEAD,
      referrerId: leadChild.id,
    },
  });

  console.log("Seed concluído.");
  console.log(`Admin: ${admin.email} / senha definida em SEED_ADMIN_PASSWORD (default: admin123)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
