import { Badge } from "./Badge";
import type { BonusChainNode } from "@/lib/cais-api";

function BonusChainEmpty() {
  return (
    <p className="text-[13px] text-slate-500">
      Nenhum indicador na cadeia de bonificação para este lead.
    </p>
  );
}

function BonusChainTruncatedWarning() {
  return (
    <p className="mt-3 text-[12px] text-status-amber">
      A cadeia de bonificação excede o limite de profundidade exibido (10 níveis).
    </p>
  );
}

function BonusChainTable({
  chain,
  treeTruncated,
}: {
  chain: BonusChainNode[];
  treeTruncated?: boolean;
}) {
  if (!chain.length) return <BonusChainEmpty />;

  return (
    <>
      <div className="overflow-x-auto rounded-md border border-slate-200">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-medium uppercase tracking-wide text-slate-500">
              <th className="px-4 py-2.5">Nível</th>
              <th className="px-4 py-2.5">Premiado</th>
              <th className="px-4 py-2.5">Tipo</th>
              <th className="px-4 py-2.5">Telefone</th>
              <th className="px-4 py-2.5">Prêmio</th>
            </tr>
          </thead>
          <tbody>
            {chain.map((node) => (
              <tr
                key={`${node.nodeId}-${node.level}`}
                className="border-b border-slate-100 last:border-0"
              >
                <td className="px-4 py-3 font-medium text-azul-profundo">{node.level}</td>
                <td className="px-4 py-3 text-azul-profundo">{node.name}</td>
                <td className="px-4 py-3">
                  <Badge variant={node.nodeType === "USER" ? "gray" : "gold"}>
                    {node.nodeType === "USER" ? "Usuário" : "Lead"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {node.phone ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <Badge variant="gold">Nível {node.level}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {treeTruncated && <BonusChainTruncatedWarning />}
    </>
  );
}

function BonusChainList({
  chain,
  treeTruncated,
}: {
  chain: BonusChainNode[];
  treeTruncated?: boolean;
}) {
  if (!chain.length) return <BonusChainEmpty />;

  return (
    <>
      <ul className="space-y-2">
        {chain.map((node) => (
          <li
            key={`${node.nodeId}-${node.level}`}
            className="flex flex-wrap items-center gap-2 text-[13px] text-azul-profundo"
          >
            <span className="font-medium text-slate-600">Bônus Nível {node.level}:</span>
            <Badge variant="gold">{node.name}</Badge>
            <Badge variant={node.nodeType === "USER" ? "gray" : "gold"}>
              {node.nodeType === "USER" ? "Usuário" : "Lead"}
            </Badge>
            {node.phone ? (
              <span className="text-slate-500">— Tel: {node.phone}</span>
            ) : (
              <span className="text-slate-400">— Sem telefone</span>
            )}
          </li>
        ))}
      </ul>
      {treeTruncated && <BonusChainTruncatedWarning />}
    </>
  );
}

export function BonusChainCard({
  chain,
  treeTruncated,
  variant = "card",
  title = "Cadeia de Premiação / Bonificação",
  showTitle = true,
}: {
  chain: BonusChainNode[];
  treeTruncated?: boolean;
  variant?: "card" | "table";
  title?: string;
  showTitle?: boolean;
}) {
  const isEmpty = !chain.length;
  const borderClass =
    variant === "table" || isEmpty
      ? "border-slate-200"
      : "border-ouro/30";

  return (
    <div className={`rounded-md border ${borderClass} bg-branco p-5`}>
      {showTitle && (
        <h3 className="mb-3 text-[14px] font-semibold text-azul-profundo">{title}</h3>
      )}
      {variant === "table" ? (
        <BonusChainTable chain={chain} treeTruncated={treeTruncated} />
      ) : (
        <BonusChainList chain={chain} treeTruncated={treeTruncated} />
      )}
    </div>
  );
}
