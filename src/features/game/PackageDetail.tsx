import Link from "next/link";
import { buildHref, type CatalogQuery } from "./catalog";
import { getPackageVariants } from "./content";
import { pickPackageVariant } from "./packages";
import { pillClassName } from "./pill";
import { ServiceConfigurator } from "./ServiceConfigurator";
import { ServiceText } from "./ServiceSection";
import { withEffectivePricing } from "./storefrontTabs";
import type { GamePage, GameTab } from "./types";

/**
 * A PÁGINA DO PACOTE (2026-10-01) — o que o CONTINUAR de um card abre, no
 * lugar da grade. Contrato `.claude/context/boosting-pacotes.md`.
 *
 * O admin escolhe, por pacote, o layout depois do CONTINUAR — e a escolha É o
 * modo de preço, que o `ServiceConfigurator` já desenha:
 *   - Faixa de nível (Figma 1708:3266) = `LEVEL_RANGE`;
 *   - Lista de serviços (Figma 1735:4247) = `FIXED` + serviços marcáveis.
 *
 * À esquerda os textos DO PACOTE (vazio = os da aba); à direita o card com a
 * arte do pacote, o servidor em botões e o configurador. Cada servidor tem
 * preço próprio, então trocar de servidor é trocar de PRODUTO: as pílulas
 * apontam para o mesmo pacote (mesmo nome) no outro servidor.
 */
export async function PackageDetail({
  page,
  query,
  tab,
  pkg,
}: {
  page: GamePage;
  query: CatalogQuery;
  tab: GameTab;
  pkg: string;
}) {
  const variants = withEffectivePricing(await getPackageVariants(page, pkg), tab.layout);
  const current = pickPackageVariant(variants, pkg, tab.id);
  const back = `${buildHref(page.slug, query, { page: query.page })}#pacotes`;

  if (!current) {
    return (
      <section aria-label={tab.label} className="py-[60px] text-center">
        <p className="font-helvetica text-[18px] text-brand-fg-muted">Este pacote não está mais disponível.</p>
        <Link href={back} className="mt-[16px] inline-block font-poppins text-[15px] font-bold text-brand-orange hover:underline">
          ← Ver todos os pacotes
        </Link>
      </section>
    );
  }

  const servers = page.servers.items
    .map((server) => ({ server, product: variants.find((item) => item.serverSlug === server.slug) }))
    .filter((entry): entry is { server: (typeof entry)["server"]; product: NonNullable<(typeof entry)["product"]> } =>
      Boolean(entry.product),
    );
  const serversTitleId = `pacote-${current.id}-servidores`;

  const filters =
    servers.length > 1 ? (
      <div>
        <h3 id={serversTitleId} className={TITLE}>
          {page.servers.label}:
        </h3>
        <div role="radiogroup" aria-labelledby={serversTitleId} className="mt-[15px] flex flex-wrap gap-[15px]">
          {servers.map(({ server, product }) => {
            const active = product.id === current.id;
            return (
              <Link
                key={server.slug}
                href={buildHref(page.slug, query, { server: server.slug, categories: [], pkg: product.id })}
                scroll={false}
                role="radio"
                aria-checked={active}
                className={pillClassName(active, "max-w-full truncate")}
              >
                {server.label}
              </Link>
            );
          })}
        </div>
      </div>
    ) : null;

  const context = {
    gameSlug: page.slug,
    platform: current.serverLabel ?? page.name,
    gameLogo: page.identity.logo?.src,
  };

  return (
    <section
      id="pacote"
      aria-label={current.name}
      className="flex scroll-mt-[100px] flex-col gap-[40px] lg:flex-row lg:items-start lg:justify-between"
    >
      <div className="min-w-0 flex-1">
        <Link
          href={back}
          className="font-poppins text-[15px] font-bold text-brand-orange transition-opacity hover:opacity-80 lg:pl-[29px]"
        >
          ← Voltar aos pacotes
        </Link>
        <h2 className="mt-[14px] mb-[30px] font-poppins text-[26px] leading-[34px] font-bold break-words text-white lg:pl-[29px]">
          {current.name}
        </h2>
        <ServiceText content={current.content ?? tab.content} />
      </div>

      <div className="w-full lg:ml-auto lg:w-auto">
        <ServiceConfigurator
          // Outro servidor = outro produto: a escolha anterior não sobrevive.
          key={current.id}
          products={[current]}
          context={context}
          filters={filters}
          emptyMessage="Este pacote está indisponível no momento."
        />
      </div>
    </section>
  );
}

const TITLE = "font-helvetica text-[18px] leading-none font-bold tracking-[0.18px] text-white";
