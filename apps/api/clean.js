import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Deletando reuniões de investimentos...");
  const reunioes = await prisma.investReuniao.deleteMany();
  console.log(`Deletadas ${reunioes.count} reuniões.`);

  console.log("Deletando leads de investimentos...");
  const leads = await prisma.investLead.deleteMany();
  console.log(`Deletados ${leads.count} leads.`);

  console.log("Deletando user aliases (opcional, para limpar mapeamentos anteriores)...");
  const aliases = await prisma.userAlias.deleteMany();
  console.log(`Deletados ${aliases.count} aliases.`);

  console.log("Banco limpo!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
