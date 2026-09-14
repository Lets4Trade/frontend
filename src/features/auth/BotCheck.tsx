"use client";

import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { useCallback, useRef, useState } from "react";

/**
 * Verificação anti-robô (Cloudflare Turnstile) do login e do cadastro.
 *
 * ── Por que existe ─────────────────────────────────────────────────────────
 * Em produção o backend EXIGE o token (`TurnstileGuard`): sem ele, login e
 * cadastro respondiam erro. O formulário nunca mandava — a loja não teria como
 * criar conta nem entrar no primeiro deploy.
 *
 * ── Sem chave, sem widget ─────────────────────────────────────────────────
 * `NEXT_PUBLIC_TURNSTILE_SITE_KEY` ausente (dev local) = nada é desenhado e o
 * token não é exigido. É o espelho do backend, que em desenvolvimento sem
 * `CLOUDFLARE_TURNSTILE_SECRET_KEY` não confere. Em produção as DUAS chaves
 * precisam existir — site key aqui, secret key no backend.
 *
 * Para testar localmente com o widget de verdade, a Cloudflare publica chaves de
 * teste que sempre aprovam: site `1x00000000000000000000AA` e secret
 * `1x0000000000000000000000000000000AA`.
 *
 * ── Token é de uso único ──────────────────────────────────────────────────
 * A Cloudflare invalida o token na primeira verificação. Se o login falhar (senha
 * errada), o MESMO token já não serve para a segunda tentativa — por isso o
 * formulário chama `reset()` a cada erro, e o widget gera outro.
 */

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

export function useBotCheck() {
  const ref = useRef<TurnstileInstance | undefined>(undefined);
  const [token, setToken] = useState<string | null>(null);

  const reset = useCallback(() => {
    setToken(null);
    ref.current?.reset();
  }, []);

  const widget = SITE_KEY ? (
    <div className="mt-[25px] flex min-h-[65px] justify-center">
      <Turnstile
        ref={ref}
        siteKey={SITE_KEY}
        onSuccess={setToken}
        onExpire={() => setToken(null)}
        onError={() => setToken(null)}
        options={{ theme: "dark", language: "pt-br" }}
      />
    </div>
  ) : null;

  return {
    widget,
    /** O token a mandar ao backend — `undefined` quando a verificação não é exigida. */
    token: SITE_KEY ? (token ?? undefined) : undefined,
    /** A verificação está ativa e ainda não foi concluída. */
    pending: Boolean(SITE_KEY) && token === null,
    reset,
  };
}

export const BOT_CHECK_PENDING_MESSAGE =
  "Confirme a verificação de segurança antes de continuar.";
