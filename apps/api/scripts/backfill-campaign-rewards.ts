/**
 * Gera recompensas da campanha para vendas existentes (one-shot após migrate deploy).
 * Uso: pnpm --filter api db:backfill-rewards
 */
import "dotenv/config";
import { prisma } from "../src/config/prisma.js";
import { backfillCampaignRewards } from "../src/services/campaignReward.service.js";

async function main() {
  let remaining = 1;
  let totalProcessed = 0;
  let round = 0;

  while (remaining > 0) {
    round++;
    const result = await backfillCampaignRewards({ limit: 200 });
    totalProcessed += result.processed;
    remaining = result.remaining;

    console.log(
      `Lote ${round}: ${result.processed} venda(s) processada(s), ${remaining} restante(s)`,
    );

    if (result.errors.length > 0) {
      for (const err of result.errors) {
        console.error(`  Erro em ${err.purchaseId}: ${err.message}`);
      }
    }

    if (result.processed === 0) break;
  }

  console.log(`Concluído. Total processado: ${totalProcessed}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
