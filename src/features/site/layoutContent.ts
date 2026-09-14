import { backendAsset, publicApiGet } from "@/lib/publicApi";
import { sectionKey, sitePage, type SiteSectionDef } from "./sections";

/**
 * O conteúdo do CABEÇALHO e do RODAPÉ — a página `layout` do catálogo.
 *
 * ── Por que não é o `getSectionsFor` das outras páginas ────────────────────
 * Porque estes dois blocos renderizam em TODA requisição do site: home,
 * vitrine, login, checkout, conta e o painel inteiro. Com o `no-store` que as
 * páginas usam, cada visita a qualquer tela pagaria duas idas ao backend só
 * para desenhar a moldura — e uma delas no caminho crítico da primeira pintura.
 *
 * ── O cache, e por que ele é seguro aqui ──────────────────────────────────
 * A resposta é IGUAL para todo visitante (não há cookie na chamada) e não
 * carrega preço — o único dado que este projeto decidiu nunca servir velho. É a
 * mesma justificativa da tabela de níveis da fidelidade, que o cabeçalho já
 * consome cacheada há um turno.
 *
 * A diferença é que isto aqui é EDITÁVEL pelo painel, e um TTL cego faria o
 * admin salvar e esperar até uma hora. Por isso as duas leituras levam a
 * etiqueta `LAYOUT_TAG`, que `features/site/actions.ts` derruba em toda
 * escrita: o TTL é só a rede de segurança para uma escrita feita fora do painel
 * (um `psql` na mão, uma semente).
 *
 * ── Fail soft ─────────────────────────────────────────────────────────────
 * Qualquer imprevisto vira "tudo padrão", nunca exceção. O cabeçalho não pode
 * derrubar a loja inteira porque uma personalização de rótulo não respondeu.
 */

/** Uma hora, como a tabela de níveis. Ver o cabeçalho. */
const REVALIDATE_SECONDS = 3600;

/**
 * A etiqueta que a escrita do painel derruba.
 *
 * Vive aqui, e não em `actions.ts`, porque quem a DECLARA é quem lê — deixá-la
 * do lado da escrita convidaria a um segundo literal, e duas strings iguais em
 * dois arquivos divergem no primeiro renome.
 */
export const LAYOUT_TAG = "site-layout";

const PAGE_KEY = "layout";

type RawSection = {
  key: string;
  title?: string | null;
  subtitle?: string | null;
  footnote?: string | null;
  body?: string | null;
  imageUrl?: string | null;
};

type RawItem = {
  id?: string;
  title?: string | null;
  imageUrl?: string | null;
  href?: string | null;
};

/** Um texto já resolvido: o personalizado, ou o que o catálogo declarou. */
export type LayoutText = {
  title: string;
  subtitle: string;
  footnote: string;
  body: string;
  imageUrl?: string;
};

/** Um item de lista do rodapé — uma rede social ou um link de coluna. */
export type LayoutItem = {
  id: string;
  label: string;
  href: string;
  image?: string;
};

export type LayoutContent = {
  /** O texto de uma sessão de `layout`, pela chave curta (`header-selo`). */
  text: (key: string) => LayoutText;
  /** Os itens de uma lista de `layout`, pela chave curta (`footer-redes`). */
  items: (key: string) => LayoutItem[];
};

/**
 * Lê as duas rotas públicas em PARALELO e devolve os dois resolvedores.
 *
 * Duas rotas e não uma porque é assim que o backend já as expõe (uma para o
 * texto das sessões, outra para os itens das listas) — e as duas devolvem o
 * site inteiro de uma vez, então cabeçalho e rodapé na mesma página compartilham
 * a resposta cacheada em vez de pedirem de novo.
 */
export async function getLayoutContent(): Promise<LayoutContent> {
  const [rawSections, rawItems] = await Promise.all([
    publicApiGet<RawSection[]>("/site-sections", {
      revalidate: REVALIDATE_SECONDS,
      tags: [LAYOUT_TAG],
    }),
    publicApiGet<Record<string, RawItem[]>>("/site-section-items", {
      revalidate: REVALIDATE_SECONDS,
      tags: [LAYOUT_TAG],
    }),
  ]);

  const byKey = new Map(
    Array.isArray(rawSections) ? rawSections.map((row) => [row.key, row]) : [],
  );

  const page = sitePage(PAGE_KEY);

  return {
    text(key: string): LayoutText {
      const def: SiteSectionDef | undefined = page?.sections.find(
        (item) => item.key === key,
      );
      const row = byKey.get(sectionKey(PAGE_KEY, key));

      return {
        // Falsy e não `=== null`: o backend apaga campo vazio da resposta, e um
        // rótulo personalizado em branco também deve cair no padrão — botão sem
        // texto nenhum é um botão que ninguém sabe o que faz.
        title: row?.title?.trim() || def?.defaultTitle || "",
        subtitle: row?.subtitle?.trim() || def?.defaultSubtitle || "",
        footnote: row?.footnote?.trim() || def?.defaultFootnote || "",
        // O parágrafo do rodapé NÃO tem padrão de propósito: vazio, ele não é
        // desenhado. Ver o catálogo.
        body: row?.body?.trim() || def?.defaultBody || "",
        imageUrl: backendAsset(row?.imageUrl) ?? undefined,
      };
    },

    items(key: string): LayoutItem[] {
      const rows = rawItems?.[sectionKey(PAGE_KEY, key)];
      if (!Array.isArray(rows)) return [];

      return rows.map((row, index) => ({
        id: row.id ?? `${key}-${index}`,
        label: row.title?.trim() ?? "",
        // Link vazio vira âncora morta em vez de `undefined`: o rodapé desenha
        // um `<Link>`, e `href` indefinido é erro de runtime no Next.
        href: row.href?.trim() || "#",
        image: backendAsset(row.imageUrl) ?? undefined,
      }));
    },
  };
}
