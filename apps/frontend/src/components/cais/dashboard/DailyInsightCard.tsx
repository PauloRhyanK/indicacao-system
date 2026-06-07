import { Link } from "@tanstack/react-router";
import { Lightbulb } from "lucide-react";

interface DailyInsightCardProps {
  message: string;
  followUpCount: number;
}

export function DailyInsightCard({ message, followUpCount }: DailyInsightCardProps) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-slate-200 border-l-[3px] border-l-ouro bg-slate-50 px-4 py-3.5">
      <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-ouro-escuro" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-[1px] text-slate-500">
          Insight do dia
        </p>
        <p className="mt-1 text-[14px] leading-relaxed text-azul-profundo">{message}</p>
        {followUpCount > 0 && (
          <Link
            to="/leads"
            className="mt-2 inline-block text-[13px] font-medium text-azul-medio hover:text-azul-profundo"
          >
            Ver leads em Follow-up →
          </Link>
        )}
      </div>
    </div>
  );
}
