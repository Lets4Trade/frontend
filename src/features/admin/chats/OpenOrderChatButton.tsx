"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { openOrderChatAction } from "./orderChatActions";

/** Botão que abre a conversa de um pedido sem conversa (ver `openOrderChatAction`). */
export function OpenOrderChatButton({ reference }: { reference: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-center gap-[12px]">
      <Button
        variant="primary"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            // Sucesso redireciona para o chat; só o erro volta para cá.
            const result = await openOrderChatAction(reference);
            if (result && !result.ok) setError(result.message);
          })
        }
      >
        {pending ? "ABRINDO..." : "ABRIR CONVERSA DO PEDIDO"}
      </Button>
      {error ? (
        <p role="alert" className="font-helvetica text-[14px] text-red-9">
          {error}
        </p>
      ) : null}
    </div>
  );
}
