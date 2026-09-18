import { backendAsset, publicApiGet } from "@/lib/publicApi";
import { sectionKey, sitePage, type SiteSectionDef } from "./sections";

/** Espelha `VIDEO_PATH` do backend (`video-storage.ts`). */
const VIDEO_PATH = /^\/uploads\/videos\/[a-f0-9-]{36}\.(mp4|webm)$/;
import {
  resolveSectionLayout,
  type SectionLayout,
  type SectionLayoutRow,
} from "./pageLayout";

/**
 * A leitura das SESSÕES para as páginas públicas do site.
 *
 * ── Sem cookie, como a vitrine ─────────────────────────────────────────────
 * Vive separada de `list.ts` (que é do painel e importa `serverApi`) pelo mesmo
 * motivo de `navTabs.ts`: as páginas públicas são renderizadas em caminhos que
 * passam por client component, e um `next/headers` importado por engano quebra
 * o build. Ver o comentário em `navTabs.ts`.
 *
 * ── O que é personalizado e o que é padrão ─────────────────────────────────
 * O banco guarda só o que o admin mudou. Tudo o mais vem do catálogo em
 * `sections.ts`, que por sua vez descreve o que os componentes já desenhavam.
 * Uma página que nunca passou pela tela de edição renderiza exatamente como
 * antes — e foi isso que dispensou migrar dado.
 */

type RawSection = {
  key: string;
  title?: string | null;
  subtitle?: string | null;
  footnote?: string | null;
  body?: string | null;
  imageUrl?: string | null;
  secondaryImageUrl?: string | null;
  videoUrl?: string | null;
  /** Textos extras por nome — ver `SiteSectionContent.extras` no backend. */
  extras?: Record<string, string> | null;
};

export type SectionView = {
  /** Já resolvido: o personalizado, ou o do código. */
  title: string;
  /**
   * As duas linhas curtas extras — subtítulo e uma legenda menor.
   *
   * Várias seções do arquivo têm mais de um texto solto (reviews tem título,
   * pergunta e contador). Ver o model `SiteSectionContent`.
   */
  subtitle: string;
  footnote: string;
  /** O texto longo da sessão — hoje só o parágrafo da "Equipe" tem um. */
  body: string;
  /** Só quando o admin subiu uma; o componente decide o que fazer sem ela. */
  imageUrl?: string;
  /** A segunda arte da sessão (foto do CEO no bloco do vídeo), quando subida. */
  secondaryImageUrl?: string;
  /**
   * Vídeo ENVIADO pelo painel (URL absoluta no backend), só quando o caminho é
   * de um vídeo nosso (`/uploads/videos/<uuid>.mp4|webm`). Alternativa ao link
   * do YouTube do bloco do vídeo.
   */
  videoUrl?: string;
  /**
   * Um texto EXTRA da sessão, pelo nome, com o padrão do código como reserva.
   *
   * Existe porque várias seções têm mais frases do que as quatro colunas do
   * model comportam — o bloco do vídeo tem a apresentação do CEO, o rótulo do
   * botão e a assinatura. O padrão fica junto do componente que o desenha.
   */
  extra: (name: string, fallback: string) => string;
};

/**
 * Resolve as sessões de UMA página.
 *
 * Devolve uma função em vez de um objeto porque cada componente pergunta pela
 * sua sessão pelo nome — `sections("video").title` se lê melhor do que um
 * índice, e uma chave errada devolve o padrão em vez de `undefined`.
 *
 * ⚠️ Falha de rede vira "tudo padrão", nunca exceção. A home não pode deixar de
 * carregar porque uma personalização de título não respondeu.
 */
