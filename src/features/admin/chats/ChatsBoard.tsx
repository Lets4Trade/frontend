"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toastError, toastOk } from "@/components/ui/Toasts";
import { InlineSelect } from "@/features/admin/orders/InlineSelect";
import { attendantName, type Attendant } from "@/features/admin/orders/types";
import { useSupportSocket } from "@/features/support/socket";
import { listTime } from "@/features/support/types";
import { cn } from "@/lib/cn";
import { replyAsStaff, updateConversation } from "./api";
import type { StaffConversation, StaffConversationDetail, StaffMessage } from "./types";

const UNASSIGNED = "sem-atendente";

/**
 * Quadro de atendimento (`/admin/chats`) — fora do Figma, no idioma do painel.
 *
 * O SERVIDOR entrega a página filtrada e a conversa escolhida (tudo na URL, como
 * no resto do painel). Daqui em diante o socket da equipe mantém a tela viva:
 * uma conversa que recebe mensagem sobe para o topo e acende, e a conversa
 * aberta recebe as mensagens sem recarregar — inclusive as que a equipe
 * responder pelo Discord.
 *
 * Trocar de conversa é NAVEGAR (`?conversa=`): o endereço fica compartilhável
 * entre atendentes e o botão voltar funciona.
 */
export function ChatsBoard({
  items: initialItems,
  detail,
  attendants,
  hrefFor,
  currentStaffId,
}: {
  items: StaffConversation[];
  detail: StaffConversationDetail | null;
  attendants: Attendant[];
  /** Endereços já montados no servidor, por conversa. */
  hrefFor: Record<string, string>;
  currentStaffId: string | null;
}) {
  const [items, setItems] = useState<StaffConversation[]>(initialItems);
  const [conversation, setConversation] = useState(detail?.conversation ?? null);
  const [messages, setMessages] = useState<StaffMessage[]>(detail?.messages ?? []);
  const { socket, status } = useSupportSocket(true);

  // A página nova do servidor substitui o estado local. A lista e a conversa são
  // lidas EM PARALELO, então a linha da conversa aberta ainda chega "não lida"
  // — abrir é o que a marca como lida.
  useEffect(() => {
    const openedId = detail?.conversation.id;
    setItems(openedId ? initialItems.map((item) => (item.id === openedId ? { ...item, unread: false } : item)) : initialItems);
  }, [initialItems, detail]);
  useEffect(() => {
    setConversation(detail?.conversation ?? null);
    setMessages(detail?.messages ?? []);
  }, [detail]);

  const openId = conversation?.id ?? null;
  const openIdRef = useRef(openId);
  openIdRef.current = openId;

  useEffect(() => {
    if (!socket) return;

    const upsert = (summary: StaffConversation) => {
      setItems((current) => {
        const exists = current.some((item) => item.id === summary.id);
        // Conversa que não está nesta página/filtro só entra se for movimento
        // novo — sobe para o topo, que é onde a equipe olha.
        return exists || summary.status === "ABERTA"
          ? [summary, ...current.filter((item) => item.id !== summary.id)]
          : current;
      });
      if (summary.id === openIdRef.current) setConversation(summary);
    };

    const onMessage = ({ conversation: summary, message }: { conversation: StaffConversation; message: StaffMessage }) => {
      const isOpen = summary.id === openIdRef.current;
      upsert(isOpen ? { ...summary, unread: false } : summary);
      if (isOpen) {
        setMessages((current) => (current.some((m) => m.id === message.id) ? current : [...current, message]));
        if (message.author === "CLIENTE") socket.emit("lida", { conversationId: summary.id });
      }
    };

    socket.on("equipe:mensagem", onMessage);
    socket.on("equipe:conversa", upsert);
    return () => {
      socket.off("equipe:mensagem", onMessage);
      socket.off("equipe:conversa", upsert);
    };
  }, [socket]);

  return (
    <div className="grid min-h-[640px] grid-cols-1 overflow-hidden rounded-[30px] border border-brand-border bg-[image:var(--brand-surface-fill)] lg:h-[calc(100dvh-260px)] lg:grid-cols-[minmax(300px,420px)_1fr]">
      <aside className="flex min-h-0 flex-col border-b border-brand-hairline lg:border-r lg:border-b-0" aria-label="Conversas">
        <div className="scrollbar-orange min-h-0 flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-[30px] pt-[40px] font-poppins text-[15px] text-brand-fg-muted">
              Nenhuma conversa com esses filtros.
            </p>
          ) : (
            <ul>
              {items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={hrefFor[item.id] ?? `/admin/chats?conversa=${item.id}`}
                    scroll={false}
                    aria-current={item.id === openId ? "true" : undefined}
                    className={cn(
                      "flex gap-[12px] border-b border-brand-hairline px-[25px] py-[16px] transition-colors hover:bg-white/5",
                      item.id === openId && "bg-white/[0.07]",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn("mt-[7px] size-[9px] shrink-0 rounded-full", item.unread ? "bg-brand-orange" : "bg-transparent")}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-[10px]">
                        <span className={cn("truncate font-poppins text-[15px] text-white", item.unread ? "font-bold" : "font-medium")}>
                          {item.customer.name || item.customer.username || "Cliente"}
                        </span>
                        <span className="shrink-0 font-helvetica text-[12px] text-brand-fg-subtle">
                          {listTime(item.lastMessageAt)}
                        </span>
                      </span>
                      <span className="block truncate font-poppins text-[13px] text-white/80">{item.subject}</span>
                      <span className="mt-[2px] block truncate font-helvetica text-[13px] text-brand-placeholder">
                        {item.lastAuthor === "SUPORTE" ? "Você: " : ""}
                        {item.lastPreview || " "}
                      </span>
                      <span className="mt-[6px] flex flex-wrap gap-[6px]">
                        {item.orderReference ? <Tag>Pedido {item.orderReference}</Tag> : null}
                        {item.status === "FECHADA" ? <Tag muted>Encerrada</Tag> : null}
                        <Tag muted>{item.assignee?.name ?? "Sem atendente"}</Tag>
                        {item.unread ? <span className="sr-only">Mensagem nova do cliente</span> : null}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="border-t border-brand-hairline px-[25px] py-[10px] font-helvetica text-[12px] text-brand-fg-subtle" role="status">
          {status === "online" ? "Atualizando em tempo real" : status === "conectando" ? "Conectando…" : "Sem tempo real — recarregue para ver novidades"}
        </p>
      </aside>

      {conversation ? (
        <ConversationPane
          key={conversation.id}
          conversation={conversation}
          contact={detail?.contact ?? {}}
          messages={messages}
          attendants={attendants}
          currentStaffId={currentStaffId}
          onSent={(summary, message) => {
            setConversation(summary);
            setMessages((current) => (current.some((m) => m.id === message.id) ? current : [...current, message]));
          }}
          onUpdated={setConversation}
        />
      ) : (
        <div className="flex items-center justify-center p-[40px]">
          <p className="font-poppins text-[16px] text-brand-fg-muted">Escolha uma conversa na lista.</p>
        </div>
      )}
    </div>
  );
}

function ConversationPane({
  conversation,
  contact,
  messages,
  attendants,
  currentStaffId,
  onSent,
  onUpdated,
}: {
  conversation: StaffConversation;
  contact: StaffConversationDetail["contact"];
  messages: StaffMessage[];
  attendants: Attendant[];
  currentStaffId: string | null;
  onSent: (conversation: StaffConversation, message: StaffMessage) => void;
  onUpdated: (conversation: StaffConversation) => void;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages]);

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      const result = await replyAsStaff(conversation.id, text);
      onSent(result.conversation, result.message);
      setDraft("");
    } catch (error) {
      toastError(error instanceof Error ? error.message : "Resposta não enviada.");
    } finally {
      setBusy(false);
    }
  }

  async function patch(update: { status?: "ABERTA" | "FECHADA"; assigneeId?: string | null }, success: string) {
    setBusy(true);
    try {
      onUpdated(await updateConversation(conversation.id, update));
      toastOk(success);
      router.refresh();
    } catch (error) {
      toastError(error instanceof Error ? error.message : "Não foi possível alterar.");
    } finally {
      setBusy(false);
    }
  }

  const closed = conversation.status === "FECHADA";
  const assigneeOptions = [
    { value: UNASSIGNED, label: "Sem atendente" },
    ...attendants.map((attendant) => ({ value: attendant.id, label: attendantName(attendant) })),
  ];

  return (
    <section className="flex min-h-0 flex-col" aria-label={`Conversa: ${conversation.subject}`}>
      <header className="flex flex-wrap items-center justify-between gap-[16px] border-b border-brand-hairline px-[30px] py-[18px]">
        <div className="min-w-0">
          <h2 className="truncate font-helvetica text-[20px] font-bold text-white">{conversation.subject}</h2>
          <p className="mt-[4px] font-poppins text-[13px] text-brand-fg-muted">
            {conversation.customer.name}
            {conversation.customer.username ? ` (@${conversation.customer.username})` : ""}
            {contact.whatsapp ? ` · WhatsApp ${contact.whatsapp}` : ""}
            {contact.discordId ? ` · Discord ${contact.discordId}` : ""}
          </p>
          {conversation.orderReference ? (
            <Link
              href={`/admin/pedidos?busca=${encodeURIComponent(conversation.orderReference)}`}
              className="mt-[4px] inline-block font-poppins text-[13px] text-brand-orange hover:underline"
            >
              Ver pedido {conversation.orderReference}
            </Link>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-[12px]">
          {!conversation.assignee && currentStaffId ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => patch({ assigneeId: currentStaffId }, "Conversa assumida.")}
              className="h-[36px] rounded-full border border-brand-orange px-[16px] font-poppins text-[13px] font-semibold text-white hover:bg-brand-orange/10 disabled:opacity-60"
            >
              Assumir
            </button>
          ) : null}
          <InlineSelect
            ariaLabel="Atendente da conversa"
            value={conversation.assignee?.id ?? UNASSIGNED}
            options={assigneeOptions}
            disabled={busy}
            // A pílula não define cor própria (na tabela quem define é a coluna).
            className="h-[36px] min-w-[160px] border-white/20 bg-[image:var(--brand-surface-fill)] px-[16px] text-[13px] text-white"
            onValueChange={(value) =>
              patch({ assigneeId: value === UNASSIGNED ? null : value }, "Atendente atualizado.")
            }
          />
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              patch({ status: closed ? "ABERTA" : "FECHADA" }, closed ? "Conversa reaberta." : "Conversa encerrada.")
            }
            className="h-[36px] rounded-full border border-white/20 px-[16px] font-poppins text-[13px] font-semibold text-white hover:bg-white/5 disabled:opacity-60"
          >
            {closed ? "Reabrir" : "Encerrar"}
          </button>
        </div>
      </header>

      <div ref={listRef} className="scrollbar-orange min-h-0 flex-1 overflow-y-auto px-[30px] py-[20px]" aria-live="polite">
        {messages.map((message) => (
          <StaffBubble key={message.id} message={message} />
        ))}
      </div>

      <form onSubmit={handleSend} className="flex items-end gap-[12px] border-t border-brand-hairline px-[30px] py-[18px]">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.currentTarget.value)}
          onKeyDown={(event) => {
            // Enter envia; Shift+Enter quebra linha — o comportamento de todo chat.
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          maxLength={2000}
          rows={2}
          disabled={busy}
          aria-label="Responder como suporte"
          placeholder={closed ? "Responder reabre a conversa" : "Responder como suporte (Enter envia)"}
          className="min-h-[50px] flex-1 resize-none rounded-[16px] border border-brand-border bg-[image:var(--brand-surface-fill)] px-[20px] py-[12px] font-poppins text-[15px] text-white outline-none placeholder:text-white/50 focus-visible:border-brand-orange disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={busy || draft.trim() === ""}
          className="h-[50px] shrink-0 rounded-full bg-brand-orange px-[26px] font-poppins text-[15px] font-bold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          ENVIAR
        </button>
      </form>
    </section>
  );
}

