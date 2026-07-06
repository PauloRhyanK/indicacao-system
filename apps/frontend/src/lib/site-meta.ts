export const SITE_NAME = "CAIS";
export const SITE_TAGLINE = "Programa de Indicações — Consórcios";
export const SITE_DESCRIPTION =
  "Sistema de gestão de leads, vendas e indicações para equipes de consórcio.";

export const defaultSiteMeta = [
  { charSet: "utf-8" as const },
  { name: "viewport", content: "width=device-width, initial-scale=1" },
  { title: `${SITE_NAME} — ${SITE_TAGLINE}` },
  { name: "description", content: SITE_DESCRIPTION },
  { name: "author", content: "CAIS Consórcios" },
  { property: "og:title", content: `${SITE_NAME} — ${SITE_TAGLINE}` },
  { property: "og:description", content: SITE_DESCRIPTION },
  { property: "og:type", content: "website" },
  { name: "twitter:card", content: "summary" },
  { name: "twitter:title", content: `${SITE_NAME} — ${SITE_TAGLINE}` },
  { name: "twitter:description", content: SITE_DESCRIPTION },
  { name: "msapplication-TileColor", content: "#ffffff" },
  { name: "msapplication-TileImage", content: "/ms-icon-144x144.png" },
  { name: "theme-color", content: "#ffffff" },
];
