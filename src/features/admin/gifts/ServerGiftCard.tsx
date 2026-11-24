"use client";

import { useState } from "react";
import { PlatformIcon } from "@/features/game/PlatformIcon";
import { formatCents } from "@/features/cart/store";
import { formatGift } from "@/features/gifts/cartGifts";
import { cn } from "@/lib/cn";
import { GiftEditor } from "./GiftEditor";
import type { AdminServerGift } from "./types";

/**
 * Um servidor na Central → Brinde (POR SERVIDOR desde 2026-11-23, pedido do
 * usuário: "só entrego brinde nos servidores principais").
 *
 * Servidor SEM regra fica fechado, numa linha ("Sem brinde" + "Configurar
 * brinde"): é o caso comum dos servidores que não entregam, e abrir o editor
 * inteiro de cada um encheria a tela. Com regra, o editor já vem aberto e o
 * cabeçalho diz se está ligado.
 */
export function ServerGiftCard({ gameId, server }: { gameId: string; server: AdminServerGift }) {
  const [open, setOpen] = useState(server.gift !== null);
  const gift = server.gift;
  const status = !gift ? "Sem brinde" : gift.isActive ? "Ligado" : "Desligado";

  return (
    <article
      aria-label={`Brinde de ${server.serverLabel}`}
      className={cn(
        "rounded-[16px] border p-[16px] sm:p-[20px]",
        gift?.isActive ? "border-[#22c55e]/35" : "border-white/10",
      )}
    >
      <header className="flex flex-wrap items-center gap-x-[12px] gap-y-[6px]">
        <h3 className="flex items-center gap-[8px] font-poppins text-[16px] font-bold text-white">
          {server.platform ? <PlatformIcon platform={server.platform} className="size-[18px] shrink-0" /> : null}
          {server.serverLabel}
        </h3>
        <span
          className={cn(
            "rounded-full px-[10px] py-[2px] font-poppins text-[11px] font-bold",
            gift?.isActive ? "bg-[#22c55e]/15 text-[#4ade80]" : "bg-white/10 text-white/60",
          )}
        >
          {status}
        </span>
        {server.isHidden ? (
          <span className="rounded-full bg-white/5 px-[10px] py-[2px] font-poppins text-[11px] text-white/50">
            Escondido da loja
          </span>
        ) : null}
        {gift && !open ? (
          <span className="font-helvetica text-[13px] text-white/70">
            {formatGift(gift.amount, gift.label)} a cada {formatCents(gift.everyCents)}
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="ml-auto inline-flex h-[34px] items-center rounded-full border border-brand-border px-[16px] font-poppins text-[13px] font-bold text-white/80 transition-colors hover:text-white"
        >
          {open ? "Fechar" : gift ? "Editar" : "Configurar brinde"}
        </button>
      </header>

      {open ? (
        <div className="mt-[18px]">
          <GiftEditor gameId={gameId} serverId={server.serverId} serverLabel={server.serverLabel} initial={gift} />
        </div>
      ) : null}
    </article>
  );
}
