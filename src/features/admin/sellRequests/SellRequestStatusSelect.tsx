"use client";

import { useState, useTransition } from "react";
import { toastError } from "@/components/ui/Toasts";
import { InlineSelect } from "@/features/admin/orders/InlineSelect";
import { ACTION_FAILED_MESSAGE, runAction } from "@/lib/safeAction";
import { updateSellRequestAction } from "./actions";
import { SELL_REQUEST_STATUSES, statusMeta, type SellRequestStatus } from "./types";

/**
 * A pílula de situação da proposta, que também escolhe — o mesmo controle da
 * situação em "Vendas e pedidos". Muda na hora (otimista) e volta se falhar.
 */
export function SellRequestStatusSelect({ id, status }: { id: string; status: SellRequestStatus }) {
  const [current, setCurrent] = useState(status);
  const [pending, startTransition] = useTransition();

  return (
    <InlineSelect
      value={current}
      disabled={pending}
      ariaLabel="Situação da proposta"
      className={statusMeta(current).className}
      options={SELL_REQUEST_STATUSES.map((option) => ({ value: option.value, label: option.label }))}
      onValueChange={(value) => {
        const previous = current;
        setCurrent(value as SellRequestStatus);
        startTransition(async () => {
          const result = await runAction(() => updateSellRequestAction(id, value), {
            ok: false as const,
            message: ACTION_FAILED_MESSAGE,
          });
          if (!result.ok) {
            setCurrent(previous);
            toastError(result.message);
          }
        });
      }}
    />
  );
}
