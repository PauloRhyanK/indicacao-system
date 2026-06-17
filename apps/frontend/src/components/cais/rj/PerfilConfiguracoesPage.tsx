import { GoogleCalendarIntegracaoCard } from "@/components/cais/rj/GoogleCalendarIntegracaoCard";

export function PerfilConfiguracoesPage({
  google,
  msg,
}: {
  google?: string;
  msg?: string;
}) {
  const flashMessage =
    google === "conectado"
      ? "Google Calendar conectado com sucesso. Novas reuniões serão sincronizadas automaticamente."
      : null;

  const flashError =
    google === "erro"
      ? decodeURIComponent(msg ?? "Não foi possível conectar o Google Calendar")
      : null;

  return (
    <>
      <h1 className="mb-1 text-[18px] font-semibold text-azul-profundo">Minhas configurações</h1>
      <p className="mb-5 max-w-xl text-[13px] text-slate-600">
        Preferências pessoais do ambiente confidencial — integrações e automações da sua conta.
      </p>

      <section>
        <GoogleCalendarIntegracaoCard flashMessage={flashMessage} flashError={flashError} />
      </section>
    </>
  );
}
