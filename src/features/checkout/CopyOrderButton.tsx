"use client";

import { useEffect, useRef, useState } from "react";

type Status = "idle" | "copied" | "failed";

/**
 * "COPIAR PEDIDO" — logo abaixo do "FALE COM UM ESPECIALISTA" do checkout
 * (2026-11-22). Monta o texto NA HORA do clique (`getText`), para sair com o
 * que está na tela agora: quantidades, cupom, coins, forma de pagamento.
 *
 * Área de transferência pela API moderna; se o navegador recusar (página sem
 * foco, permissão), cai no `execCommand("copy")` de um `<textarea>` escondido.
 * Se nem isso der, avisa — nunca finge que copiou.
 */
export function CopyOrderButton({ getText, disabled }: { getText: () => string; disabled?: boolean }) {
  const [status, setStatus] = useState<Status>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  async function copy() {
    const ok = await writeClipboard(getText());
    setStatus(ok ? "copied" : "failed");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus("idle"), 3000);
  }

  return (
    <>
      <button
        type="button"
        onClick={copy}
        disabled={disabled}
        className="brand-ring mt-[15px] flex h-[50px] w-full items-center justify-center gap-[12px] rounded-full bg-[image:var(--brand-surface-fill)] font-poppins text-[16px] font-bold tracking-[0.16px] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {status === "copied" ? <CheckIcon /> : <CopyIcon />}
        {status === "copied" ? "PEDIDO COPIADO" : "COPIAR PEDIDO"}
      </button>
      <p
        aria-live="polite"
        className="mt-[10px] min-h-[16px] text-center font-helvetica text-[13px] leading-[16px] text-brand-placeholder"
      >
        {status === "copied"
          ? "Agora é só colar na conversa do WhatsApp."
          : status === "failed"
            ? "Não conseguimos copiar. Tente de novo."
            : "Copie e cole no WhatsApp: o atendente já recebe todo o pedido."}
      </p>
    </>
  );
}

async function writeClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Segue para o caminho antigo.
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

function CopyIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-[20px]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-[20px] text-[#4ade80]" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
