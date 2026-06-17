import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { ConfidencialUsersPanel } from "../../../components/ConfidencialUsersPanel";
import { canAccessRjSettings } from "@/lib/use-permissions";

export const Route = createFileRoute("/_authenticated/configuracoes/usuarios")({
  head: () => ({ meta: [{ title: "Usuários — CAIS Confidencial" }] }),
  beforeLoad: ({ context }) => {
    if (!canAccessRjSettings(context.permissions, context.user.roles)) {
      throw redirect({ to: "/credores" });
    }
  },
  component: UsuariosPage,
});

function UsuariosPage() {
  return (
    <>
      <Link
        to="/configuracoes"
        className="mb-3 inline-flex items-center gap-1 text-[12px] text-slate-500 hover:text-azul-profundo"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Configurações
      </Link>
      <h1 className="mb-4 text-[18px] font-semibold text-azul-profundo">Usuários</h1>
      <ConfidencialUsersPanel />
    </>
  );
}