export async function getSectionsFor(
  pageKey: string,
): Promise<(key: string) => SectionView> {
  const page = sitePage(pageKey);
  const rows = (await publicApiGet<RawSection[]>("/site-sections")) ?? [];
  const byKey = new Map(
    Array.isArray(rows) ? rows.map((row) => [row.key, row]) : [],
  );

  return (key: string): SectionView => {
    const def: SiteSectionDef | undefined = page?.sections.find(
      (item) => item.key === key,
    );
    const row = byKey.get(sectionKey(pageKey, key));

    return {
      // Falsy e não `=== null`: o backend apaga campo vazio da resposta, e o
      // título personalizado em branco também deve cair no padrão.
      title: row?.title?.trim() || def?.defaultTitle || "",
      subtitle: row?.subtitle?.trim() || def?.defaultSubtitle || "",
      footnote: row?.footnote?.trim() || def?.defaultFootnote || "",
      body: row?.body?.trim() || def?.defaultBody || "",
      imageUrl: backendAsset(row?.imageUrl) ?? undefined,
      secondaryImageUrl: backendAsset(row?.secondaryImageUrl) ?? undefined,
      // Só caminho de vídeo NOSSO vira `src` de <video>: o campo vem do banco, e
      // um valor fora do formato não deve apontar o player para outro lugar.
      videoUrl:
        row?.videoUrl && VIDEO_PATH.test(row.videoUrl)
          ? (backendAsset(row.videoUrl) ?? undefined)
          : undefined,
      // Falsy e não `!== undefined`: texto extra em branco também cai no padrão
      // do código — é como o admin desfaz uma personalização.
      extra: (name: string, fallback: string) => {
        const value = row?.extras?.[name];
        return (typeof value === "string" ? value.trim() : "") || fallback;
      },
    };
  };
}

/** Um item de lista, já com as artes resolvidas para URL absoluta. */
export type SectionItemView = {
  id: string;
  /** Texto curto: nome, pergunta, título do guia. Nunca `undefined`. */
  title: string;
  /** Texto longo: depoimento, resposta, corpo do guia. */
  body: string;
  /** Arte principal, quando a seção tem. */
  image?: string;
  /** Segunda arte (guia: logo; slide do hero: logo). */
  secondaryImage?: string;
  href?: string;
  /** Data de publicação (ISO). Só o card de notícia a desenha hoje. */
  createdAt?: string;
};

type RawItem = {
  id?: string;
  title?: string | null;
  body?: string | null;
  imageUrl?: string | null;
  secondaryImageUrl?: string | null;
  href?: string | null;
  createdAt?: string | null;
};

/**
 * Os ITENS das listas de sessão — reviews, equipe, guias, dúvidas, slides.
 *
 * ── Uma chamada para a página inteira ──────────────────────────────────────
 * A home desenha CINCO listas. Uma leitura por seção faria cinco idas ao
 * backend dentro do mesmo SSR; a rota devolve tudo agrupado por chave, pelo
 * mesmo motivo de `/site-sections`.
 *
 * ── Lista vazia é vazia mesmo ──────────────────────────────────────────────
 * Não existe queda para conteúdo de código. Com o admin podendo apagar itens,
 * "apaguei tudo e voltou sozinho" seria pior que uma seção vazia — e o que a
 * loja tinha já entrou no banco pela semente (`pnpm db:seed:site-content`).
 *
 * ⚠️ Falha de rede vira listas vazias, nunca exceção — mesma regra de
 * `getSectionsFor`. A home não pode deixar de carregar porque a lista de
 * reviews não respondeu.
 */
export async function getSectionItemsFor(
  pageKey: string,
): Promise<(key: string) => SectionItemView[]> {
  const raw =
    (await publicApiGet<Record<string, RawItem[]>>("/site-section-items")) ?? {};

  return (key: string): SectionItemView[] => {
    const rows = raw[sectionKey(pageKey, key)];
    if (!Array.isArray(rows)) return [];

    return rows.map((row, index) => ({
      // O id vem do banco; o índice é rede de segurança para o `key` do React
      // caso uma linha chegue sem ele.
      id: row.id ?? `${key}-${index}`,
      title: row.title?.trim() ?? "",
      body: row.body?.trim() ?? "",
      image: backendAsset(row.imageUrl) ?? undefined,
      secondaryImage: backendAsset(row.secondaryImageUrl) ?? undefined,
      href: row.href?.trim() || undefined,
      createdAt: row.createdAt ?? undefined,
    }));
  };
}

/**
 * A ORDEM e a visibilidade das sessões de uma página (2026-09-15).
 *
 * Mesma leitura de `getSectionsFor` — o `fetch` do Next memoriza a chamada
 * dentro da mesma renderização, então pedir as duas coisas não custa duas idas
 * ao backend.
 *
 * Falha de rede vira a ordem do CÓDIGO, com tudo visível: a página tem que
 * carregar mesmo sem a personalização.
 */
export async function getSectionLayout(pageKey: string): Promise<SectionLayout> {
  const page = sitePage(pageKey);
  const catalogKeys = page?.sections.map((section) => section.key) ?? [];
  const rows = (await publicApiGet<SectionLayoutRow[]>("/site-sections")) ?? [];

  return resolveSectionLayout(catalogKeys, Array.isArray(rows) ? rows : [], pageKey);
}
