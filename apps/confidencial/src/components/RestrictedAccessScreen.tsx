import { ShieldOff } from "lucide-react";
import { Button } from "@/components/cais/Button";
import { logout, isAuthenticated, fetchMe } from "@/lib/api/auth";
import { useEffect, useState } from "react";

type RestrictedAccessScreenProps = {
  onLogout: () => void;
  /** Quando true, tenta exibir e-mail da sessão ativa */
  showSession?: boolean;
};

export function RestrictedAccessScreen({ onLogout, showSession = true }: RestrictedAccessScreenProps) {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!showSession || !isAuthenticated()) return;
    void fetchMe()
      .then((s) => setEmail(s.user.email))
      .catch(() => setEmail(null));
  }, [showSession]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-azul-profundo via-azul-marinho to-azul-corporativo px-4 py-10">
      <div className="w-full max-w-lg animate-fade-in rounded-lg bg-branco p-8 shadow-lg">
        <div className="mb-6 text-center">
          <div className="text-[28px] font-semibold tracking-[2px] text-azul-profundo">CAIS</div>
          <div className="text-[13px] italic text-ouro-escuro">Ambiente confidencial</div>
        </div>

        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-800 ring-8 ring-amber-50/60">
          <ShieldOff className="h-7 w-7" />
        </div>

        <h1 className="text-center text-[22px] font-semibold text-azul-profundo">
          Acesso não autorizado
        </h1>

        <p className="mt-3 text-center text-[14px] leading-relaxed text-slate-600">
          Sua conta não possui permissão para acessar o condomínio de credores da Recuperação
          Judicial neste ambiente.
        </p>

        {email && (
          <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-center">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Conta conectada
            </p>
            <p className="mt-1 text-[14px] font-medium text-azul-profundo">{email}</p>
          </div>
        )}

        <ul className="mt-5 space-y-2 text-[13px] text-slate-600">
          <li className="flex gap-2">
            <span className="text-ouro-escuro">•</span>
            <span>
              Peça ao <strong className="font-medium text-azul-profundo">Administrador RJ</strong>{" "}
              para atribuir o papel <em>Acesso Confidencial</em> ou equivalente.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-ouro-escuro">•</span>
            <span>
              Se você usa o CRM admin, acesse{" "}
              <strong className="font-medium text-azul-profundo">admin.caisinvestimentos.com.br</strong>.
            </span>
          </li>
        </ul>

        <div className="mt-8">
          <Button variant="primary" block onClick={onLogout}>
            Sair e usar outra conta
          </Button>
        </div>
      </div>
    </div>
  );
}
