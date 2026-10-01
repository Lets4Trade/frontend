"use client";

import { useState, useTransition } from "react";
import { reactivateProductAction } from "@/features/admin/products/actions";
import { ACTION_FAILED_MESSAGE, runAction } from "@/lib/safeAction";

/**
 * "Reativar" de um produto desativado na Central do jogo.
 *
 * Sem confirmação, ao contrário da lixeira: reativar é o caminho de volta e é
 * desfeito com a própria lixeira. O `revalidatePath` da action tira a linha da
 * lista de desativados e a põe em "Produtos desta aba".
 */
export function ReactivateProductButton({ id, name }: { id: string; name: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function reactivate() {
    startTransition(async () => {
      const result = await runAction(() => reactivateProductAction(id), {
        ok: false,
        message: ACTION_FAILED_MESSAGE,
      });
      setError(result.ok ? null : result.message);
    });
  }

  return (
    <span className="flex flex-col items-end gap-[4px]">
      <button
        type="button"
        onClick={reactivate}
        disabled={pending}
        aria-label={`Reativar ${name}`}
        className="font-poppins text-[13px] font-bold text-brand-orange transition-opacity hover:opacity-80 disabled:opacity-50"
      >
        {pending ? "Reativando…" : "Reativar"}
      </button>
      {error ? (
        <span role="alert" className="font-poppins text-[12px] text-red-9">
          {error}
        </span>
      ) : null}
    </span>
  );
}
