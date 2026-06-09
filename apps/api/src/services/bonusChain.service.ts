import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { notFound } from "../utils/httpError.js";

interface AncestorRow {
  node_id: string;
  node_type: "USER" | "LEAD";
  depth: number;
  name: string | null;
  phone: string | null;
}

export interface BonusChainNode {
  level: number;
  nodeType: "USER" | "LEAD";
  nodeId: string;
  name: string;
  phone: string | null;
}

export interface BonusChainResult {
  chain: BonusChainNode[];
  tree_truncated: boolean;
}

export async function getBonusChain(leadId: string, maxDepth = 10): Promise<BonusChainResult> {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, deletedAt: null },
    select: { id: true },
  });
  if (!lead) throw notFound("Lead não encontrado");

  const rows = await prisma.$queryRaw<AncestorRow[]>(Prisma.sql`
    WITH RECURSIVE ancestors AS (
      SELECT r.referrer_id AS node_id, r.referrer_type AS node_type, 1 AS depth
      FROM referrals r
      WHERE r.referred_lead_id = ${leadId}::uuid
      UNION ALL
      SELECT r.referrer_id, r.referrer_type, a.depth + 1
      FROM referrals r
      JOIN ancestors a ON a.node_type = 'LEAD' AND r.referred_lead_id = a.node_id
      WHERE a.depth < ${maxDepth}
    )
    SELECT a.node_id, a.node_type, a.depth,
           COALESCE(u.name, l.name) AS name,
           COALESCE(u.phone, l.phone) AS phone
    FROM ancestors a
    LEFT JOIN users u ON a.node_type = 'USER' AND u.id = a.node_id
    LEFT JOIN leads l ON a.node_type = 'LEAD' AND l.id = a.node_id
    ORDER BY a.depth ASC;
  `);

  const chain: BonusChainNode[] = rows.map((row) => ({
    level: row.depth,
    nodeType: row.node_type,
    nodeId: row.node_id,
    name: row.name ?? "(desconhecido)",
    phone: row.phone,
  }));

  const tree_truncated = await isAncestorsTruncated(rows, maxDepth);

  return { chain, tree_truncated };
}

async function isAncestorsTruncated(ancestors: AncestorRow[], maxDepth: number): Promise<boolean> {
  const deepest = ancestors.find((a) => a.depth === maxDepth);
  if (!deepest || deepest.node_type !== "LEAD") return false;

  const parentBeyond = await prisma.referral.count({
    where: { referredLeadId: deepest.node_id },
  });
  return parentBeyond > 0;
}
