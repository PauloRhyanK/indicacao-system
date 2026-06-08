import { createFileRoute } from "@tanstack/react-router";

import { useMemo, useState } from "react";

import { useQuery } from "@tanstack/react-query";

import { AppLayout } from "@/components/cais/AppLayout";

import { KPICard } from "@/components/cais/KPICard";

import { SaleRegistrationForm } from "@/components/cais/SaleRegistrationForm";

import { SalesAccordionTable } from "@/components/cais/SalesAccordionTable";

import { SectionHeader } from "@/components/cais/Feedback";

import { fetchMetaPeriod, fetchSales, formatBRL, formatDate } from "@/lib/cais-api";



export const Route = createFileRoute("/_authenticated/vendas")({

  head: () => ({ meta: [{ title: "Registrar Venda — CAIS" }] }),

  component: VendasPage,

});



function VendasPage() {

  const [highlightSaleId, setHighlightSaleId] = useState<string | null>(null);



  const sales = useQuery({ queryKey: ["sales"], queryFn: fetchSales });

  const meta = useQuery({ queryKey: ["meta"], queryFn: fetchMetaPeriod });



  const { totalSales, volume, lastSaleLabel } = useMemo(() => {

    const items = sales.data ?? [];

    const total = items.length;

    const vol = items.reduce((s, x) => s + Number(x.sale_value), 0);

    const last = items[0];

    const lastLabel = last

      ? `${formatBRL(last.sale_value)} · ${last.lead_name}`

      : "—";

    return { totalSales: total, volume: vol, lastSaleLabel: lastLabel };

  }, [sales.data]);



  return (

    <AppLayout>

      <div className="mb-6">

        <h1 className="text-[26px] font-semibold text-azul-profundo">Registrar Venda</h1>

        <p className="text-[14px] text-slate-500">

          Registre uma venda, atualize a meta e visualize a cadeia de indicação.

        </p>

      </div>



      <div className="mb-8 grid gap-6 lg:grid-cols-[1fr_320px]">

        <div className="rounded-md border border-ouro/20 bg-branco p-6 shadow-sm">

          <SectionHeader>Nova Venda</SectionHeader>

          <SaleRegistrationForm

            onRegistered={(result) => setHighlightSaleId(result.purchaseId)}

          />

        </div>



        <div className="flex flex-col gap-4">

          <KPICard

            label="Total de Vendas"

            value={totalSales}

            sub="Vendas registradas no sistema"

          />

          <KPICard

            label="Volume Vendido"

            value={formatBRL(volume)}

            sub={meta.data ? `Meta: ${formatBRL(meta.data.target_value)}` : "Soma de todas as vendas"}

          />

          <KPICard

            label="Última Venda"

            value={

              sales.data?.[0] ? formatDate(sales.data[0].sold_at) : "—"

            }

            sub={lastSaleLabel}

            valueClassName="text-[18px]"

          />

        </div>

      </div>



      <div>

        <div className="mb-4">

          <h2 className="text-[18px] font-semibold text-azul-profundo">Vendas Registradas</h2>

          <p className="text-[13px] text-slate-500">

            Clique em uma venda para ver os papéis comerciais e a cadeia de indicação.

          </p>

        </div>

        <SalesAccordionTable

          highlightSaleId={highlightSaleId}

          onHighlightDone={() => setHighlightSaleId(null)}

        />

      </div>

    </AppLayout>

  );

}

