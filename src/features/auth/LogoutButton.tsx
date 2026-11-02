"use client";

import type { ReactNode } from "react";
import { useLogout } from "./useLogout";

/**
 * Botão "sair" para telas que são server component (ex.: cartão da conta).
 * Recebe o visual de fora; o comportamento é o de `useLogout`.
 */
export function LogoutButton({
  className,
  children,
  pendingLabel = "Saindo…",
  onStart,
}: {
  className?: string;
  children: ReactNode;
  pendingLabel?: ReactNode;
  onStart?: () => void;
}) {
  const { signOut, pending } = useLogout(onStart);

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={pending}
      aria-busy={pending || undefined}
      className={className}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
