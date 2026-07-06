export const CONFIDENCIAL_SITE_NAME = "CAIS Confidencial";
export const CONFIDENCIAL_TAGLINE = "Condomínio de Credores — Recuperação Judicial";

/** Valor compartilhado entre meta tags e header HTTP X-Robots-Tag */
export const ROBOTS_NOINDEX_VALUE =
  "noindex, nofollow, noarchive, nosnippet, noimageindex, notranslate";

export const confidencialSiteMeta = [
  { charSet: "utf-8" as const },
  { name: "viewport", content: "width=device-width, initial-scale=1" },
  { name: "robots", content: ROBOTS_NOINDEX_VALUE },
  { name: "googlebot", content: ROBOTS_NOINDEX_VALUE },
  { name: "bingbot", content: ROBOTS_NOINDEX_VALUE },
  { name: "slurp", content: ROBOTS_NOINDEX_VALUE },
  { name: "duckduckbot", content: ROBOTS_NOINDEX_VALUE },
  { title: `Credores MG2 — ${CONFIDENCIAL_SITE_NAME}` },
  {
    name: "description",
    content: "Ambiente restrito de coordenação de credores para recuperação judicial.",
  },
  { name: "msapplication-TileColor", content: "#ffffff" },
  { name: "msapplication-TileImage", content: "/ms-icon-144x144.png" },
  { name: "theme-color", content: "#ffffff" },
];
