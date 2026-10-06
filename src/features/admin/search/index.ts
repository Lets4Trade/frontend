import { SETTINGS_GROUPS, SETTINGS_PAGE } from "@/features/admin/settings/catalog";
import { ADMIN_NAV } from "@/features/admin/nav";
import { hubGroups } from "@/features/pages/hub";
import { STATIC_PAGES } from "@/features/pages/registry";
import { sitePage, type SiteSectionDef } from "@/features/site/sections";

/**
 * O índice da busca do painel (Ctrl+K, 2026-10-01): telas do menu, ações
 * frequentes, cada cartão de Configurações, cada página e cada sessão
 * editável — e os jogos, lidos sob demanda.
 *
 * Tudo vem dos catálogos que as telas já usam (`nav.ts`, `settings/catalog`,
 * `pages/registry`, `site/sections`): item novo num deles aparece na busca sem
 * ninguém lembrar de cadastrá-lo aqui. Puro e testável.
 */

export type Role = "ADMIN" | "EDITOR";

export type SearchEntry = {
  id: string;
  title: string;
  /** Onde fica (aparece à direita do resultado): "Menu", "Rodapé", "Jogo"… */
  where: string;
  href: string;
  keywords: readonly string[];
};

type Gated = SearchEntry & { roles?: readonly Role[] };

const ACTIONS: readonly Gated[] = [
  { id: "acao:novo-produto", title: "Cadastrar produto", where: "Ação", href: "/admin/produtos/novo", keywords: ["novo", "criar", "adicionar"] },
  { id: "acao:precos", title: "Editar preços", where: "Ação", href: "/admin/produtos/precos", keywords: ["preço", "valor", "lote", "tabela"] },
  { id: "acao:fidelidade-niveis", title: "Níveis de fidelidade", where: "Ação", href: "/admin/fidelidade", keywords: ["cashback", "nível", "rank", "bronze", "prata", "ouro", "diamante", "adamantium", "ícone", "lets coin"] },
  { id: "acao:ordem", title: "Ordem dos produtos", where: "Ação", href: "/admin/produtos/ordem", keywords: ["ordenar", "posição", "vitrine"] },
  { id: "acao:novo-jogo", title: "Cadastrar jogo", where: "Ação", href: "/admin/jogos/novo", keywords: ["novo", "criar", "game"] },
  { id: "acao:nova-noticia", title: "Nova notícia", where: "Ação", href: "/admin/noticias/nova", keywords: ["blog", "post", "matéria"], roles: ["ADMIN", "EDITOR"] },
];

/**
 * Tudo o que a TELA escreve sobre a sessão vira palavra-chave: rótulos dos
 * campos ("CNPJ", "Botão de login"), textos padrão, a dica da imagem e os
 * nomes dos campos da lista. Quem busca digita o que leu na tela — "canais
 * oficiais" não achava nada porque só o NOME do cartão entrava (2026-10-01).
 */
function fieldWords(def: SiteSectionDef): string[] {
  return [
    def.titleLabel,
    def.subtitleLabel,
    def.footnoteLabel,
    def.bodyLabel,
    def.defaultTitle,
    def.defaultSubtitle,
    def.imageHint,
    def.list?.itemLabel,
    def.list?.title,
    def.list?.body,
    def.list?.image,
    def.list?.href,
  ].filter((value): value is string => Boolean(value && value.trim()));
}

const pageHref = (slug: string, section?: string) => {
  const search = new URLSearchParams({ pagina: slug });
  if (section) search.set("secao", section);
  return `/admin/paginas?${search.toString()}`;
};

