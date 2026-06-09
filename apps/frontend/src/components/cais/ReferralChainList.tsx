import { Badge } from "./Badge";
import type { BonusChainNode } from "@/lib/cais-api";

const UNASSIGNED = "Não atribuído";

function ReferralChainEmpty() {
  return (
    <p className="text-[13px] text-slate-500">
      Nenhum indicador registrado para este lead.
    </p>
  );
}

export function ReferralChainList({
  chain,
  treeTruncated,
  loading,
  error,
  onRetry,
}: {
  chain: BonusChainNode[];
  treeTruncated?: boolean;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
}) {
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

  if (!chain.length) return <ReferralChainEmpty />;

  return (
    <div>
      <ul className="space-y-2.5">
        {chain.map((node) => (
          <li key={`${node.nodeId}-${node.level}`} className="text-[13px] text-azul-profundo">
            <span className="font-medium text-slate-600">Nível {node.level}:</span>{" "}
            {node.name}
            <Badge
              variant={node.nodeType === "USER" ? "gray" : "gold"}
              className="ml-2 align-middle"
            >
              {node.nodeType === "USER" ? "Usuário" : "Lead"}
            </Badge>
            {node.phone ? (
              <span className="ml-1 text-slate-500">— {node.phone}</span>
            ) : null}
          </li>
        ))}
      </ul>
      {treeTruncated && (
        <p className="mt-3 text-[12px] text-status-amber">
          A cadeia excede o limite de profundidade exibido (10 níveis).
        </p>
      )}
    </div>
  );
}

export function CommercialRolesList({
  responsavel,
  coVendedor,
  consortiumType,
  externalCode,
}: {
  responsavel?: string | null;
  coVendedor?: string | null;
  consortiumType?: string | null;
  externalCode?: string | null;
}) {
  const rows = [
    { label: "Vendedor responsável", value: responsavel ?? UNASSIGNED },
    { label: "Co-vendedor", value: coVendedor ?? UNASSIGNED },
    { label: "Tipo consórcio", value: consortiumType ?? "—" },
    ...(externalCode ? [{ label: "Código", value: externalCode }] : []),
  ];

  return (
    <ul className="space-y-2.5">
      {rows.map((row) => (
        <li key={row.label} className="text-[13px]">
          <span className="text-slate-500">{row.label}: </span>
          <span
            className={
              row.value === UNASSIGNED || row.value === "—"
                ? "text-slate-400"
                : "font-medium text-azul-profundo"
            }
          >
            {row.value}
          </span>
        </li>
      ))}
    </ul>
  );
}
