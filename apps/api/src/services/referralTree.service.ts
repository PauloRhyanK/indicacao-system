import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { notFound } from "../utils/httpError.js";

interface DescendantRow {
  lead_id: string;
  parent_id: string;
  depth: number;
  name: string;
}

interface AncestorRow {
  node_id: string;
  node_type: "USER" | "LEAD";
  depth: number;
  name: string | null;
}

export interface TreeNode {
  id: string;
  name: string;
  type: "USER" | "LEAD";
  depth: number;
  children: TreeNode[];
}

/**
 * Monta a árvore de indicações de um lead.
 * - descendants: quem o lead indicou, recursivamente (apenas indicadores do tipo LEAD).
 * - ancestors: cadeia de quem indicou o lead, subindo até um USER ou a raiz.
 * Limite de profundidade configurável (default/máx 10). Retorna tree_truncated quando há níveis além do limite.
 */
export async function getReferralTree(leadId: string, maxDepth: number) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { id: true, name: true },
  });
  if (!lead) throw notFound("Lead não encontrado");

  const descendantsRows = await prisma.$queryRaw<DescendantRow[]>(Prisma.sql`
    WITH RECURSIVE descendants AS (
      SELECT r.referred_lead_id AS lead_id, r.referrer_id AS parent_id, 1 AS depth,
             ARRAY[r.referred_lead_id] AS path
      FROM referrals r
      WHERE r.referrer_type = 'LEAD' AND r.referrer_id = ${leadId}::uuid
      UNION ALL
      SELECT r.referred_lead_id, r.referrer_id, d.depth + 1, d.path || r.referred_lead_id
      FROM referrals r
      JOIN descendants d ON r.referrer_type = 'LEAD' AND r.referrer_id = d.lead_id
      WHERE d.depth < ${maxDepth} AND NOT (r.referred_lead_id = ANY(d.path))
    )
    SELECT d.lead_id, d.parent_id, d.depth, l.name
    FROM descendants d
    JOIN leads l ON l.id = d.lead_id
    ORDER BY d.depth ASC, l.name ASC;
  `);

  const ancestorsRows = await prisma.$queryRaw<AncestorRow[]>(Prisma.sql`
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
           COALESCE(u.name, l.name) AS name
    FROM ancestors a
    LEFT JOIN users u ON a.node_type = 'USER' AND u.id = a.node_id
    LEFT JOIN leads l ON a.node_type = 'LEAD' AND l.id = a.node_id
    ORDER BY a.depth ASC;
  `);

  const descendants = buildDescendantTree(leadId, descendantsRows);
  const ancestors: TreeNode[] = ancestorsRows.map((row) => ({
    id: row.node_id,
    name: row.name ?? "(desconhecido)",
    type: row.node_type,
    depth: row.depth,
    children: [],
  }));

  const truncated = await isTruncated(leadId, descendantsRows, ancestorsRows, maxDepth);

  return {
    leadId,
    maxDepth,
    tree_truncated: truncated,
    ancestors,
    descendants,
  };
}

function buildDescendantTree(rootId: string, rows: DescendantRow[]): TreeNode[] {
  const nodeMap = new Map<string, TreeNode>();
  for (const row of rows) {
    nodeMap.set(row.lead_id, {
      id: row.lead_id,
      name: row.name,
      type: "LEAD",
      depth: row.depth,
      children: [],
    });
  }

  const roots: TreeNode[] = [];
  for (const row of rows) {
    const node = nodeMap.get(row.lead_id)!;
    if (row.parent_id === rootId) {
      roots.push(node);
    } else {
      const parent = nodeMap.get(row.parent_id);
      if (parent) parent.children.push(node);
      else roots.push(node);
    }
  }
  return roots;
}

/**
 * Determina se a árvore foi cortada pelo limite de profundidade:
 * existe algum indicado/indicador imediatamente além do último nível retornado.
 */
async function isTruncated(
  leadId: string,
  descendants: DescendantRow[],
  ancestors: AncestorRow[],
  maxDepth: number
): Promise<boolean> {
  const deepestDescendants = descendants
    .filter((d) => d.depth === maxDepth)
    .map((d) => d.lead_id);

  if (deepestDescendants.length > 0) {
    const childrenBeyond = await prisma.referral.count({
      where: { referrerType: "LEAD", referrerId: { in: deepestDescendants } },
    });
    if (childrenBeyond > 0) return true;
  }

  const deepestAncestor = ancestors.find((a) => a.depth === maxDepth);
  if (deepestAncestor && deepestAncestor.node_type === "LEAD") {
    const parentBeyond = await prisma.referral.count({
      where: { referredLeadId: deepestAncestor.node_id },
    });
    if (parentBeyond > 0) return true;
  }

  return false;
}
