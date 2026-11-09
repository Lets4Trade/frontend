"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
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
 *    descido a página — o gesto de quem volta ao topo para sair;
 *  - botão Voltar (2026-11-05, pedido do usuário): modal direto, pelo histórico;
 *  - fechar a aba ou digitar outro endereço (idem): `beforeunload`.
 *
 * ── Limites do `beforeunload` (são do navegador, não escolha nossa) ────────
 * Nenhuma página consegue desenhar nada na frente do "Sair do site?": o quadro
 * é do navegador, com texto fixo. O que dá para fazer é abrir o modal LOGO
 * DEPOIS, se a pessoa escolher ficar — o timer só roda quando o quadro fecha;
 * se ela sair, a página morre antes. O navegador só mostra o quadro depois de
 * um clique/toque/tecla na página, e o Safari do iPhone não mostra.
 *
 * ── Botão Voltar ───────────────────────────────────────────────────────────
 * No primeiro gesto da pessoa, a entrada de chegada ganha uma marca e uma cópia
 * dela entra por cima: [site anterior, chegada*, cópia, ...]. Voltar até a
 * chegada* não sai do site e abre o modal; o Voltar seguinte sai. É UMA vez por
 * visita: se o modal já apareceu, o `popstate` segue o Voltar sozinho, para não
 * haver clique perdido. Só no gesto porque o Chrome pula, no botão Voltar, as
 * entradas criadas sem interação do usuário.
 *
 * RISCO ACEITO pelo usuário (avisado em 2026-11-05): isto é "back button
 * hijacking" para o Google, spam desde 15/06/2026 (rebaixamento ou ação manual),
 * e aqui é loja pública vinda de busca e Ads. Mesma técnica do
 * `useUnsavedLeaveGuard` do PodioTicket, que protege edição atrás de login e não
 * corre esse risco. Para desligar sem tirar o resto: `BACK_GUARD_ENABLED`.
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
/** Tempo em que um clique em link interno ou um F5 ainda explica a saída da página. */
const INTERNAL_NAV_WINDOW_MS = 1_500;
/** Interceptar o Voltar (ver o risco no topo do arquivo). */
const BACK_GUARD_ENABLED = true;
/** Marca, no `history.state`, a entrada de chegada. */
const BACK_GUARD_KEY = "l4tExitGuard";
/** Uma guarda por aba: um reload não empilha outra entrada. */
const BACK_GUARD_TAB_KEY = "l4t:cupom-saida-voltar";

const hasSession = () => /(?:^|;\s*)pt_authed_client=/.test(document.cookie);

/** Link que leva a outro site de verdade (mailto:, tel: e download não saem da página). */
function leavesSite(link: HTMLAnchorElement): boolean {
  return /^https?:$/.test(link.protocol) && link.origin !== window.location.origin && !link.hasAttribute("download");
}

/**
 * Devolve `false` enquanto a entrada ainda não for do Next, para tentar no
 * próximo gesto. O estado vai com `__NA` de propósito: com ele o `pushState`
 * do App Router passa direto, sem disparar navegação nem mexer na rolagem.
 */
function installBackGuard(): boolean {
  const state = window.history.state as Record<string, unknown> | null;
  if (!state?.__NA) return false;
  try {
    if (window.sessionStorage.getItem(BACK_GUARD_TAB_KEY)) return true;
    window.sessionStorage.setItem(BACK_GUARD_TAB_KEY, "1");
  } catch {
    // Sem sessionStorage: no pior caso, um reload empilha mais uma entrada.
  }
  window.history.replaceState({ ...state, [BACK_GUARD_KEY]: true }, "", window.location.href);
  window.history.pushState(state, "", window.location.href);
  return true;
}

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

  const reveal = useCallback(() => {
    shownThisVisit.current = true;
    markSeen(offer.code);
    setOpen(true);
  }, [offer.code]);

  // Fora do efeito abaixo: ele some em rota oculta e quando o aviso já foi visto,
  // e a entrada marcada continua no histórico; sem resposta, seria um Voltar morto.
  useEffect(() => {
    if (!BACK_GUARD_ENABLED) return;
    const onPopState = (event: PopStateEvent) => {
      if (!(event.state as Record<string, unknown> | null)?.[BACK_GUARD_KEY]) return;
      if (shownThisVisit.current || hasSession() || seenRecently(offer.code, config.days)) {
        window.history.back();
        return;
      }
      reveal();
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [offer.code, config.days, reveal]);

  useEffect(() => {
    if (hidden || shownThisVisit.current || hasSession() || seenRecently(offer.code, config.days)) return;

    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const armedAt = Date.now() + (coarse ? ARM_MOBILE_MS : ARM_DESKTOP_MS);
    const show = (immediately = false) => {
      if (shownThisVisit.current || hasSession()) return;
      if (!immediately && Date.now() < armedAt) return;
      reveal();
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

    // Navegação do próprio site que recarrega o documento não é "sair": sem isto,
    // um <a> interno, um formulário ou um F5 pediriam confirmação.
    let internalNavAt = 0;
    const markInternalNav = () => {
      internalNavAt = Date.now();
    };
    const onClick = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (link instanceof HTMLAnchorElement && !leavesSite(link)) markInternalNav();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const reload = event.key === "F5" || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "r");
      if (reload) markInternalNav();
    };

    // Saída de verdade: quadro do navegador e, se a pessoa ficar, o modal. Sem a
    // espera de `armedAt`, que existe para o mouse (sinal incerto): aqui ela já
    // pediu para sair, e o navegador exige um clique antes de mostrar o quadro.
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (shownThisVisit.current || hasSession()) return;
      if (Date.now() - internalNavAt < INTERNAL_NAV_WINDOW_MS) return;
      event.preventDefault();
      event.returnValue = ""; // navegadores que ainda não leem o preventDefault() aqui
      window.setTimeout(() => show(true), 0);
    };

    // `pointerup`, e não `pointerdown`: no toque, é ele que conta como interação.
    const onGesture = () => {
      if (!BACK_GUARD_ENABLED || !installBackGuard()) return;
      document.removeEventListener("pointerup", onGesture, true);
      document.removeEventListener("keydown", onGesture, true);
    };

    document.addEventListener("pointerup", onGesture, true);
    document.addEventListener("keydown", onGesture, true);
    document.addEventListener("mouseout", onMouseOut);
    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", markInternalNav, true);
    document.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("beforeunload", onBeforeUnload);
    if (coarse) window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      document.removeEventListener("pointerup", onGesture, true);
      document.removeEventListener("keydown", onGesture, true);
      document.removeEventListener("mouseout", onMouseOut);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", markInternalNav, true);
      document.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("scroll", onScroll);
    };
  }, [hidden, offer.code, config.days, reveal]);

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

            <p className="mt-[15px] bg-gradient-to-b from-brand-orange to-brand-orange-deep bg-clip-text font-poppins text-[34px] leading-[46px] font-extrabold text-transparent">
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
