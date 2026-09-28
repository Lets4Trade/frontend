import Link from "next/link";
import { buildHref, scopedCategories, type CatalogQuery } from "./catalog";
import { getServiceProducts } from "./content";
import { pillClassName } from "./pill";
import { ServiceConfigurator } from "./ServiceConfigurator";
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
  // URL, vale a primeira do escopo — o card nunca abre "sem categoria" quando
  // o serviço é dividido em categorias.
  const selectedCategory = query.categories[0] ?? categories[0]?.id ?? "";

  const products = await getServiceProducts(page, {
    tab: tab.id,
    server: query.server,
    category: selectedCategory || undefined,
  });

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
      className="flex flex-col gap-[50px] lg:flex-row lg:items-start lg:justify-between"
    >
      <ServiceText content={tab.content} />
      <div className="w-full lg:ml-auto lg:w-auto">
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
 * Os textos da aba ("What you will get", "Requirements"...). TEXTO PURO: o
 * React escapa tudo, e nada aqui passa por `dangerouslySetInnerHTML` — o
 * conteúdo é escrito no painel e não pode virar marcação na loja.
 */
function ServiceText({ content }: { content?: ServiceContent }) {
  if (!content || content.sections.length === 0) return null;

  return (
    <div className="min-w-0 flex-1 lg:max-w-[1016px] lg:pl-[29px]">
      {content.sections.map((section, index) => (
        <section key={index} className={index > 0 ? "mt-[40px]" : undefined}>
          {section.title ? <h2 className={TITLE}>{section.title}</h2> : null}
          {section.items.length > 0 ? (
            <ul className={section.title ? "mt-[15px]" : undefined}>
              {section.items.map((item, itemIndex) => (
                <li
                  key={itemIndex}
                  className="flex gap-[8px] font-helvetica text-[16px] leading-[27px] tracking-[0.16px] text-brand-placeholder"
                >
                  <span aria-hidden>●</span>
                  <span className="min-w-0 break-words">{item}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
    </div>
  );
}
