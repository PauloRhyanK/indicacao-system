import { Clock } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/cais/Button";
import { fetchMe, isAuthenticated } from "@/lib/api/auth";

type PendingApprovalScreenProps = {
  email?: string | null;
  onLogout: () => void;
  /** Verifica aprovação periodicamente e chama quando liberado */
  onApproved?: () => void;
};

export function PendingApprovalScreen({
  email,
  onLogout,
  onApproved,
}: PendingApprovalScreenProps) {
  useEffect(() => {
    if (!onApproved || !isAuthenticated()) return;

    const check = () => {
      void fetchMe()
        .then((session) => {
          if (session.user.confidencialApprovedAt) onApproved();
        })
        .catch(() => undefined);
    };

    check();
    const timer = window.setInterval(check, 15000);
    return () => window.clearInterval(timer);
  }, [onApproved]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-azul-profundo via-azul-marinho to-azul-corporativo px-4 py-10">
      <div className="w-full max-w-lg animate-fade-in rounded-lg bg-branco p-8 shadow-lg">
        <div className="mb-6 text-center">
          <div className="text-[28px] font-semibold tracking-[2px] text-azul-profundo">CAIS</div>
          <div className="text-[13px] italic text-ouro-escuro">Ambiente confidencial</div>
        </div>

        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-800 ring-8 ring-amber-50/60">
          <Clock className="h-7 w-7" />
        </div>

        <h1 className="text-center text-[22px] font-semibold text-azul-profundo">
          Aguardando liberação
        </h1>

        <p className="mt-3 text-center text-[14px] leading-relaxed text-slate-600">
          Sua senha pode já estar criada, mas o administrador ainda não liberou seu acesso ao
          condomínio de credores.
        </p>

        {email && (
          <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-center">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Conta cadastrada
            </p>
            <p className="mt-1 text-[14px] font-medium text-azul-profundo">{email}</p>
          </div>
        )}

        <ul className="mt-5 space-y-2 text-[13px] text-slate-600">
          <li className="flex gap-2">
            <span className="text-ouro-escuro">•</span>
            <span>Assim que o administrador clicar em <strong>Liberar acesso</strong>, esta página atualiza sozinha.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-ouro-escuro">•</span>
            <span>Enquanto isso, nenhum dado confidencial ficará visível.</span>
          </li>
        </ul>

        <div className="mt-8">
          <Button variant="ghost" block onClick={onLogout}>
            Sair
          </Button>
        </div>
      </div>
    </div>
  );
}
