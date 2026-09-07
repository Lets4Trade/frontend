import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountShell } from "@/features/account/AccountShell";
import { getAccountProfile } from "@/features/account/profile";
import { Pagination } from "@/components/ui/Pagination";
import { OrderCard } from "@/features/orders/OrderCard";
import { getMyOrders } from "@/features/orders/ordersService";

export const metadata: Metadata = {
  title: "Meus Pedidos | Lets4Trade",
  description: "Acompanhe seus pedidos na Lets4Trade.",
  // Painel do usuário: conteúdo por conta, nada a indexar.
  robots: { index: false, follow: false },
};

/**
 * Painel do usuário — aba "Meus Pedidos" (Figma nó 2073:1612).
 *
 * A moldura (header logado, card de perfil e painel da direita) vive em
 * `AccountShell`, compartilhada com a aba de edição.
 *
 * DADOS REAIS, lidos no servidor: perfil de `GET /me` e pedidos de
 * `GET /orders`, os dois com o cookie de sessão reencaminhado. Nada de `fetch`
 * no cliente — o token é `httpOnly` e o JS da página não o alcança.
 *
 * A rota é GUARDADA: sem sessão válida vai para o login. Isso deixou de ser
 * opcional quando a tela passou a mostrar dado de conta de verdade.
 */
export default async function MeusPedidosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [profileResult, ordersResult] = await Promise.all([
    getAccountProfile(),
    getMyOrders(parsePage(await searchParams)),
  ]);

  if (!profileResult.ok) redirect("/login?redirect=/conta/pedidos");

  return (
    <AccountShell profile={profileResult.profile} activeTab="pedidos" title="Meus Pedidos">
      {/* A caixa de 724px do arquivo agora empilha a lista e a paginação. A
          lista fica com `flex-1`, então enquanto houver UMA página só ela ocupa
          os 724px inteiros e a tela é idêntica ao desenho — a paginação não
          renderiza nada nesse caso. */}
      <div className="absolute top-[124px] left-[50px] flex h-[724px] w-[1039px] flex-col">
        {/* Lista rolável: três cartões de 239px com vão de 25 não cabem na
            altura disponível, então a barra do design aparece de verdade — não
            é decoração. `min-h-0` é o que permite um filho de flex encolher
            abaixo do conteúdo; sem ele a lista empurraria a paginação para fora
            da caixa em vez de rolar. */}
        <div className="scrollbar-orange flex min-h-0 flex-1 flex-col gap-[25px] overflow-y-auto">
          {ordersResult.ok && ordersResult.orders.length > 0 ? (
            ordersResult.orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))
          ) : (
            <EmptyState failed={!ordersResult.ok} />
          )}
        </div>

        {ordersResult.ok ? (
          <Pagination
            current={ordersResult.page}
            pageCount={ordersResult.pageCount}
            href={(next) => (next > 1 ? `/conta/pedidos?${PARAM_PAGE}=${next}` : "/conta/pedidos")}
            label="dos pedidos"
            className="mt-[25px] shrink-0"
          />
        ) : null}
      </div>
    </AccountShell>
  );
}

/**
 * O nome do parâmetro é PORTUGUÊS na URL e inglês no código, como nas listagens
 * do painel (os `list.ts` de `features/admin`): a URL é interface, o
 * identificador não. A página 1 não carrega parâmetro — endereço limpo é o canônico.
 */
const PARAM_PAGE = "pagina";

/**
 * Página vinda da URL, VALIDADA. Vale a regra de qualquer boundary mesmo com o
 * backend validando de novo: `?pagina=-3` ou `?pagina=abc` viraria `skip`
 * negativo ou `NaN` se seguisse adiante.
 */
function parsePage(params: Record<string, string | string[] | undefined>): number {
  const raw = params[PARAM_PAGE];
  const value = Number.parseInt(Array.isArray(raw) ? (raw[0] ?? "") : (raw ?? "1"), 10);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

/**
 * Lista vazia e lista que FALHOU dizem coisas diferentes, e misturar as duas é
 * o erro clássico aqui: "você ainda não tem pedidos" numa queda de backend faz
 * o cliente achar que perdeu a compra.
 */
function EmptyState({ failed }: { failed: boolean }) {
  return (
    <p className="mt-[60px] w-[1000px] text-center font-helvetica text-[16px] text-brand-fg-muted">
      {failed
        ? "Não conseguimos carregar seus pedidos agora. Tente novamente em instantes."
        : "Você ainda não tem pedidos por aqui."}
    </p>
  );
}
