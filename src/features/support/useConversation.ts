"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { openConversation, sendMessageHttp } from "./api";
import { useSupportSocket, type SocketStatus } from "./socket";
import { mergeMessage, toChatMessage, type ApiChatMessage, type ChatMessage } from "./types";

/**
 * Uma conversa aberta: histórico por HTTP, novidades por socket, envio pelo
 * socket quando ele está de pé e por HTTP quando não está.
 *
 * O HTTP não é só reserva: numa rede que bloqueia websocket (alguns proxies
 * corporativos), é o que mantém a pessoa conseguindo pedir ajuda.
 */
export function useConversation(
  conversationId: string | null,
  options: { initialMessages?: ChatMessage[]; loadHistory?: boolean } = {},
) {
  const { socket, status } = useSupportSocket(Boolean(conversationId));
  const [messages, setMessages] = useState<ChatMessage[]>(options.initialMessages ?? []);
  const [loading, setLoading] = useState(Boolean(conversationId) && options.loadHistory !== false);
  const [error, setError] = useState<string | null>(null);
  const idRef = useRef(conversationId);
  idRef.current = conversationId;

  // Histórico. Abrir também marca como lida (o backend faz isso na leitura).
  useEffect(() => {
    if (!conversationId || options.loadHistory === false) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    openConversation(conversationId)
      .then(({ messages: history }) => {
        if (cancelled) return;
        // Junta com o que o socket já tenha entregue enquanto o histórico vinha.
        setMessages((current) => history.reduce(mergeMessage, current.filter((m) => m.conversationId === conversationId)).sort(byDate));
      })
      .catch(() => {
        if (!cancelled) setError("Não foi possível carregar a conversa.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [conversationId, options.loadHistory]);

  // Sala da conversa: entra a cada (re)conexão — o servidor esquece as salas
  // quando o socket cai.
  useEffect(() => {
    if (!socket || !conversationId) return;

    const join = () => socket.emit("entrar", { conversationId });
    const onMessage = (raw: ApiChatMessage) => {
      if (raw.conversationId !== idRef.current) return;
      setMessages((current) => mergeMessage(current, toChatMessage(raw)));
      // A pessoa está com a conversa aberta: o que chegou já foi visto.
      if (raw.author !== "CLIENTE") socket.emit("lida", { conversationId });
    };

    if (socket.connected) join();
    socket.on("connect", join);
    socket.on("mensagem", onMessage);
    return () => {
      socket.off("connect", join);
      socket.off("mensagem", onMessage);
      if (socket.connected) socket.emit("sair", { conversationId });
    };
  }, [socket, conversationId]);

  const send = useCallback(
    async (body: string): Promise<boolean> => {
      const id = idRef.current;
      const text = body.trim();
      if (!id || !text) return false;

      if (socket?.connected) {
        const ack = await new Promise<{ ok?: boolean; message?: ApiChatMessage } | undefined>((resolve) => {
          // Sem resposta em 8s, cai para o HTTP em vez de deixar o botão preso.
          const timer = setTimeout(() => resolve(undefined), 8000);
          socket.emit("enviar", { conversationId: id, body: text }, (response: { ok?: boolean; message?: ApiChatMessage }) => {
            clearTimeout(timer);
            resolve(response);
          });
        });
        if (ack?.ok && ack.message) {
          setMessages((current) => mergeMessage(current, toChatMessage(ack.message!)));
          return true;
        }
        if (ack && !ack.ok) {
          setError("Mensagem não enviada. Tente de novo.");
          return false;
        }
      }

      try {
        const message = await sendMessageHttp(id, text);
        setMessages((current) => mergeMessage(current, message));
        setError(null);
        return true;
      } catch {
        setError("Mensagem não enviada. Tente de novo.");
        return false;
      }
    },
    [socket],
  );

  const append = useCallback((message: ChatMessage) => {
    setMessages((current) => mergeMessage(current, message));
  }, []);

  return { messages, loading, error, status: status as SocketStatus, send, append };
}

function byDate(a: ChatMessage, b: ChatMessage) {
  return a.createdAt.localeCompare(b.createdAt);
}
