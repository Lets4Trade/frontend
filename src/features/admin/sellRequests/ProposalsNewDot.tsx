"use client";

import { UnreadDot } from "@/features/admin/UnreadDot";
import { newSellRequestsCounter } from "./newCount";

const EVENTS = ["equipe:propostas"] as const;

/**
 * Ponto em "Propostas": formulário de "Venda pra nós" na situação NOVA
 * (2026-10-28). Some quando a equipe muda a situação de todas as novas.
 */
export function ProposalsNewDot() {
  return (
    <UnreadDot
      counter={newSellRequestsCounter}
      events={EVENTS}
      label={(count) => (count === 1 ? "1 proposta nova" : `${count} propostas novas`)}
    />
  );
}
