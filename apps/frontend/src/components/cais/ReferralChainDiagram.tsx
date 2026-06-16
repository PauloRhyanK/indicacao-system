import { Fragment, useMemo, useState } from "react";
import { Badge } from "./Badge";
import type { BonusChainNode } from "@/lib/cais-api";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");
}

interface DiagramNode {
  id: string;
  name: string;
  nodeType: "USER" | "LEAD";
  phone: string | null;
  level?: number;
  isCurrent?: boolean;
}

function Connector() {
  return (
    <svg
      width="4"
      height="28"
      viewBox="0 0 4 28"
      className="shrink-0 text-azul-medio"
      aria-hidden
    >
      <line x1="2" y1="0" x2="2" y2="28" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function NodeCard({ node }: { node: DiagramNode }) {
  const typeLabel = node.nodeType === "USER" ? "Usuário" : "Lead";

  return (
    <div
      className={cn(
        "flex w-[min(100%,220px)] flex-col items-center gap-2 rounded-md border bg-branco px-4 py-3 text-center",
        node.isCurrent ? "border-ouro shadow-sm" : "border-slate-200",
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full text-[13px] font-semibold",
          node.nodeType === "USER"
            ? "bg-azul-profundo text-branco"
            : "bg-ouro/20 text-azul-profundo",
        )}
      >
        {initials(node.name)}
      </div>
      <div className="line-clamp-2 text-[12px] font-medium leading-tight text-azul-profundo">
        {node.name}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <Badge variant={node.nodeType === "USER" ? "gray" : "gold"}>{typeLabel}</Badge>
        {node.isCurrent ? (
          <Badge variant="gold">Lead atual</Badge>
        ) : node.level != null ? (
          <Badge variant="gold">Bônus Nível {node.level}</Badge>
        ) : null}
      </div>
      {node.phone ? (
        <p className="text-[11px] text-slate-500">{node.phone}</p>
      ) : null}
    </div>
  );
}

function buildDiagramNodes(
  chain: BonusChainNode[],
  currentLead: { name: string; phone?: string | null },
): DiagramNode[] {
  const ancestors = [...chain]
    .sort((a, b) => b.level - a.level)
    .map((node) => ({
      id: `${node.nodeId}-${node.level}`,
      name: node.name,
      nodeType: node.nodeType,
      phone: node.phone,
      level: node.level,
    }));

  return [
    ...ancestors,
    {
      id: "current",
      name: currentLead.name,
      nodeType: "LEAD" as const,
      phone: currentLead.phone ?? null,
      isCurrent: true,
    },
  ];
}

function collapseNodes(
  nodes: DiagramNode[],
  expanded: boolean,
): (DiagramNode | "ellipsis")[] {
  if (nodes.length <= 5 || expanded) return nodes;
  return [nodes[0], nodes[1], "ellipsis", nodes[nodes.length - 2], nodes[nodes.length - 1]];
}

export function ReferralChainDiagram({
  chain,
  currentLead,
  treeTruncated,
  loading,
  error,
  onRetry,
}: {
  chain: BonusChainNode[];
  currentLead: { name: string; phone?: string | null };
  treeTruncated?: boolean;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const allNodes = useMemo(
    () => buildDiagramNodes(chain, currentLead),
    [chain, currentLead],
  );

  const shown = useMemo(
    () => collapseNodes(allNodes, expanded),
    [allNodes, expanded],
  );

  if (loading) {
    return <p className="text-[13px] text-slate-500">Carregando cadeia de indicação…</p>;
  }

  if (error) {
    return (
      <p className="text-[13px] text-status-red">
        Não foi possível carregar a cadeia.{" "}
        {onRetry && (
          <button type="button" className="font-medium underline" onClick={onRetry}>
            Tentar novamente
          </button>
        )}
      </p>
    );
  }

  const hasAncestors = chain.length > 0;

  return (
    <div className="space-y-3">
      {!hasAncestors && (
        <p className="text-[12px] text-slate-500">Sem indicador acima deste lead.</p>
      )}

      <div className="overflow-x-auto pb-1">
        <div className="mx-auto flex min-w-[220px] flex-col items-center">
          {shown.map((item, index) => (
            <Fragment key={item === "ellipsis" ? "ellipsis" : item.id}>
              {index > 0 && <Connector />}
              {item === "ellipsis" ? (
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  className="flex h-10 w-[120px] items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 text-[18px] text-slate-500 transition-colors hover:border-azul-medio hover:bg-white hover:text-azul-profundo"
                  aria-label="Expandir cadeia intermediária"
                >
                  …
                </button>
              ) : (
                <NodeCard node={item} />
              )}
            </Fragment>
          ))}
        </div>
      </div>

      {expanded && allNodes.length > 5 && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="text-[12px] text-azul-medio hover:text-azul-profundo"
        >
          Recolher cadeia
        </button>
      )}

      {treeTruncated && (
        <p className="text-[12px] text-status-amber">
          A cadeia excede o limite de profundidade exibido (10 níveis).
        </p>
      )}
    </div>
  );
}
