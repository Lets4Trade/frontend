/**
 * Dados estruturados (JSON-LD, schema.org) e a origem pública do site.
 *
 * ── O que entra e o que NÃO entra (2026-11-27) ──────────────────────────────
 *   - Organization + WebSite na home: o site antigo já os tinha; tirar na troca
 *     seria um passo atrás no painel de conhecimento do Google.
 *   - BreadcrumbList na página de jogo: "Lets4Trade › Diablo 4 › Itens" no
 *     lugar do endereço cru no resultado.
 *   - Product/Offer (preço no resultado) NÃO entra: a diretriz do Google é
 *     marcar UM produto por página, não a grade de uma categoria. Marcar a grade
 *     do jogo arrisca ação manual (o site inteiro perde o rich result). O preço
 *     no Google pede página própria por produto — fica como próximo passo.
 *   - FAQPage NÃO entra: desde 2023 o Google só mostra FAQ de sites de governo
 *     e saúde. Seria peso na página sem nada no resultado.
 *
 * Só dados que JÁ aparecem na página — nada que o buscador veria e o visitante não.
 */

export const SITE_NAME = "Lets4Trade";

/** Origem pública do site — a mesma do `metadataBase` em `app/layout.tsx`. */
export function siteOrigin(): string {
  return (process.env.NEXT_PUBLIC_ROOT_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

/** Caminho do site (`/diablo-4?aba=itens`) → URL absoluta. */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${siteOrigin()}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * `JSON.stringify` seguro para dentro de `<script>`.
 *
 * Os textos são escritos no painel; um `</script>` neles fecharia a tag e o
 * resto viraria HTML executável. Trocar `<` (e `>`/`&`, por garantia) pelo
 * escape unicode mantém o JSON idêntico para o parser e inofensivo para o
 * HTML — é a recomendação do guia de JSON-LD do Next.
 */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

/** A loja: nome, endereço e logo (o mesmo do cabeçalho de fábrica). */
export function organizationJsonLd(logo: string | null) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteOrigin()}/#organization`,
    name: SITE_NAME,
    url: `${siteOrigin()}/`,
    ...(logo ? { logo: absoluteUrl(logo) } : {}),
  };
}

/** O site, ligado à loja pelo `@id`. */
export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteOrigin()}/#website`,
    name: SITE_NAME,
    url: `${siteOrigin()}/`,
    inLanguage: "pt-BR",
    publisher: { "@id": `${siteOrigin()}/#organization` },
  };
}

/** Trilha "Lets4Trade › Jogo › Aba" — cada item com o endereço que a página usa. */
export function breadcrumbJsonLd(items: readonly { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
