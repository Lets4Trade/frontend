"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

/**
 * Registra que uma TELA foi aberta.
 *
 * ── O que ele registra, e o que não ─────────────────────────────────────────
 * NAVEGAÇÃO, não clique. Uma linha por tela aberta, não por interação. Clique a
 * clique seria uma linha por gesto: volume que não cabe no Postgres da
 * aplicação, e que o `CLAUDE.md` nomeia como anti-padrão. O passo pela tela é o
 * que responde "por onde a pessoa andou"; o resto é pergunta de produto, e
 * pergunta de produto é trabalho de ferramenta de analytics.
 *
 * ── Por que `fetch` direto, e não server action ─────────────────────────────
 * Server action é uma requisição ao servidor do Next que só termina depois do
 * round-trip; navegação não pode pagar isso. Aqui o evento sai direto para o
 * backend com `keepalive`, que é o que permite a requisição SOBREVIVER à
 * navegação que a disparou — sem ele, sair da página cancela o registro.
 *
 * `credentials: "include"` leva o cookie de sessão, então o backend sabe quem é
 * sem que o navegador precise dizer (e ele nunca acredita se disser).
 *
 * Falha é ENGOLIDA de propósito: o registro de auditoria não pode quebrar a
 * navegação de quem está comprando.
 */
export function PageViewTracker({ surface }: { surface: "admin" | "store" }) {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (API_URL === "") return;

    // O painel tem o SEU rastreador, no `app/admin/layout.tsx`. Este vive no
    // layout raiz, que também envolve o painel — sem esta linha, cada tela do
    // admin gravaria DOIS eventos, um de cada rastreador.
    if (surface === "store" && pathname.startsWith("/admin")) return;

    // O React monta duas vezes em desenvolvimento (StrictMode); sem esta
    // guarda, cada tela viraria dois eventos também por aí.
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;

    void fetch(`${API_URL}/audit/view`, {
      method: "POST",
      credentials: "include",
      keepalive: true,
      headers: { "content-type": "application/json", "x-pt-surface": "client" },
      body: JSON.stringify({
        path: pathname,
        title: document.title.slice(0, 120),
        surface,
      }),
    }).catch(() => undefined);
  }, [pathname, surface]);

  return null;
}
