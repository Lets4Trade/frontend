import Link from "next/link";
import { buildHref, scopedCategories, type CatalogQuery } from "./catalog";
import { getServiceProducts } from "./content";
import { ALL_LABEL, pillClassName } from "./pill";
import { ServiceConfigurator } from "./ServiceConfigurator";
import { withEffectivePricing } from "./storefrontTabs";
import { SectionContentView } from "./SectionContentView";
import type { GamePage, GameTab, ServiceContent } from "./types";

/**
 * Layout SERVIÇO de uma aba (Figma 1708:3266): os textos da aba à esquerda
 * (x=132, ~1016 de largura) e o card configurador à direita (1712:3968, 554 de
 * largura, encostado na borda direita da faixa de 1715).
 *
 * Server component: servidor e categoria vêm da URL (como no catálogo) e a
 * lista de produtos do escopo é buscada AQUI, já filtrada pelo banco. Só a
 * escolha que muda o preço vai para o cliente (`ServiceConfigurator`).
 *
 * Abaixo de 1024px as duas colunas empilham: o texto primeiro (a ordem de
 * leitura do arquivo) e o card logo depois.
 */
export async function ServiceSection({
  page,
  query,
  tab,
}: {
  page: GamePage;
  query: CatalogQuery;
  tab: GameTab;
}) {
  const categories = scopedCategories(page, query);
  // Uma categoria por vez no card (pílulas de escolha única). Sem nenhuma na
  // URL vale "Todos" (2026-11-17, pedido do usuário; antes abria na primeira
  // do escopo): o card lista os serviços de todas as categorias.
  const selectedCategory = query.categories[0] ?? "";

  // A regra que VALE (`effectivePricing`): a mesma decisão que o backend usa
  // para cobrar — produto sem regra salva vira FIXED aqui e lá.
  const products = withEffectivePricing(
    await getServiceProducts(page, {
      tab: tab.id,
      server: query.server,
      category: selectedCategory || undefined,
    }),
    tab.layout,
  );

  const server = page.servers.items.find((item) => item.slug === query.server);
  const context = {
    gameSlug: page.slug,
    platform: server?.label ?? page.name,
    gameLogo: page.identity.logo?.src,
  };

  const serversTitleId = `servico-${tab.id}-servidores`;
  const categoriesTitleId = `servico-${tab.id}-categorias`;
  const tabName = tab.label.charAt(0) + tab.label.slice(1).toLocaleLowerCase("pt-BR");

  const filters = (
    <>
      {page.servers.items.length > 0 ? (
        <div>
          <h3 id={serversTitleId} className={TITLE}>
            {page.servers.label}:
          </h3>
          {/* Links, não botões: trocar de servidor muda a LISTA de produtos, e
              isso é navegação (mesma regra do catálogo). `scroll={false}`
              mantém a pessoa no card em vez de voltar ao topo. */}
          <div role="radiogroup" aria-labelledby={serversTitleId} className="mt-[15px] flex flex-wrap gap-[25px]">
            {page.servers.items.map((item) => {
              const active = item.slug === query.server;
              return (
                <Link
                  key={item.slug}
                  href={buildHref(page.slug, query, { server: item.slug, categories: [] })}
                  scroll={false}
                  role="radio"
                  aria-checked={active}
                  className={pillClassName(active, "max-w-full truncate")}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}

      {categories.length > 0 ? (
        <div className="mt-[25px] first:mt-0">
          <h3 id={categoriesTitleId} className={TITLE}>
            Categoria de {tabName}:
          </h3>
          <div role="radiogroup" aria-labelledby={categoriesTitleId} className="mt-[15px] flex flex-wrap gap-[25px]">
            <Link
              href={buildHref(page.slug, query, { categories: [] })}
              scroll={false}
              role="radio"
              aria-checked={!selectedCategory}
              className={pillClassName(!selectedCategory, "max-w-full truncate")}
            >
              {ALL_LABEL}
            </Link>
            {categories.map((category) => {
              const active = category.id === selectedCategory;
              return (
                <Link
                  key={category.id}
                  href={buildHref(page.slug, query, { categories: [category.id] })}
                  scroll={false}
                  role="radio"
                  aria-checked={active}
                  className={pillClassName(active, "max-w-full truncate")}
                >
                  {category.label}
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}
    </>
  );

  return (
    <section
      aria-label={tab.label}
      className="flex flex-col gap-[50px] desk:flex-row desk:items-start desk:justify-between"
    >
      <ServiceText content={tab.content} />
      <div className="w-full desk:ml-auto desk:w-auto">
        <ServiceConfigurator
          // Novo escopo, nova escolha: sem a `key`, o produto escolhido no
          // servidor anterior sobreviveria à troca.
          key={`${query.server}|${selectedCategory}`}
          products={products}
          context={context}
          filters={filters}
          emptyMessage="Ainda não há serviços disponíveis para esta escolha. Tente outro servidor ou categoria, ou fale com o suporte."
        />
      </div>
    </section>
  );
}

const TITLE =
  "font-helvetica text-[18px] leading-none font-bold tracking-[0.18px] text-white";

/**
 * Os textos da aba ("What you will get", "Requirements"...). Markdown RESTRITO
 * desenhado como elementos React — nada aqui passa por `dangerouslySetInnerHTML`
 * (ver `SectionContentView`).
 */
export function ServiceText({ content }: { content?: ServiceContent }) {
  if (!content || content.sections.length === 0) return null;

  return (
    // Visual do card de Dúvidas (2026-11-17, pedido do usuário): fundo cinza
    // arredondado e barrinha laranja no título de cada seção. Celular com
    // recuos menores, como o FAQ.
    <div className="min-w-0 flex-1 rounded-[24px] border border-brand-border bg-[image:var(--brand-surface-fill)] px-[18px] py-[28px] desk:rounded-[30px] desk:px-[24px] desk:py-[40px]">
      {content.sections.map((section, index) => (
        <section key={index} className={index > 0 ? "mt-[40px] desk:mt-[50px]" : undefined}>
          <SectionContentView section={section} titleBar />
        </section>
      ))}
    </div>
  );
}
