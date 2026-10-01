import type { Metadata } from "next";
import Link from "next/link";
import { getBuilderGame } from "@/features/admin/builder/list";
import { getAdminGames } from "@/features/admin/catalog";
import { CENTRAL_PARAM, centralHref } from "@/features/admin/games/central";
import { getGameTabs } from "@/features/admin/games/tabs/list";
import { hasTabContent, isProductTab } from "@/features/admin/games/tabs/types";
import { requireAdminPage } from "@/features/admin/guard";
import { ADMIN_SHELL } from "@/features/admin/layout";
import { PARAM } from "@/features/admin/products/catalog";
import { getProductOrdering } from "@/features/admin/products/ordering";
import { ProductPriceTable } from "@/features/admin/products/ProductPriceTable";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Editar preços | Lets4Trade",
  robots: { index: false, follow: false },
};

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Painel → Editar preços (2026-10-01, fora do Figma): os preços de uma ABA de
 * um jogo numa tabela, para a atualização diária em lote.
 *
 * Mesmos parâmetros da Central (`jogo`, `aba`, `servidor`): o botão da Central
 * chega aqui com a aba e o servidor que estavam abertos. Tudo VALIDADO contra
 * o que existe antes de qualquer leitura — é input de URL. O servidor só
 * define o filtro inicial; a tabela carrega a aba inteira (todos os
 * servidores), para trocar de servidor sem perder o que já foi digitado.
 */
export default async function ProductPricesPage({ searchParams }: PageProps) {
  await requireAdminPage();
  const params = await searchParams;
  const games = await getAdminGames();
  const listed = games.find((item) => item.id === first(params[PARAM.game]));

  const [game, gameTabs] = listed
    ? await Promise.all([getBuilderGame(listed.id), getGameTabs(listed.id)])
    : [null, null];
  const tabs = (gameTabs ?? []).filter(isProductTab);
  const tab = tabs.find((item) => item.id === first(params[PARAM.tab])) ?? tabs[0];
  const servers = game ? [...game.servers].sort((a, b) => a.position - b.position) : [];
  const serverId = first(params[CENTRAL_PARAM.server]) ?? "";

  const ordering = game && tab ? await getProductOrdering(game.id, tab.id) : null;

  const href = (gameId: string, tabId?: string) => {
    const search = new URLSearchParams({ [PARAM.game]: gameId });
    if (tabId) search.set(PARAM.tab, tabId);
    if (serverId && gameId === game?.id) search.set(CENTRAL_PARAM.server, serverId);
    return `/admin/produtos/precos?${search.toString()}`;
  };

  return (
    <div className={`${ADMIN_SHELL} pb-[120px]`}>
      <div className="flex flex-wrap items-center justify-between gap-[16px]">
        <div>
          <h1 className="font-poppins text-[26px] leading-[32px] font-semibold text-white">Editar preços</h1>
          <p className="mt-[6px] font-helvetica text-[15px] text-brand-fg-muted">
            Escolha o jogo e a aba, digite os preços novos e salve tudo de uma vez.
          </p>
        </div>
        {game ? (
          <Link
            href={centralHref(game.id, { section: "abas", tabId: tab?.id ?? "", serverId })}
            className="font-poppins text-[14px] font-bold text-brand-orange transition-opacity hover:opacity-80"
          >
            ← Voltar para {game.name}
          </Link>
        ) : null}
      </div>

      <nav aria-label="Jogo" className="mt-[28px] flex flex-wrap gap-[10px]">
        {games.map((item) => (
          <Pill key={item.id} href={href(item.id)} active={item.id === game?.id}>
            {item.name}
          </Pill>
        ))}
      </nav>

      {game && tabs.length > 0 ? (
        <nav aria-label="Aba" className="mt-[14px] flex flex-wrap gap-[10px]">
          {tabs.map((item) => (
            <Pill key={item.id} href={href(game.id, item.id)} active={item.id === tab?.id} small>
              {item.label}
            </Pill>
          ))}
        </nav>
      ) : null}

      <div className="mt-[28px]">
        {!listed ? (
          <Empty>Escolha um jogo acima para editar os preços dele.</Empty>
        ) : !game || !gameTabs ? (
          <Empty>Não conseguimos carregar este jogo agora. Recarregue a página.</Empty>
        ) : !tab ? (
          <Empty>Este jogo ainda não tem abas de produto.</Empty>
        ) : !ordering?.ok ? (
          <Empty>Não conseguimos carregar os produtos agora. Recarregue a página.</Empty>
        ) : ordering.items.length === 0 ? (
          <Empty>Nenhum produto ativo nesta aba.</Empty>
        ) : (
          <>
            {ordering.truncated ? (
              <p className="mb-[16px] rounded-2xl border border-brand-orange/40 bg-brand-orange/10 px-4 py-3 font-helvetica text-[14px] text-white">
                Esta aba tem mais de {ordering.items.length} produtos; aparecem os {ordering.items.length} primeiros
                da ordem da loja. Os demais se editam pelo produto.
              </p>
            ) : null}
            {/* `key`: trocar de aba remonta a tabela, em vez de herdar o
                rascunho da aba anterior. */}
            <ProductPriceTable
              key={`${game.id}|${tab.id}`}
              gameId={game.id}
              quoted={hasTabContent(tab.layout)}
              servers={servers.map(({ id, label }) => ({ id, label }))}
              initialServerId={serverId}
              initial={ordering.items}
            />
          </>
        )}
      </div>
    </div>
  );
}

function Pill({
  href,
  active,
  small = false,
  children,
}: {
  href: string;
  active: boolean;
  small?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-full border font-poppins font-bold transition-colors",
        small ? "h-[36px] px-[16px] text-[12px] leading-[34px]" : "h-[42px] px-[20px] text-[14px] leading-[40px]",
        active
          ? "border-brand-orange bg-brand-orange/15 text-white"
          : "border-white/10 text-white/70 hover:border-white/30 hover:text-white",
      )}
    >
      {children}
    </Link>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-[60px] text-center font-helvetica text-[16px] text-brand-fg-muted">{children}</p>;
}
