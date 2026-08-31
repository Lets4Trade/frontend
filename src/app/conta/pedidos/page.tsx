import type { Metadata } from "next";
import { AccountShell } from "@/features/account/AccountShell";
import { MOCK_ORDERS } from "@/features/orders/mockOrders";
import { OrderCard } from "@/features/orders/OrderCard";

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
 * ⚠️ Perfil e pedidos são MOCK, e a rota não tem guarda: hoje qualquer visitante
 * abre /conta/pedidos. Ver .claude/context/open-questions.md.
 */
export default function MeusPedidosPage() {
  return (
    <AccountShell activeTab="pedidos" title="Meus Pedidos">
      {/* Lista rolável: três cartões de 239px com vão de 25 não cabem nos 724px
          disponíveis, então a barra do design aparece de verdade — não é
          decoração. */}
      <div className="scrollbar-orange absolute top-[124px] left-[50px] flex h-[724px] w-[1039px] flex-col gap-[25px] overflow-y-auto">
        {MOCK_ORDERS.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </div>
    </AccountShell>
  );
}
