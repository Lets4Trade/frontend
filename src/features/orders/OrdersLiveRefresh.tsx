"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSupportSocket } from "@/features/support/socket";

/**
 * Recarrega a tela quando os pedidos do usuário mudam (2026-10-15) — pagamento
 * aprovado, situação trocada no painel, compra expirada.
 *
 * Usa o socket de atendimento que já fica aberto (o mesmo do chat e do
 * popup, compartilhado por aba): nenhuma conexão nova. O servidor manda só o
 * SINAL `pedidos`, sem dado; `router.refresh()` relê pela rota autenticada de
 * sempre, no servidor — o socket nunca vira um segundo caminho de leitura.
 *
 * Reconexão também relê: com o socket caído o aviso se perde, e a volta da
 * conexão é o único momento em que dá para saber que algo pode ter mudado.
 * Os avisos são agrupados (300 ms) para uma rajada — cinco itens trocados de
 * uma vez — virar uma leitura só.
 */
export function OrdersLiveRefresh() {
  const router = useRouter();
  const { socket } = useSupportSocket(true);

  useEffect(() => {
    if (!socket) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let connectedOnce = socket.connected;

    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 300);
    };
    const onConnect = () => {
      if (connectedOnce) refresh();
      connectedOnce = true;
    };

    socket.on("pedidos", refresh);
    socket.on("connect", onConnect);
    return () => {
      clearTimeout(timer);
      socket.off("pedidos", refresh);
      socket.off("connect", onConnect);
    };
  }, [socket, router]);

  return null;
}
