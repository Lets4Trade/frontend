"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/SelectField";
import { SupportError, createConversation, listRecentOrders } from "./api";
import type { ChatMessage, ConversationSummary } from "./types";

/** Sem pedido: o valor precisa ser não vazio para o Radix aceitar como opção. */
const NO_ORDER = "sem-pedido";

/**
 * "Nova conversa": assunto livre, pedido OPCIONAL e a primeira mensagem.
 *
 * A primeira mensagem é obrigatória por decisão do backend — conversa vazia é
 * linha morta na fila da equipe e canal vazio no Discord.
 */
export function NewConversationForm({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: (conversation: ConversationSummary, message: ChatMessage) => void;
}) {
  const [orders, setOrders] = useState<{ value: string; label: string }[]>([]);
  const [orderReference, setOrderReference] = useState(NO_ORDER);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void listRecentOrders().then((list) => {
      if (!cancelled) setOrders(list.map((order) => ({ value: order.reference, label: order.label })));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;
    const cleanSubject = subject.trim();
    const cleanBody = body.trim();
    if (!cleanSubject || !cleanBody) {
      setError("Escreva o assunto e a mensagem.");
      return;
    }

    setSending(true);
    setError(null);
    try {
      const { conversation, message } = await createConversation({
        subject: cleanSubject,
        body: cleanBody,
        orderReference: orderReference === NO_ORDER ? undefined : orderReference,
      });
      onCreated(conversation, message);
    } catch (cause) {
      setError(cause instanceof SupportError ? cause.message : "Não foi possível abrir a conversa.");
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="scrollbar-orange flex min-h-0 flex-1 flex-col gap-[14px] overflow-y-auto px-[16px] py-[14px]">
      <label className="flex flex-col gap-[6px]">
        <span className="font-poppins text-[13px] font-semibold text-white">Assunto</span>
        <input
          type="text"
          value={subject}
          onChange={(event) => setSubject(event.currentTarget.value)}
          maxLength={120}
          required
          autoFocus
          placeholder="Ex.: dúvida sobre entrega"
          className="h-[42px] rounded-full border border-brand-border bg-[image:var(--brand-surface-fill)] px-[18px] font-poppins text-[14px] text-white outline-none placeholder:text-white/50 focus-visible:border-brand-orange"
        />
      </label>

      {orders.length > 0 ? (
        <SelectField
          label="Sobre um pedido? (opcional)"
          options={[{ value: NO_ORDER, label: "Nenhum pedido" }, ...orders]}
          value={orderReference}
          onValueChange={setOrderReference}
        />
      ) : null}

      <label className="flex flex-col gap-[6px]">
        <span className="font-poppins text-[13px] font-semibold text-white">Mensagem</span>
        <textarea
          value={body}
          onChange={(event) => setBody(event.currentTarget.value)}
          maxLength={2000}
          required
          rows={5}
          placeholder="Conte como podemos ajudar"
          className="resize-none rounded-[16px] border border-brand-border bg-[image:var(--brand-surface-fill)] px-[18px] py-[12px] font-poppins text-[14px] text-white outline-none placeholder:text-white/50 focus-visible:border-brand-orange"
        />
      </label>

      {error ? (
        <p role="alert" className="font-helvetica text-[13px] text-red-9">
          {error}
        </p>
      ) : null}

      <div className="mt-auto flex gap-[10px]">
        <Button variant="outline" className="h-[42px] flex-1 text-[14px]" onClick={onCancel} disabled={sending}>
          VOLTAR
        </Button>
        <Button type="submit" variant="primary" className="h-[42px] flex-1 text-[14px]" disabled={sending}>
          {sending ? "ENVIANDO..." : "ENVIAR"}
        </Button>
      </div>
    </form>
  );
}
