import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { OpenOrderChatButton } from "@/features/admin/chats/OpenOrderChatButton";
import { CHAT_PARAM } from "@/features/admin/chats/types";
import { requirePanelArea } from "@/features/admin/guard";
import { ADMIN_SHELL } from "@/features/admin/layout";
import { apiGet } from "@/lib/serverApi";

export const metadata: Metadata = {
  title: "Chat do pedido | Lets4Trade",
  robots: { index: false, follow: false },
};

/**
 * Número do pedido no painel → o chat dele, como ATENDENTE (2026-10-23).
 *
 * Só LÊ: achou a conversa, redireciona para `/admin/chats` com ela aberta (e
 * `situacao=` vazio, para aparecer na lista mesmo encerrada). Pedido sem
 * conversa (pagos antes de 2026-10-20) mostra o botão de abrir uma — criar fica
 * num POST, porque um link ou prefetch nunca pode criar conversa.
 */
export default async function OrderChatPage({ params }: { params: Promise<{ reference: string }> }) {
  await requirePanelArea("support");
  const { reference: raw } = await params;
  const reference = decodeURIComponent(raw);

  const result = /^[A-Z0-9-]{4,40}$/i.test(reference)
    ? await apiGet<{ reference?: string; conversationId?: string | null }>(
        `/admin/support/orders/${encodeURIComponent(reference)}/conversation`,
      )
    : null;

  if (result?.ok && result.data.conversationId) {
    redirect(
      `/admin/chats?${CHAT_PARAM.status}=&${CHAT_PARAM.conversation}=${encodeURIComponent(result.data.conversationId)}`,
    );
  }

  const found = result?.ok === true;
  const shown = (found && result.data.reference) || reference;

  return (
    <div className={`${ADMIN_SHELL} pb-[60px]`}>
      <section className="mx-auto mt-[60px] flex max-w-[560px] flex-col items-center gap-[18px] rounded-[30px] border border-brand-border bg-brand-surface px-[30px] py-[40px] text-center">
        <h1 className="font-helvetica text-[24px] font-bold text-white">Pedido {shown}</h1>
        {found ? (
          <>
            <p className="font-poppins text-[15px] leading-[22px] text-brand-fg-muted">
              Este pedido ainda não tem conversa — ele foi pago antes de o chat abrir sozinho na venda. Abra uma para
              falar com o cliente; ele vê a conversa na tela do pedido e no chat do site.
            </p>
            <OpenOrderChatButton reference={shown} />
          </>
        ) : (
          <p className="font-poppins text-[15px] leading-[22px] text-brand-fg-muted">
            Pedido não encontrado.
          </p>
        )}
        <Link href="/admin/pedidos" className="font-poppins text-[14px] font-semibold text-brand-orange hover:underline">
          Voltar aos pedidos
        </Link>
      </section>
    </div>
  );
}
