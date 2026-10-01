import { ServerPicker } from "./CatalogFilters";
import type { CatalogQuery } from "./catalog";
import { getServiceProducts } from "./content";
import { QuantityConfigurator } from "./QuantityConfigurator";
import { ServiceText } from "./ServiceSection";
import { withEffectivePricing } from "./storefrontTabs";
import type { GamePage, GameTab } from "./types";

/**
 * Layout QUANTIDADE de uma aba (Gold, Figma 1629:631): "Selecionar servidor"
 * em botões, o painel de quantidade + card "Preço" e, embaixo, os textos da
 * aba (se o admin escreveu algum).
 *
 * Server component, como o `ServiceSection`: o servidor vem da URL (links
 * `?servidor=`, trocar de servidor muda a LISTA) e os produtos do escopo são
 * buscados aqui, já filtrados pelo banco. Só a quantidade — que muda o preço e
 * nada mais — vive no cliente.
 *
 * O servidor fica DENTRO deste bloco (e o bloco genérico de servidor some):
 * reordenar a página no builder não pode separar o servidor do painel que ele
 * filtra.
 */
export async function QuantitySection({
  page,
  query,
  tab,
}: {
  page: GamePage;
  query: CatalogQuery;
  tab: GameTab;
}) {
  const products = withEffectivePricing(
    await getServiceProducts(page, { tab: tab.id, server: query.server }),
    tab.layout,
  );

  const server = page.servers.items.find((item) => item.slug === query.server);
  const context = {
    gameSlug: page.slug,
    platform: server?.label ?? page.name,
    gameLogo: page.identity.logo?.src,
  };

  return (
    <section aria-label={tab.label} className="flex flex-col gap-[25px]">
      <ServerPicker page={page} query={query} />
      <QuantityConfigurator
        // Novo servidor, nova escolha (a lista de produtos é outra).
        key={query.server}
        products={products}
        context={context}
        emptyMessage="Ainda não há ofertas disponíveis para esta escolha. Tente outro servidor ou fale com o suporte."
      />
      {tab.content ? (
        <div className="mt-[25px]">
          <ServiceText content={tab.content} />
        </div>
      ) : null}
    </section>
  );
}
