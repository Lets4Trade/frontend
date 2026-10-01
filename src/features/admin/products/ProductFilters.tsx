import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/Button";
import { AdminSearchBox, FilterMenu } from "@/features/admin/AdminFilters";
import type { AdminGame } from "@/features/admin/catalog";
import { centralHref } from "@/features/admin/games/central";
import { cn } from "@/lib/cn";
import {
  PARAM,
  SORT_BOXES,
  SORT_SELECT,
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
  const resetKey = `${query.game}|${query.tab}|${query.sort}|${query.search}|${query.page}`;

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
                query.tab ? `&${PARAM.tab}=${encodeURIComponent(query.tab)}` : ""
              }`
            : ""
        }`}
        className={cn(buttonVariants({ variant: "outline" }), "w-[201px] px-0")}
      >
        Organizar ordem
      </Link>

      {/* Mesmo jogo/aba: o "Editar preços" também é por aba de um jogo. */}
      <Link
        href={`/admin/produtos/precos${
          query.game
            ? `?${PARAM.game}=${encodeURIComponent(query.game)}${
                query.tab ? `&${PARAM.tab}=${encodeURIComponent(query.tab)}` : ""
              }`
            : ""
        }`}
        className={cn(buttonVariants({ variant: "outline" }), "w-[201px] px-0")}
      >
        Editar preços
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
          [PARAM.tab]: query.tab,
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
 * Abas do JOGO escolhido (contrato `game-tabs.md`, 2026-09-28), na moldura do
 * Figma 3805:3485: 130×99, ícone de 50px e rótulo; a ativa com o degradê
 * laranja. Ficam só as de catálogo e serviço (LINK não tem produto).
 *
 * SÓ com jogo escolhido: desde a FASE 5 não existe "tipo" global, e aba é
 * coisa de UM jogo — sem jogo a tela não desenha filtro de aba nenhum.
 */
export function GameTabFilter({
  query,
  tabs,
}: {
  query: ProductsQuery;
  tabs: { id: string; label: string; icon: string | null; isActive: boolean }[];
}) {
  if (tabs.length === 0) {
    return (
      <p className="text-center font-poppins text-[14px] text-brand-fg-subtle">
        Este jogo não tem abas de produto.{" "}
        <Link href={centralHref(query.game, { section: "abas" })} className="font-bold text-brand-orange">
          Configurar abas →
        </Link>
      </p>
    );
  }
  return (
    <nav aria-label="Filtrar por aba do jogo" className="flex flex-wrap justify-center gap-[15px]">
      {tabs.map((tab) => {
        const active = query.tab === tab.id;
        return (
          <Link
            key={tab.id}
            href={buildHref(query, { tab: active ? "" : tab.id })}
            aria-current={active ? "true" : undefined}
            className={cn(
              "relative flex h-[99px] min-w-[130px] flex-col items-center justify-start rounded-[8px]",
              "border-2 border-white/10 px-[10px] pt-[11px] backdrop-blur-[100px] transition-opacity hover:opacity-90",
              active ? "bg-[image:var(--brand-orange-gradient)]" : "bg-[image:var(--brand-surface-fill)]",
              tab.isActive ? null : "opacity-60",
            )}
          >
            {tab.icon ? (
              <Image src={tab.icon} alt="" width={50} height={50} aria-hidden className="size-[50px] object-contain" />
            ) : (
              <span aria-hidden className="size-[50px] rounded-[8px] border border-dashed border-white/20" />
            )}
            <span
              className={cn(
                "mt-[8px] text-center font-poppins text-[15px] leading-[19px] font-bold tracking-[0.15px]",
                active ? "text-white" : "text-white/80",
              )}
            >
              {tab.label}
              {tab.isActive ? null : <span className="sr-only"> (oculta na loja)</span>}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
