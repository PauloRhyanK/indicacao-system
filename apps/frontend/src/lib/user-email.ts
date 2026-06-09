const USER_EMAIL_DOMAIN = "caisinvestimentos.com.br";

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function emailLocalPartFromName(name: string): string {
  const first = name.trim().split(/\s+/)[0] ?? name;
  return normalizeText(first).replace(/[^a-z0-9]/g, "");
}

/** Preview do primeiro e-mail tentado (sem checar duplicatas no banco). */
export function previewEmailForName(name: string): string {
  const local = emailLocalPartFromName(name) || "usuario";
  return `${local}@${USER_EMAIL_DOMAIN}`;
}
