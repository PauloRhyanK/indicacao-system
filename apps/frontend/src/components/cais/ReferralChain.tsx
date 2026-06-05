import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Badge } from "./Badge";
import type { ChainNode } from "@/lib/cais-api";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");
}

interface DisplayNode {
  id: string;
  name: string;
  type: "user" | "lead";
  current?: boolean;
}

function Node({ node }: { node: DisplayNode }) {
  return (
    <div
      className={cn(
        "flex w-[120px] shrink-0 flex-col items-center gap-2 rounded-md border bg-branco px-3 py-3 text-center",
        node.current ? "border-ouro shadow-sm" : "border-slate-200",
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full text-[13px] font-semibold",
          node.type === "user"
            ? "bg-azul-profundo text-branco"
            : "bg-ouro/20 text-azul-profundo",
        )}
      >
        {initials(node.name)}
      </div>
      <div className="line-clamp-2 text-[12px] font-medium leading-tight text-azul-profundo">
        {node.name}
      </div>
      <Badge variant={node.type === "user" ? "gray" : "gold"}>
        {node.type === "user" ? "Usuário" : "Lead"}
      </Badge>
    </div>
  );
}

export function ReferralChain({
  chain,
  currentLeadName,
}: {
  chain: ChainNode[];
  currentLeadName: string;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!chain.length) {
    return (
      <p className="text-[13px] text-slate-500">
        Este lead não possui uma cadeia de indicações registrada.
      </p>
    );
  }

  const nodes: DisplayNode[] = [
    ...chain.map((c) => ({ id: c.node_id, name: c.node_name, type: c.node_type })),
    { id: "current", name: currentLeadName, type: "lead" as const, current: true },
  ];

  const collapsed = nodes.length > 4 && !expanded;
  const shown: (DisplayNode | "ellipsis")[] = collapsed
    ? [nodes[0], nodes[1], "ellipsis", nodes[nodes.length - 2], nodes[nodes.length - 1]]
    : nodes;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {shown.map((n, i) => (
          <div key={i} className="flex items-center gap-2">
            {i > 0 && <ArrowRight className="h-4 w-4 shrink-0 text-azul-medio" />}
            {n === "ellipsis" ? (
              <button
                onClick={() => setExpanded(true)}
                className="flex h-10 items-center rounded-md border border-slate-200 bg-branco px-3 text-[13px] text-slate-500 hover:bg-slate-100"
              >
                …
              </button>
            ) : (
              <Node node={n} />
            )}
          </div>
        ))}
      </div>
      {expanded && nodes.length > 4 && (
        <button
          onClick={() => setExpanded(false)}
          className="text-[12px] text-azul-medio hover:text-azul-profundo"
        >
          Recolher cadeia
        </button>
      )}
    </div>
  );
}
