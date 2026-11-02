"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { logout } from "./authService";

/**
 * Sair da conta — o MESMO caminho em todo lugar (menu do avatar, cartão da
 * conta, menu do celular).
 *
 * Até 2026-11-02 o "LOGOUT" do cartão da conta era um link para `/logout`,
 * página que nunca existiu (404, e a sessão continuava viva), e o menu do
 * celular não tinha "Sair" nenhum: no celular não havia como sair.
 *
 * Sair NÃO é navegação: o cookie de sessão é httpOnly e só o backend o apaga
 * (`POST /auth/logout`, que também revoga os tokens). Depois, `replace("/")` +
 * `refresh()` para os server components re-renderizarem já sem a sessão.
 */
export function useLogout(onStart?: () => void) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function signOut() {
    onStart?.();
    startTransition(async () => {
      await logout();
      router.replace("/");
      router.refresh();
    });
  }

  return { signOut, pending };
}
