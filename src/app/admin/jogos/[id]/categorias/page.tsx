import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBuilderGame } from "@/features/admin/builder/list";
import { GameAdminNav } from "@/features/admin/games/GameAdminNav";
import { ScopedCategoriesEditor } from "@/features/admin/games/tabs/ScopedCategoriesEditor";
import { getGameTabs, getTabCategories } from "@/features/admin/games/tabs/list";
import { isProductTab } from "@/features/admin/games/tabs/types";
import { requireAdminPage } from "@/features/admin/guard";
import { ADMIN_SHELL } from "@/features/admin/layout";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Categorias do jogo | Lets4Trade",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Valor de `?servidor=` para o escopo "todos os servidores". */
const ALL_SERVERS = "todos";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Painel → Jogos → Categorias (contrato `game-tabs.md`, 2026-09-28).
 *
 * Categorias POR SERVIDOR + ABA: o escopo mora na URL (`?aba=&servidor=`), e os
 * dois valores são VALIDADOS contra o que o jogo tem antes de qualquer leitura
 * — é input de cliente. Aba de LINK não entra (não lista produto).
 *
 * As categorias GLOBAIS (sem servidor e sem aba — as que existiam antes das
 * abas) continuam no Builder, etapa 7; valem em todo escopo.
 */
export default async function GameCategoriesPage({ params, searchParams }: PageProps) {
  await requireAdminPage();
  const { id } = await params;
  const query = await searchParams;

  const [game, allTabs] = await Promise.all([getBuilderGame(id), getGameTabs(id)]);
  if (game === null) notFound();

  const tabs = (allTabs ?? []).filter(isProductTab);
  const servers = [...game.servers].sort((a, b) => a.position - b.position);

  const tab = tabs.find((item) => item.id === first(query.aba)) ?? tabs[0];
  const server = servers.find((item) => item.id === first(query.servidor)) ?? null;

  const categories = tab ? await getTabCategories(game.id, tab.id, server?.id ?? null) : null;

  const href = (tabId: string, serverId: string | null) => {
    const search = new URLSearchParams({ aba: tabId, servidor: serverId ?? ALL_SERVERS });
    return `/admin/jogos/${encodeURIComponent(game.id)}/categorias?${search.toString()}`;
  };

  return (
    <div className={`${ADMIN_SHELL} pb-[120px]`}>
      <GameAdminNav gameId={game.id} gameName={game.name} active="categorias" />
      <h1 className="mt-[30px] font-helvetica text-[30px] leading-none font-bold tracking-[0.3px] text-white">
        Categorias — {game.name}
      </h1>
      <p className="mt-[12px] max-w-[860px] font-poppins text-[14px] text-brand-fg-subtle">
        Escolha a aba e o servidor. As categorias de “Todos os servidores” aparecem em todos eles; as
        globais, que valem para todas as abas, ficam no{" "}
        <Link href={`/admin/builder/${encodeURIComponent(game.id)}`} className="font-bold text-brand-orange">
          Builder (etapa 7)
        </Link>
        .
      </p>

      {allTabs === null ? (
        <Empty>Não conseguimos carregar as abas deste jogo agora. Recarregue a página.</Empty>
      ) : !tab ? (
        <Empty>
          Este jogo não tem aba de catálogo ou serviço.{" "}
          <Link href={`/admin/jogos/${encodeURIComponent(game.id)}/abas`} className="font-bold text-brand-orange">
            Criar uma aba →
          </Link>
        </Empty>
      ) : (
        <>
          <nav aria-label="Aba" className="mt-[28px] flex flex-wrap gap-[10px]">
            {tabs.map((item) => (
              <Pill key={item.id} href={href(item.id, server?.id ?? null)} active={item.id === tab.id}>
                {item.label}
              </Pill>
            ))}
          </nav>
          <nav aria-label="Servidor" className="mt-[14px] flex flex-wrap gap-[10px]">
            <Pill href={href(tab.id, null)} active={server === null} small>
              Todos os servidores
            </Pill>
            {servers.map((item) => (
              <Pill key={item.id} href={href(tab.id, item.id)} active={item.id === server?.id} small>
                {item.label}
              </Pill>
            ))}
          </nav>

          <div className="mt-[32px]">
            {categories === null ? (
              <Empty>Não conseguimos carregar as categorias deste escopo. Recarregue a página.</Empty>
            ) : (
              <ScopedCategoriesEditor
                key={`${tab.id}|${server?.id ?? ALL_SERVERS}`}
                gameId={game.id}
                tabId={tab.id}
                serverId={server?.id ?? null}
                initial={categories}
              />
            )}
          </div>
        </>
      )}
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
