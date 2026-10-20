"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { closeConversation, openConversation, sendMessageHttp } from "./api";
import { useSupportSocket, type SocketStatus } from "./socket";
import {
  mergeMessage,
  toChatMessage,
  type ApiChatMessage,
  type ChatMessage,
  type ConversationStatus,
  type ConversationSummary,
} from "./types";

/**
 * Uma conversa aberta: histórico por HTTP, novidades por socket, envio pelo
 * socket quando ele está de pé e por HTTP quando não está.
 *
 * O HTTP não é só reserva: numa rede que bloqueia websocket (alguns proxies
 * corporativos), é o que mantém a pessoa conseguindo pedir ajuda.
 */
export function useConversation(
  conversationId: string | null,
  options: { initialMessages?: ChatMessage[]; loadHistory?: boolean; initialStatus?: ConversationStatus } = {},
) {
  const { socket, status } = useSupportSocket(Boolean(conversationId));
  const [messages, setMessages] = useState<ChatMessage[]>(options.initialMessages ?? []);
  // Aberta/encerrada (2026-10-20): os dois lados podem encerrar, e quem está com
  // a conversa na tela precisa ver quando o OUTRO lado encerrou ou reabriu.
  const [conversationStatus, setConversationStatus] = useState<ConversationStatus>(
    options.initialStatus ?? "ABERTA",
  );
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
      .then(({ conversation, messages: history }) => {
        if (cancelled) return;
        setConversationStatus(conversation.status);
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

    // O resumo chega na sala da PESSOA a cada mudança — inclusive o "Encerrar"
    // e o "Reabrir" do painel.
    const onSummary = (summary: ConversationSummary) => {
      if (summary.id === idRef.current) setConversationStatus(summary.status);
    };

    if (socket.connected) join();
    socket.on("connect", join);
    socket.on("mensagem", onMessage);
    socket.on("conversa", onSummary);
    return () => {
      socket.off("connect", join);
      socket.off("mensagem", onMessage);
      socket.off("conversa", onSummary);
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
          // Escrever numa conversa encerrada a reabre (regra do back).
          setConversationStatus("ABERTA");
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
        setConversationStatus("ABERTA");
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

  /** Encerra pelo lado do cliente. `false` se não deu (o erro fica em `error`). */
  const close = useCallback(async (): Promise<boolean> => {
    const id = idRef.current;
    if (!id) return false;
    try {
      const result = await closeConversation(id);
      setConversationStatus(result.conversation.status);
      // A linha também chega pelo socket; `mergeMessage` não duplica.
      if (result.message) setMessages((current) => mergeMessage(current, result.message!));
      setError(null);
      return true;
    } catch {
      setError("Não foi possível encerrar a conversa. Tente de novo.");
      return false;
    }
  }, []);

  return {
    messages,
    loading,
    error,
    status: status as SocketStatus,
    send,
    append,
    close,
    closed: conversationStatus === "FECHADA",
  };
}

function byDate(a: ChatMessage, b: ChatMessage) {
  return a.createdAt.localeCompare(b.createdAt);
}
