import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/Button";
import { AdminSearchBox, FilterMenu } from "@/features/admin/AdminFilters";
import type { AdminGame } from "@/features/admin/catalog";
import { cn } from "@/lib/cn";
import {
  PARAM,
  SORT_BOXES,
  SORT_SELECT,
  TYPE_TABS,
  buildHref,
  type ProductsQuery,
} from "./catalog";

/**
 * Barra de filtros da tela de produtos (Figma 3805:3486 e irmãos).
 *
 * TUDO aqui é link, não botão com estado — o filtro mora na URL (ver
 * `list.ts`), então filtrar é navegar. É a mesma decisão do catálogo da
 * vitrine, e é o que mantém a filtragem no SERVIDOR: o navegador não baixa o
 * catálogo inteiro para esconder a maior parte dele.
 *
 * Por isso os dois "selects" do arquivo NÃO são `SelectField`: um `<select>` só
 * muda a URL com JavaScript, e estes são `<a>` de verdade dentro de um menu.
 * Ver `FilterMenu`.
 *
 * Medidas do arquivo (frame de 1920, margens de 50px): os dois botões de
 * 201×50 em x=50 e 276, o filtro de jogo (249) em 502, a ordem (249) em 776, a
 * busca (219) em 1050 e as quatro caixinhas a partir de 1312 — todos com 25px
 * de vão, exceto os 43px entre a busca e a primeira caixinha.
 * `flex-wrap`: os controles têm largura FIXA (medidas do arquivo) e não
 * encolhem. Sem quebrar linha, eles empurrariam a página para fora e
 * trariam de volta a barra horizontal.
 */
