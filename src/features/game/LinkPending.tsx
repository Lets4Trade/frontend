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
      // O pulso SÓ enquanto carrega (2026-11-23, bug: "tá piscando as coisas
      // na tela do jogo"). O `animate-pulse` anima a própria opacidade, então
      // ligado sempre ele vencia o `opacity-0` e todo filtro piscava parado.
      className={`pointer-events-none absolute inset-0 bg-white/15 ${
        pending ? "opacity-100 motion-safe:animate-pulse" : "opacity-0"
      } ${className}`}
    />
  );
}