function StaffBubble({ message }: { message: StaffMessage }) {
  const time = listTime(message.createdAt);

  if (message.author === "SISTEMA") {
    return <p className="my-[10px] text-center font-helvetica text-[13px] text-brand-fg-subtle">{message.body} · {time}</p>;
  }

  // No painel, a EQUIPE é "nós": fica à direita.
  const staff = message.author === "SUPORTE";
  return (
    <div className={cn("mb-[10px] flex", staff ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[75%] rounded-[12px] px-[14px] py-[10px]",
          staff ? "border border-brand-orange bg-[image:var(--brand-surface-fill)]" : "bg-[#1b1b1b]",
        )}
      >
        <p className="mb-[3px] font-poppins text-[12px] font-semibold text-brand-orange">
          {staff ? message.authorName || "Suporte" : "Cliente"}
          {message.source === "DISCORD" ? <span className="ml-[6px] font-normal text-white/50">via Discord</span> : null}
        </p>
        <p className="font-poppins text-[15px] leading-[22px] break-words whitespace-pre-wrap text-white">{message.body}</p>
        <p className="mt-[3px] text-right font-helvetica text-[11px] text-white/50">{time}</p>
      </div>
    </div>
  );
}

function Tag({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <span
      className={cn(
        "rounded-full border px-[8px] py-[1px] font-helvetica text-[11px]",
        muted ? "border-white/10 text-white/50" : "border-white/20 text-white/80",
      )}
    >
      {children}
    </span>
  );
}
