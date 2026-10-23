"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { buttonVariants } from "@/components/ui/Button";
import type { ExitOffer, ExitOfferConfig } from "./exitOffer";

/**
 * Aviso de cupom AO SAIR (2026-10-23, pedido do usuário: "quem vem de fora e
 * tentar sair do site, o site avisa esse cupom"). Só para quem está SEM CONTA.
 *
 * ── Quando é "sair" ────────────────────────────────────────────────────────
 *  - computador: o mouse sai da página pelo TOPO (indo para a aba, o X ou a
 *    barra de endereço) — o sinal clássico de "exit intent";
 *  - celular (não há mouse): um rolar RÁPIDO para cima depois de já ter
 *    descido a página — o gesto de quem volta ao topo para sair.
 * Nenhum dos dois prende a pessoa: não há `beforeunload` nem truque com o
 * botão Voltar. Avisar é aceitável; impedir de sair é armadilha (e o próprio
 * navegador bloqueia/penaliza isso).
 *
 * ── Quantas vezes ──────────────────────────────────────────────────────────
 * Só depois de alguns segundos no site (não no susto da chegada), uma vez por
 * visita, e de novo só depois de N dias (configurável). Trocar o cupom no
 * painel conta como aviso novo. O registro mora no `localStorage` deste
 * navegador — é conveniência, não regra: sem ele, o aviso só aparece de novo.
 */

const SEEN_KEY = "l4t:cupom-saida";
/** Onde não faz sentido: painel, compra em andamento, prévia, login/cadastro. */
const HIDDEN_PREFIXES = ["/admin", "/checkout", "/pagamento", "/previa", "/login", "/criar-conta"];
const ARM_DESKTOP_MS = 5_000;
const ARM_MOBILE_MS = 15_000;
/** Rolar para cima mais rápido que isto (px/ms), depois de descer 400px. */
const FLICK_SPEED = 1.2;

const hasSession = () => /(?:^|;\s*)pt_authed_client=/.test(document.cookie);

function seenRecently(code: string, days: number): boolean {
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    if (!raw) return false;
    const seen = JSON.parse(raw) as { code?: string; at?: number };
    if (seen.code !== code || typeof seen.at !== "number") return false;
    return days === 0 ? false : Date.now() - seen.at < days * 86_400_000;
  } catch {
    return false;
  }
}

function markSeen(code: string) {
  try {
    window.localStorage.setItem(SEEN_KEY, JSON.stringify({ code, at: Date.now() }));
  } catch {
    // Sem localStorage (aba anônima restrita): só não lembra.
  }
}

export function ExitIntentCoupon({ offer, config }: { offer: ExitOffer; config: ExitOfferConfig }) {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const shownThisVisit = useRef(false);
  const hidden = HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  useEffect(() => {
    if (hidden || shownThisVisit.current || hasSession() || seenRecently(offer.code, config.days)) return;

    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const armedAt = Date.now() + (coarse ? ARM_MOBILE_MS : ARM_DESKTOP_MS);
    const show = () => {
      if (shownThisVisit.current || Date.now() < armedAt || hasSession()) return;
      shownThisVisit.current = true;
      markSeen(offer.code);
      setOpen(true);
    };

    // Computador: o mouse deixou a janela pelo topo.
    const onMouseOut = (event: MouseEvent) => {
      if (!event.relatedTarget && event.clientY <= 0) show();
    };

    // Celular: rolar rápido para cima depois de ter descido.
    let lastY = window.scrollY;
    let lastT = performance.now();
    let deepest = lastY;
    const onScroll = () => {
      const y = window.scrollY;
      const t = performance.now();
      deepest = Math.max(deepest, y);
      const speed = (lastY - y) / Math.max(1, t - lastT);
      if (deepest > 400 && speed > FLICK_SPEED) show();
      lastY = y;
      lastT = t;
    };

    document.addEventListener("mouseout", onMouseOut);
    if (coarse) window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      document.removeEventListener("mouseout", onMouseOut);
      window.removeEventListener("scroll", onScroll);
    };
  }, [hidden, offer.code, config.days]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(offer.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // Sem permissão de área de transferência: o código continua à vista.
    }
  }

  if (hidden) return null;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-[60] w-[440px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[28px] border border-brand-orange/50 bg-brand-surface shadow-[0_24px_60px_rgba(0,0,0,.6)] outline-none">
          {config.imageUrl ? (
            <div className="relative h-[200px] w-full bg-black/40">
              <Image src={config.imageUrl} alt="" fill sizes="440px" className="object-cover" />
            </div>
          ) : null}

          <div className="px-[28px] pt-[26px] pb-[24px] text-center">
            <Dialog.Title className="px-[22px] font-poppins text-[22px] leading-[28px] font-bold text-white">
              {config.title}
            </Dialog.Title>
            <Dialog.Description className="mt-[8px] font-helvetica text-[15px] leading-[22px] text-brand-fg-muted">
              {config.text}
            </Dialog.Description>

            <p className="mt-[18px] bg-gradient-to-b from-brand-orange to-brand-orange-deep bg-clip-text font-poppins text-[34px] leading-[40px] font-extrabold text-transparent">
              {offer.discount}
            </p>

            <div className="mt-[12px] flex items-center gap-[10px] rounded-[16px] border border-dashed border-brand-orange/70 bg-black/30 p-[8px] pl-[18px]">
              <span className="min-w-0 flex-1 truncate text-left font-mono text-[20px] font-bold tracking-[0.12em] text-white select-all">
                {offer.code}
              </span>
              <button
                type="button"
                onClick={copy}
                className="h-[40px] shrink-0 rounded-full border border-white/15 px-[16px] font-poppins text-[13px] font-bold text-white transition-colors hover:bg-white/10"
              >
                {copied ? "COPIADO ✓" : "COPIAR"}
              </button>
            </div>
            {offer.conditions ? (
              <p className="mt-[8px] font-helvetica text-[12px] text-brand-fg-subtle">{offer.conditions}</p>
            ) : null}

            <Link
              href="/criar-conta"
              onClick={() => setOpen(false)}
              className={buttonVariants({ variant: "cta", fullWidth: true, className: "mt-[20px]" })}
            >
              {config.button}
            </Link>
            <p className="mt-[10px] font-helvetica text-[12px] text-brand-fg-subtle">
              Use o código no carrinho, na hora de pagar.
            </p>
            <Dialog.Close className="mt-[12px] font-poppins text-[13px] text-white/60 underline-offset-[3px] hover:text-white hover:underline">
              Agora não
            </Dialog.Close>
          </div>

          <Dialog.Close
            aria-label="Fechar"
            className="absolute top-[12px] right-[12px] flex size-[34px] items-center justify-center rounded-full bg-black/50 font-poppins text-[20px] leading-none text-white/80 hover:bg-black/70 hover:text-white"
          >
            ×
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
