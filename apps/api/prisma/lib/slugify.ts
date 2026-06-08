/** Normaliza texto para comparação (remove acentos, lowercase, trim). */
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

/** Gera slug URL-safe a partir de um nome exibível. */
export function slugify(name: string): string {
  return normalizeText(name)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
