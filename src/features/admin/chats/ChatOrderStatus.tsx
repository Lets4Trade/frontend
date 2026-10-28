"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toastError } from "@/components/ui/Toasts";
import { updateOrderAction } from "@/features/admin/orders/actions";
import { InlineSelect } from "@/features/admin/orders/InlineSelect";
import {
  CUSTOM_PREFIX,
  statusOptions,
  statusValue,
  type AdminDeliveryStatus,
} from "@/features/admin/orders/types";
import { cn } from "@/lib/cn";
import { ACTION_FAILED_MESSAGE, runAction } from "@/lib/safeAction";
import type { ChatOrder } from "./types";

/**
 * Mudar a situação do pedido (a ESTEIRA) sem sair do chat (2026-10-28, pedido
 * do usuário). O mesmo select e a mesma ação da linha de "Vendas e pedidos" —
 * situação padrão ou status personalizado.
 *
 * Depois de salvar, `router.refresh()` relê o pedido no servidor: a trilha, a
 * pílula e a nota vêm montadas de lá (`getChatOrder`), e refazer essa conta no
 * navegador seria uma segunda versão da regra. O select fica desativado até a
 * leitura voltar (a transição cobre o refresh).
 */
export function ChatOrderStatus({
  order,
  statuses,
}: {
  order: ChatOrder;
  statuses: AdminDeliveryStatus[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { admin, pill, purchase } = order;

  function change(value: string) {
    const patch = value.startsWith(CUSTOM_PREFIX)
      ? { deliveryStatusId: value.slice(CUSTOM_PREFIX.length) }
      : { status: value };
    startTransition(async () => {
      const result = await runAction(() => updateOrderAction(admin.id, patch), {
        ok: false,
        reason: "error",
        message: ACTION_FAILED_MESSAGE,
      });
      if (result.ok) {
        router.refresh();
        return;
      }
      toastError(
        result.message ??
          (result.reason === "forbidden"
            ? "Sua conta não tem permissão para alterar pedidos."
            : "Não conseguimos salvar a alteração. Tente de novo."),
      );
    });
  }

  return (
    <InlineSelect
      value={statusValue(admin)}
      disabled={pending}
      onValueChange={change}
      ariaLabel={`Situação do pedido ${purchase.reference}`}
      // `mx-0`: na tabela a pílula se centraliza na célula; aqui ela é o fim da linha.
      className={cn(pill.className, "mx-0")}
      display={pending ? "Salvando…" : pill.label}
      options={statusOptions(admin, statuses)}
    />
  );
}
