"use client";

import { useLinkStatus } from "next/link";

/**
 * Resposta IMEDIATA ao clique num filtro da página de jogo (2026-11-22,
 * otimização: "tá meio lagado pra fazer as coisas"). Trocar aba, servidor,
 * categoria ou ordem é navegar, e a página é dinâmica (preço não pode vir de
 * cache): até o servidor responder, a tela ficava parada e o clique parecia
 * não ter pegado. Agora o próprio botão pulsa enquanto carrega.
 *
 * Tem que ser FILHO de um `<Link>` (é de lá que o `useLinkStatus` lê) e o
 * link precisa de `relative`. Sempre desenhado, só a opacidade muda — nada
 * pula de lugar (recomendação da doc do Next).
 */
export function LinkPending({ className = "rounded-[inherit]" }: { className?: string }) {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute inset-0 bg-white/15 transition-opacity duration-150 motion-safe:animate-pulse ${
        pending ? "opacity-100" : "opacity-0"
      } ${className}`}
    />
  );
}
