"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toastError, toastOk } from "@/components/ui/Toasts";
import { ACTION_FAILED_MESSAGE, runAction } from "@/lib/safeAction";
import { cn } from "@/lib/cn";
import { updateTabAction } from "./actions";
import type { GameTab } from "./types";

type Server = { id: string; label: string };

/**
 * Em quais SERVIDORES a aba aparece (2026-11-17). Cada servidor tem as suas
 * abas: com um servidor escolhido no alto da Central, aqui é UMA caixinha
 * ("Aparece em Temporada") — o pedido foi "o mais simples possível pro
 * admin". Em "Todos", os botões por servidor dão a visão geral.
 *
 * Grava a cada clique, como o "Ativa na loja". Lista vazia no banco = em
 * todos (servidor criado depois já ganha a aba).
 */
export function TabServersPicker({
  gameId,
  tab,
  servers,
  server = null,
}: {
  gameId: string;
  tab: Pick<GameTab, "id" | "label" | "serverIds">;
  servers: readonly Server[];
  /** Servidor escolhido no alto da Central; `null` = "Todos". */
  server?: Server | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  if (servers.length === 0) return null;

  // Id de servidor apagado não conta (o backend também o ignora).
  const selected = (tab.serverIds ?? []).filter((id) => servers.some((item) => item.id === id));
  const all = selected.length === 0;
  const showsOn = (id: string) => all || selected.includes(id);

  function save(next: string[], message: string) {
    startTransition(async () => {
      const result = await runAction(() => updateTabAction(gameId, tab.id, { serverIds: next }), {
        ok: false as const,
        reason: "error" as const,
        message: ACTION_FAILED_MESSAGE,
      });
      if (!result.ok) {
        toastError(result.message ?? ACTION_FAILED_MESSAGE);
        return;
      }
      toastOk(message);
      router.refresh();
    });
  }

  /** Liga/desliga a aba em UM servidor, mantendo os outros como estão. */
  function setOn(target: Server, on: boolean) {
    const current = all ? servers.map((item) => item.id) : selected;
    const next = on ? [...current, target.id] : current.filter((id) => id !== target.id);
    if (next.length === 0) {
      // Sem servidor nenhum a aba não apareceria em lugar algum — para isso
      // existe o "Ativa na loja".
      toastError(`${target.label} é o único servidor desta aba. Para tirá-la da loja, desmarque "Ativa na loja".`);
      return;
    }
    // Todos marcados = vazio ("todos"); o backend normaliza do mesmo jeito.
    save(
      next.length === servers.length ? [] : next,
      on ? `${tab.label} agora aparece em ${target.label}.` : `${tab.label} saiu de ${target.label}.`,
    );
  }

  if (server) {
    const on = showsOn(server.id);
    return (
      <div className="mt-[15px] border-t border-white/10 pt-[15px]">
        <label className="flex w-fit cursor-pointer items-center gap-[10px] font-poppins text-[14px] font-bold text-white">
          <input
            type="checkbox"
            checked={on}
            disabled={pending}
            onChange={(event) => setOn(server, event.target.checked)}
            className="size-[18px] accent-[var(--brand-orange)]"
          />
          Aparece em {server.label}
        </label>
        <p className="mt-[6px] pl-[28px] font-helvetica text-[12px] text-brand-fg-subtle">
          {on
            ? `Na loja, quem escolhe ${server.label} vê esta aba.`
            : `Esta aba não aparece em ${server.label}. Marque para incluir.`}
        </p>
      </div>
    );
  }

  const chip = (active: boolean) =>
    cn(
      "h-[32px] rounded-full border px-[14px] font-poppins text-[12px] font-bold transition-colors disabled:opacity-50",
      active ? "border-brand-orange bg-brand-orange/15 text-white" : "border-white/10 text-white/60 hover:border-white/30",
    );

  return (
    <div className="mt-[15px] border-t border-white/10 pt-[15px]">
      <p className="font-poppins text-[13px] font-bold text-white">Aparece nos servidores</p>
      <div
        role="group"
        aria-label={`Servidores onde ${tab.label} aparece`}
        className="mt-[8px] flex flex-wrap gap-[8px]"
        aria-busy={pending}
      >
        <button
          type="button"
          aria-pressed={all}
          disabled={pending || all}
          onClick={() => save([], `${tab.label} aparece em todos os servidores.`)}
          className={chip(all)}
        >
          Todos
        </button>
        {servers.map((item) => {
          const active = !all && selected.includes(item.id);
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={active}
              disabled={pending}
              onClick={() => {
                // De "Todos", clicar num servidor = só ele.
                const next = all
                  ? [item.id]
                  : active
                    ? selected.filter((id) => id !== item.id)
                    : [...selected, item.id];
                save(
                  next.length === servers.length ? [] : next,
                  next.length === 0
                    ? `${tab.label} volta a aparecer em todos os servidores.`
                    : next.includes(item.id)
                      ? `${tab.label} agora aparece em ${item.label}.`
                      : `${tab.label} saiu de ${item.label}.`,
                );
              }}
              className={chip(active)}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <p className="mt-[6px] font-helvetica text-[12px] text-brand-fg-subtle">
        {all
          ? "A aba aparece em todos os servidores. Escolha um servidor no alto para configurar as abas dele."
          : "Na loja, a aba só aparece nesses servidores. Produtos desta aba em outros servidores ficam fora da loja."}
      </p>
    </div>
  );
}