function staticEntries(): Gated[] {
  const entries: Gated[] = [];

  for (const item of ADMIN_NAV) {
    if (!item.href) continue;
    entries.push({ id: `menu:${item.href}`, title: item.label, where: "Menu", href: item.href, keywords: [], roles: item.roles });
  }

  entries.push(...ACTIONS);
  entries.push({
    id: "pagina:desenho-home",
    title: "Home: textos e imagens",
    where: "Página",
    href: "/admin/paginas/desenho?pagina=home",
    keywords: ["home", "desenho", "textos", "imagens", "banner", "hero", "contadores", "reviews", "equipe", "guias"],
    roles: ["ADMIN", "EDITOR"],
  });

  const layout = sitePage(SETTINGS_PAGE);
  for (const group of SETTINGS_GROUPS) {
    const defs = group.sections
      .map((suffix) => layout?.sections.find((section) => section.key === suffix))
      .filter((def): def is SiteSectionDef => Boolean(def));
    entries.push({
      id: `config:${group.id}`,
      title: group.title,
      where: "Configurações",
      href: `/admin/configuracoes#${group.id}`,
      keywords: [group.description, ...group.keywords, ...defs.flatMap((def) => [def.label, ...fieldWords(def)])],
      roles: ["ADMIN", "EDITOR"],
    });
  }

  for (const page of STATIC_PAGES) {
    entries.push({
      id: `pagina:${page.slug}`,
      title: page.label,
      where: "Página",
      href: pageHref(page.slug),
      keywords: ["página", "editar"],
      roles: ["ADMIN", "EDITOR"],
    });

    if (page.kind === "content") {
      const catalog = sitePage(page.catalogPage);
      const keys = page.sectionKeys ?? catalog?.sections.map((section) => section.key) ?? [];
      for (const key of keys) {
        const def = catalog?.sections.find((section) => section.key === key);
        if (!def) continue;
        entries.push({
          id: `secao:${page.slug}:${key}`,
          title: def.label,
          where: page.label,
          href: pageHref(page.slug, key),
          keywords: fieldWords(def),
          roles: ["ADMIN", "EDITOR"],
        });
      }
    } else if (page.content.kind === "sections") {
      // Sessões das páginas por blocos abrem a PÁGINA (o construtor escolhe o bloco lá).
      for (const key of page.legacyKeys) {
        const def = sitePage(page.content.catalogPage)?.sections.find((section) => section.key === key);
        entries.push({
          id: `secao:${page.slug}:${key}`,
          title: page.legacyLabels[key] ?? def?.label ?? key,
          where: page.label,
          href: pageHref(page.slug),
          keywords: def ? fieldWords(def) : [],
          roles: ["ADMIN", "EDITOR"],
        });
      }
    }
  }

  // A descrição de cada cartão de "Páginas" (o que a pessoa lê no hub) também
  // vale na busca do destino dele. Menos no item de MENU: o cartão
  // "Configurações da loja" lista WhatsApp, CNPJ… e o menu passaria na frente
  // do cartão específico de cada um.
  for (const card of hubGroups().flatMap((group) => group.cards)) {
    for (const entry of entries) {
      if (entry.href === card.href && entry.where !== "Menu") entry.keywords = [...entry.keywords, card.description];
    }
  }

  return entries;
}

const STATIC = staticEntries();

/** O índice visível para o cargo. Jogos entram quando a lista chega. */
export function buildIndex(role: Role, games: readonly { id: string; name: string }[] = []): SearchEntry[] {
  const visible: SearchEntry[] = STATIC.filter((entry) => (entry.roles ?? ["ADMIN"]).includes(role)).map(
    (entry) => ({ id: entry.id, title: entry.title, where: entry.where, href: entry.href, keywords: entry.keywords }),
  );
  const gameEntries: SearchEntry[] = games.map((game) => ({
    id: `jogo:${game.id}`,
    title: game.name,
    where: "Jogo",
    // ADMIN cai na Central do jogo; o EDITOR não vê o catálogo, só o Builder.
    href: role === "ADMIN" ? `/admin/jogos/${game.id}` : `/admin/builder/${game.id}`,
    keywords: ["jogo", "game", "abas", "produtos", "servidores"],
  }));
  return [...visible, ...gameEntries];
}

export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Itens mostrados com a busca vazia: o menu e as configurações. */
export function suggestions(index: readonly SearchEntry[]): SearchEntry[] {
  return index.filter((entry) => entry.where === "Menu" || entry.where === "Configurações");
}

/**
 * Todas as palavras digitadas precisam aparecer (título, lugar ou
 * palavras-chave). Ordem: título que começa com o texto, título que o contém,
 * todas as palavras no título, o resto — empate fica na ordem do índice.
 */
export function search(index: readonly SearchEntry[], query: string, limit = 12): SearchEntry[] {
  const q = normalize(query);
  if (!q) return suggestions(index).slice(0, limit);
  const tokens = q.split(/\s+/);

  const scored: { entry: SearchEntry; score: number; order: number }[] = [];
  index.forEach((entry, order) => {
    const title = normalize(entry.title);
    const haystack = `${title} ${normalize(entry.where)} ${entry.keywords.map(normalize).join(" ")}`;
    if (!tokens.every((token) => haystack.includes(token))) return;
    const score = title.startsWith(q) ? 0 : title.includes(q) ? 1 : tokens.every((token) => title.includes(token)) ? 2 : 3;
    scored.push({ entry, score, order });
  });

  return scored
    .sort((a, b) => a.score - b.score || a.order - b.order)
    .slice(0, limit)
    .map((item) => item.entry);
}
