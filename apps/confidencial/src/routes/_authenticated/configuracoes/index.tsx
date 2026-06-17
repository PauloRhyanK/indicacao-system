import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Badge } from "@/components/cais/Badge";
import { ChevronRight, Shield, Users } from "lucide-react";
import { canAccessRjSettings } from "@/lib/use-permissions";

export const Route = createFileRoute("/_authenticated/configuracoes/")({
  head: () => ({ meta: [{ title: "Configurações — CAIS Confidencial" }] }),
  beforeLoad: ({ context }) => {
    if (!canAccessRjSettings(context.permissions, context.user.roles)) {
      throw redirect({ to: "/credores" });
    }
  },
  component: ConfiguracoesPage,
});

const adminLinks = [
  {
    to: "/configuracoes/usuarios" as const,
    icon: Users,
    title: "Usuários",
    description: "Cadastrar acessos, copiar link de primeiro acesso e definir papéis (requer Administrador RJ).",
  },
  {
    to: "/configuracoes/papeis" as const,
    icon: Shield,
    title: "Papéis e permissões",
    description: "Definir o que cada perfil pode ver ou fazer dentro do módulo.",
  },
];

function ConfiguracoesPage() {
  const { user } = Route.useRouteContext();

  return (
    <>
      <h1 className="mb-1 text-[18px] font-semibold text-azul-profundo">Configurações</h1>
      <p className="mb-5 max-w-xl text-[13px] text-slate-600">
        Gerencie sua conta e o acesso de outras pessoas ao módulo confidencial.
      </p>

      <section className="mb-6">
        <h2 className="mb-2 text-[12px] font-medium uppercase tracking-wide text-slate-500">
          Sua conta
        </h2>
        <div className="rounded-lg border border-slate-200 bg-branco px-4 py-3">
          <p className="text-[13px] font-medium text-azul-profundo">{user.name}</p>
          <p className="text-[12px] text-slate-500">{user.email}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {user.roles.map((r) => (
              <Badge key={r.id} variant={r.name === "Administrador RJ" ? "gold" : "gray"}>
                {r.name}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-[12px] font-medium uppercase tracking-wide text-slate-500">
          Administração
        </h2>
        <p className="mb-3 text-[12px] text-slate-500">
          Clique em uma opção para abrir.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {adminLinks.map(({ to, icon: Icon, title, description }) => (
            <Link
              key={to}
              to={to}
              className="group flex flex-col rounded-lg border border-slate-200 bg-branco p-4 transition-colors hover:border-azul-medio/40 hover:bg-azul-medio/5"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-azul-profundo/8 text-azul-profundo group-hover:bg-azul-profundo/12">
                  <Icon className="h-4 w-4" />
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-azul-medio" />
              </div>
              <p className="text-[14px] font-medium text-azul-profundo">{title}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-slate-500">{description}</p>
              <span className="mt-3 text-[11px] font-medium text-azul-corporativo group-hover:text-azul-profundo">
                Abrir
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
