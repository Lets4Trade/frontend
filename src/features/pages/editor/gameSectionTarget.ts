import { builderStepHref, centralHref } from "@/features/admin/games/central";
import { ORBS_GAMES, type GameSectionKey } from "@/features/game/sections";

/**
 * Onde se edita o CONTEÚDO de cada seção da página de jogo, a partir do
 * Construtor (`/admin/paginas?pagina=jogo-<id>`).
 *
 * Antes (até 2026-10-09) toda seção mostrava o mesmo "Abrir o Builder do jogo"
 * — inclusive Referências, Notícias e Dúvidas, que nem estão no Builder (são
 * os textos comuns dos jogos), e o vídeo/reviews, que são da home. O usuário
 * ficava rodando entre telas. Agora:
 *   - `shared`: as sessões `games:*` abrem ALI MESMO, no painel do bloco;
 *   - `home`: a seção da home de onde o conteúdo vem;
 *   - `links`: a etapa EXATA do Builder ou da Central (mesmos destinos do mapa
 *     da Central, `storePageMap`).
 */
export type GameSectionLink = { label: string; href: string };

export type GameSectionTarget =
  | { kind: "shared"; sectionKeys: string[]; links: GameSectionLink[] }
  | { kind: "home"; source: string }
  /**
   * Dúvidas = a DESCRIÇÃO do jogo (blocos do Builder, 2026-10-08): o admin
   * põe ali o que quiser. O grupo de Orbs (jogos de PoE) vem antes dela. As
   * "Dúvidas frequentes" comuns NÃO são oferecidas aqui (pedido do usuário,
   * 2026-10-09) — continuam em Páginas → Textos comuns dos jogos.
   */
  | { kind: "faq"; descriptionHref: string; orbsKey: string | null }
  | { kind: "links"; links: GameSectionLink[] };

export function gameSectionTarget(key: string, gameId: string, gameSlug = ""): GameSectionTarget | null {
  const builder = (step: string) => builderStepHref(gameId, step);
  const tabs = centralHref(gameId, { section: "abas" });

  // Chave ANTIGA: o bloco "description" saiu em 2026-10-06 (a descrição foi
  // para o topo das Dúvidas), mas ordens salvas antes ainda o trazem.
  if (key === "description") {
    return { kind: "links", links: [{ label: "Descrição do jogo", href: builder("descricao") }] };
  }

  switch (key as GameSectionKey) {
    case "banner":
      return { kind: "links", links: [{ label: "Trocar banner", href: builder("banner") }] };
    case "identity":
      return {
        kind: "links",
        links: [
          { label: "Logo", href: builder("logo") },
          { label: "Títulos", href: builder("titulos") },
          { label: "Abas", href: tabs },
        ],
      };
    case "servers":
      return {
        kind: "links",
        links: [{ label: "Servidores", href: centralHref(gameId, { section: "visao-geral" }) }],
      };
    case "categories":
      return {
        kind: "links",
        links: [
          { label: "Categorias globais", href: builder("categorias") },
          { label: "Categorias por aba", href: tabs },
        ],
      };
    case "catalog":
      return { kind: "links", links: [{ label: "Produtos e preços", href: tabs }] };
    case "homeVideo":
      return { kind: "home", source: "video" };
    case "homeReviews":
      return { kind: "home", source: "reviews" };
    case "references":
      return { kind: "shared", sectionKeys: ["referencias"], links: [] };
    case "news":
      return {
        kind: "shared",
        sectionKeys: ["noticias"],
        // Notícia publicada no blog para o jogo VENCE os itens daqui.
        links: [{ label: "Notícias do blog", href: "/admin/noticias" }],
      };
    case "faq":
      return {
        kind: "faq",
        descriptionHref: builder("descricao"),
        // O grupo de Orbs só aparece nos jogos de Path of Exile (`ORBS_GAMES`),
        // e é só neles que o painel o oferece.
        orbsKey: ORBS_GAMES.has(gameSlug) ? "duvidas-orbs" : null,
      };
    default:
      return null;
  }
}
