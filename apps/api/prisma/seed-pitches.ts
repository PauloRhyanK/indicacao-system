// Seed isolado: sincroniza SOMENTE a biblioteca de pitches do playbook
// (invest_pitches), sem tocar em lookups, RBAC ou usuários admin.
// Idempotente: identifica cada pitch por (faixa + título) entre os não
// excluídos, atualiza o conteúdo se já existir, cria se não existir.
//
// Uso: node --experimental-strip-types prisma/seed-pitches.ts
// (ou compilar com tsc antes de rodar, em ambientes sem suporte a TS nativo)
import { PrismaClient } from "@prisma/client";
import { INVEST_PITCH_SEED } from "./data/invest-pitches.js";

const prisma = new PrismaClient();

async function main() {
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
      console.log(`Atualizado: [${p.faixa}] ${p.titulo}`);
    } else {
      await prisma.investPitch.create({ data });
      console.log(`Criado: [${p.faixa}] ${p.titulo}`);
    }
  }
  console.log(`Seed de pitches concluído (${INVEST_PITCH_SEED.length} pitches).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