export function ProductFilters({
  games,
  query,
}: {
  games: AdminGame[];
  query: ProductsQuery;
}) {
  // Chave que muda a CADA mudança de filtro. Os menus são `<details>`, e a
  // navegação do Next é suave: sem remontar, o `open` do DOM sobrevive à troca
  // de página e o menu fica aberto por cima do resultado que ele acabou de
  // filtrar. Trocar a `key` força o remonte, que o fecha.
  const resetKey = `${query.game}|${query.type}|${query.sort}|${query.search}|${query.page}`;

  const currentGame = games.find((game) => game.id === query.game);
  const currentSort =
    SORT_SELECT.find((option) => option.value === query.sort) ?? SORT_SELECT[0];

  return (
    <div className="flex flex-wrap items-center gap-[25px]">
      <Link
        href="/admin/produtos/novo"
        className={cn(buttonVariants({ variant: "primary" }), "w-[201px] px-0")}
      >
        Cadastrar Produto
      </Link>

      <Link
        href="/admin/jogos/novo"
        className={cn(buttonVariants({ variant: "primary" }), "w-[201px] px-0")}
      >
        Cadastrar Game
      </Link>

      {/* Leva o jogo e a aba abertos aqui: a ordem é por aba de um jogo. */}
      <Link
        href={`/admin/produtos/ordem${
          query.game
            ? `?${PARAM.game}=${encodeURIComponent(query.game)}${
                query.type ? `&${PARAM.type}=${encodeURIComponent(query.type)}` : ""
              }`
            : ""
        }`}
        className={cn(buttonVariants({ variant: "outline" }), "w-[201px] px-0")}
      >
        Organizar ordem
      </Link>

      <FilterMenu
        key={`game-${resetKey}`}
        width={249}
        label={currentGame?.name ?? "Jogo"}
        active={query.game !== ""}
        options={[
          { href: buildHref(query, { game: "" }), label: "Todos os jogos", active: query.game === "" },
          ...games.map((game) => ({
            href: buildHref(query, { game: game.id }),
            label: game.name,
            active: game.id === query.game,
          })),
        ]}
      />

      <FilterMenu
        key={`sort-${resetKey}`}
        width={249}
        label={currentSort.label}
        active={query.sort !== "recente"}
        options={SORT_SELECT.map((option) => ({
          href: buildHref(query, { sort: option.value }),
          label: option.label,
          active: option.value === query.sort,
        }))}
      />

      <AdminSearchBox
        action="/admin/produtos"
        name={PARAM.search}
        defaultValue={query.search}
        placeholder="Pesquisar itens..."
        hidden={{
          [PARAM.game]: query.game,
          [PARAM.type]: query.type,
          [PARAM.sort]: query.sort === "recente" ? "" : query.sort,
        }}
      />

      {/* 43px e não 25 até a primeira caixinha — é a medida do arquivo, e o
          respiro separa a busca do grupo de ordenação. */}
      <div className="ml-[18px] flex items-center gap-[25px]">
        {SORT_BOXES.map((option) => {
          const active = query.sort === option.value;
          return (
            <Link
              key={option.value}
              // Clicar na ordenação ativa desliga e volta para "Mais recente":
              // sem isso não há como sair de "Menor preço" sem abrir o outro
              // menu, e os dois controles são o mesmo estado.
              href={buildHref(query, { sort: active ? "recente" : option.value })}
              role="radio"
              aria-checked={active}
              className="flex items-center gap-[10px] transition-opacity hover:opacity-90"
            >
              <span
                aria-hidden
                className={cn(
                  "h-[30px] w-[32px] rounded-[8px] border-2 border-white/10 backdrop-blur-[100px]",
                  active
                    ? "bg-[image:var(--brand-orange-gradient)]"
                    : "bg-[image:var(--brand-surface-fill)]",
                )}
              />
              <span className="font-poppins text-[15px] leading-none font-bold tracking-[0.15px] whitespace-nowrap text-white/80">
                {option.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Abas de tipo (Figma 3805:3485): 130×99 com 15px de vão, ícone de 50px no topo
 * e o rótulo embaixo. A ativa recebe o degradê laranja.
 *
 * O arquivo desenha NOVE abas, e aqui há SETE. "VENDA PRA NÓS" e "FIDELIDADE"
 * não são tipos de produto — na vitrine são links para `/venda` e
 * `/fidelidade`. Como filtro de produto nunca casariam com nada, e uma aba que
 * sempre volta vazia é pior que uma aba a menos. Ver `list.ts`.
 */
export function TypeTabs({ query }: { query: ProductsQuery }) {
  return (
    <nav
      aria-label="Filtrar por tipo de produto"
      className="flex flex-wrap justify-center gap-[15px]"
    >
      {TYPE_TABS.map((tab) => {
        const active = query.type === tab.value;
        return (
          <Link
            key={tab.value}
            // Clicar na aba ativa desliga o filtro — é o gesto natural para
            // "voltar a ver tudo", e não há um botão "todos" no arquivo.
            href={buildHref(query, { type: active ? "" : tab.value })}
            aria-current={active ? "true" : undefined}
            className={cn(
              "relative flex h-[99px] w-[130px] flex-col items-center justify-start rounded-[8px]",
              "border-2 border-white/10 px-[10px] pt-[11px] backdrop-blur-[100px] transition-opacity hover:opacity-90",
              active
                ? "bg-[image:var(--brand-orange-gradient)]"
                : "bg-[image:var(--brand-surface-fill)]",
            )}
          >
            <TabIcon
              icon={tab.icon}
              overlay={"overlay" in tab ? tab.overlay : undefined}
            />

            <span
              className={cn(
                "mt-[8px] text-center font-poppins text-[15px] leading-[19px] font-bold tracking-[0.15px]",
                active ? "text-white" : "text-white/80",
              )}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * O SVG do ícone é MAIOR que a caixa de 50px — ele sangra para baixo e para os
 * lados, que é onde mora o brilho do desenho. Os valores são os que o arquivo
 * declara; recortar em 50×50 cortaria o brilho fora.
 *
 * Os mesmos números do `TabIcon` da vitrine (`features/game/GameIdentity.tsx`),
 * porque é o MESMO ícone: as duas telas desenham a mesma fileira de abas.
 */
const ICON_BLEED = "0 -14.81% -29.63% -14.81%";

function TabIcon({
  icon,
  overlay,
}: {
  icon: string;
  /** O ícone de ITENS é composto por dois desenhos sobrepostos. */
  overlay?: { src: string; inset: string };
}) {
  return (
    <span className="relative block size-[50px]">
      <span className="absolute" style={{ inset: ICON_BLEED }}>
        <Image src={icon} alt="" width={65} height={65} aria-hidden className="size-full" />
      </span>

      {overlay ? (
        <span className="absolute" style={{ inset: overlay.inset }} aria-hidden>
          <Image
            src={overlay.src}
            alt=""
            width={32}
            height={32}
            className="size-full -scale-x-100 rotate-180"
          />
        </span>
      ) : null}
    </span>
  );
}
