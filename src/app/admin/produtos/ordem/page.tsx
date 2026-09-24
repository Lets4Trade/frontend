import type { Metadata } from "next";
import Link from "next/link";
import { getAdminGames } from "@/features/admin/catalog";
import { ADMIN_SHELL } from "@/features/admin/layout";
import { PARAM, TYPE_TABS } from "@/features/admin/products/catalog";
import { ProductOrderBoard } from "@/features/admin/products/ProductOrderBoard";
import { getProductOrdering } from "@/features/admin/products/ordering";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Organizar produtos | Lets4Trade",
  robots: { index: false, follow: false },
};

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Painel → Produtos → Organizar ordem (2026-09-24, fora do Figma).
 *
 * A ordem é por ABA de um jogo (jogo + tipo): é o que a vitrine mostra junto, e
 * o filtro de servidor só recorta a mesma sequência. Jogo e aba moram na URL,
 * com os MESMOS nomes de parâmetro da listagem (`jogo`, `tipo`), então o botão
 * da listagem já chega aqui com a aba que estava aberta.
 *
 * Os dois são VALIDADOS contra o que existe (jogo cadastrado, aba que o jogo
 * tem) antes de qualquer leitura — é input de URL.
 */
export default async function ProductOrderPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const games = await getAdminGames();

  const game = games.find((item) => item.id === first(params[PARAM.game]));
  const tabs = TYPE_TABS.filter((tab) => game?.productTypes.includes(tab.value));
  const tab = tabs.find((item) => item.value === first(params[PARAM.type])) ?? (game ? tabs[0] : undefined);

  const ordering = game && tab ? await getProductOrdering(game.id, tab.value) : null;

  const href = (gameId: string, type?: string) => {
    const search = new URLSearchParams({ [PARAM.game]: gameId });
    if (type) search.set(PARAM.type, type);
    return `/admin/produtos/ordem?${search.toString()}`;
  };

  return (
    <div className={`${ADMIN_SHELL} pb-[120px]`}>
      <div className="flex flex-wrap items-center justify-between gap-[16px]">
        <div>
          <h1 className="font-poppins text-[26px] leading-[32px] font-semibold text-white">
            Organizar ordem dos produtos
          </h1>
          <p className="mt-[6px] font-helvetica text-[15px] text-brand-fg-muted">
            Escolha o jogo e a aba. A ordem vale para todos os servidores daquele jogo.
          </p>
        </div>
        <Link
          href={game ? `/admin/produtos?${PARAM.game}=${game.id}${tab ? `&${PARAM.type}=${tab.value}` : ""}` : "/admin/produtos"}
          className="font-poppins text-[14px] font-bold text-brand-orange transition-opacity hover:opacity-80"
        >
          ← Voltar para produtos
        </Link>
      </div>

      <nav aria-label="Jogo" className="mt-[28px] flex flex-wrap gap-[10px]">
        {games.map((item) => (
          <Pill key={item.id} href={href(item.id)} active={item.id === game?.id}>
            {item.name}
          </Pill>
        ))}
      </nav>

      {game ? (
        <nav aria-label="Aba" className="mt-[14px] flex flex-wrap gap-[10px]">
          {tabs.map((item) => (
            <Pill key={item.value} href={href(game.id, item.value)} active={item.value === tab?.value} small>
              {item.label}
            </Pill>
          ))}
        </nav>
      ) : null}

      <div className="mt-[32px]">
        {!game ? (
          <Empty>Escolha um jogo acima para organizar os produtos dele.</Empty>
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
                Esta aba tem mais de {ordering.items.length} produtos. Aparecem os {ordering.items.length}{" "}
                primeiros; os demais continuam depois, em ordem alfabética.
              </p>
            ) : null}
            {/* `key`: trocar de aba remonta o quadro com a lista nova, em vez de
                herdar o rascunho da aba anterior. */}
            <ProductOrderBoard
              key={`${game.id}|${tab.value}`}
              gameId={game.id}
              type={tab.value}
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
