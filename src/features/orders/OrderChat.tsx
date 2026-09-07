"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { io, type Socket } from "socket.io-client";
import { toMessage, type ApiMessage, type OrderMessage } from "./messages";

/**
 * Chat do pedido (Figma 2569:1776) — painel de 555×696.
 *
 * TEMPO REAL POR SOCKET, sem polling. A resposta do suporte chega quando chega:
 * com polling, ou a pessoa espera o intervalo inteiro para ver o recado, ou o
 * intervalo encolhe e cada aba aberta vira uma consulta por segundo num
 * atendimento que passa a maior parte do tempo em silêncio.
 *
 * `transports: ["websocket"]` é deliberado. O socket.io abre em long-polling e
 * só depois promove; forçar o transporte tira o polling do caminho inteiro — que
 * era a decisão.
 *
 * O HISTÓRICO vem pronto do servidor (`initialMessages`) e o socket cuida do que
 * acontece dali em diante. Assim a conversa aparece já pintada, sem esperar a
 * conexão, e uma queda do socket não apaga o que já foi dito.
 *
 * Os dois botões do rodapé são ASSETS INTEIROS (2571:1806 e 2571:1814): o SVG
 * exportado já traz o círculo, o preenchimento e o glifo. Montar o círculo por
 * fora duplicaria a borda — é o mesmo caso do botão de carrinho do cabeçalho.
 */
export type { OrderMessage } from "./messages";

/** A origem do backend (o socket não vive sob `/api/v1`). */
const API_ORIGIN = (() => {
  const raw = process.env.NEXT_PUBLIC_API_URL ?? "";
  try {
    return new URL(raw).origin;
  } catch {
    return "";
  }
})();

type Status = "conectando" | "online" | "offline";

export function OrderChat({
  reference,
  initialMessages,
  userAvatar,
}: {
  reference: string;
  initialMessages: OrderMessage[];
  userAvatar?: string;
}) {
  const [messages, setMessages] = useState<OrderMessage[]>(initialMessages);
  const [status, setStatus] = useState<Status>(API_ORIGIN ? "conectando" : "offline");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (API_ORIGIN === "") return;

    const socket = io(`${API_ORIGIN}/ws/orders`, {
      // `withCredentials` é o que faz o navegador mandar o cookie httpOnly no
      // handshake. Sem ele não há como autenticar sem expor o token ao JS.
      withCredentials: true,
      transports: ["websocket"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      // Entrar na sala é um passo próprio: o servidor confere ali que o pedido
      // é desta pessoa antes de deixar ouvir qualquer coisa.
      socket.emit("entrar", { reference }, (ack: { ok?: boolean } | undefined) => {
        setStatus(ack?.ok ? "online" : "offline");
      });
    });

    socket.on("mensagem", (raw: ApiMessage) => {
      const message = toMessage(raw);
      // O servidor emite para a SALA, e quem mandou também está nela: sem esta
      // checagem a própria mensagem apareceria duas vezes.
      setMessages((current) =>
        current.some((item) => item.id === message.id) ? current : [...current, message],
      );
    });

    socket.on("disconnect", () => setStatus("offline"));
    socket.on("connect_error", (error) => {
      setStatus("offline");
      // Só em desenvolvimento: "sem conexão" na tela não diz POR QUE, e sem
      // isto a única forma de descobrir é abrir a aba de rede.
      if (process.env.NODE_ENV !== "production") {
        console.warn("[chat] socket não conectou:", error.message);
      }
    });

    return () => {
      // `off()` ANTES do `disconnect()`, e isso não é zelo — é o conserto de um
      // bug real. Em desenvolvimento o React monta o efeito duas vezes
      // (StrictMode): cria o socket A, limpa, cria o socket B. O `disconnect` do
      // A chega de forma assíncrona e caía DEPOIS do `connect` do B, jogando o
      // estado de volta para "offline" com a conexão viva. Sem os ouvintes, o
      // socket antigo morre calado.
      socket.off();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [reference]);

  // Toda mensagem nova rola a lista para o fim — numa conversa, o que importa é
  // sempre a última linha.
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages]);

  function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    const socket = socketRef.current;
    if (text === "" || sending || status !== "online" || !socket) return;

    setSending(true);
    socket.emit(
      "enviar",
      { reference, body: text },
      (ack: { ok?: boolean; message?: ApiMessage } | undefined) => {
        setSending(false);
        if (!ack?.ok) return;
        // Limpa só depois da confirmação do servidor: se falhar, o texto
        // continua no campo em vez de sumir sem ter sido enviado.
        setDraft("");
        if (ack.message) {
          const message = toMessage(ack.message);
          setMessages((current) =>
            current.some((item) => item.id === message.id) ? current : [...current, message],
          );
        }
      },
    );
  }

  const disabled = status !== "online" || sending;
  // O rótulo de data só aparece quando o dia MUDA — é como o arquivo mostra:
  // uma pílula acima do primeiro recado de cada dia.
  let lastDay = "";

  return (
    <section
      aria-label="Conversa sobre o pedido"
      className="flex h-[696px] w-[555px] flex-col rounded-[30px] border border-white/20 bg-[#070707] p-[25px]"
    >
      <div ref={listRef} className="scrollbar-orange min-h-0 flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <p className="pt-[60px] text-center font-poppins text-[16px] text-brand-fg-muted">
            Ainda não há mensagens neste pedido.
          </p>
        ) : (
          messages.map((message) => {
            const showDay = message.day !== lastDay;
            lastDay = message.day;
            return (
              <div key={message.id}>
                {showDay ? <DayPill label={message.day} /> : null}
                <Bubble message={message} userAvatar={userAvatar} />
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={handleSend} className="mt-[25px] shrink-0">
        <div className="flex items-center gap-[15px]">
          <input
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.currentTarget.value)}
            disabled={disabled}
            maxLength={2000}
            aria-label="Escrever mensagem"
            placeholder="Escrever mensagem"
            className="h-[50px] w-[375px] rounded-full border border-brand-border bg-[image:var(--brand-surface-fill)] px-[25px] font-poppins text-[16px] tracking-[0.16px] text-white outline-none placeholder:text-white/60 focus-visible:border-brand-orange disabled:cursor-not-allowed disabled:opacity-60"
          />
          <ComposerButton
            type="submit"
            label="Enviar mensagem"
            icon="/icons/order/send-button.svg"
            disabled={disabled || draft.trim() === ""}
          />
          {/* Anexo de imagem está no arquivo, mas não há onde guardar arquivo
              nem o que fazer com ele — fica desabilitado em vez de abrir um
              seletor que não leva a lugar nenhum. */}
          <ComposerButton
            type="button"
            label="Anexar imagem (em breve)"
            icon="/icons/order/gallery-button.svg"
            disabled
          />
        </div>

        <ConnectionNote status={status} />
      </form>
    </section>
  );
}

/**
 * Estado da conexão, logo abaixo do campo.
 *
 * Só aparece quando NÃO está online: com a conversa funcionando, dizer "online"
 * é ruído. Quando cai, o campo fica desabilitado — e um campo desabilitado sem
 * explicação parece defeito da tela, não falta de conexão.
 */
function ConnectionNote({ status }: { status: Status }) {
  if (status === "online") return null;

  return (
    <p
      role="status"
      className="mt-[12px] font-helvetica text-[13px] leading-[18px] text-brand-fg-subtle"
    >
      {status === "conectando"
        ? "Conectando à conversa…"
        : "Sem conexão com a conversa. As mensagens voltam sozinhas quando ela retornar."}
    </p>
  );
}

/** Pílula de data: 117×34, raio 12, contorno branco a 15%. */
function DayPill({ label }: { label: string }) {
  return (
    // `w-fit` junto do `mx-auto`: sem ele o `flex` num bloco estica para a
    // largura toda do painel, e a pílula de 117px do arquivo vira uma faixa.
    <p className="mx-auto mt-0 mb-[27px] flex h-[34px] w-fit min-w-[117px] items-center justify-center rounded-[12px] border border-white/15 px-[20px] font-poppins text-[13px] tracking-[0.13px] text-white">
      {label}
    </p>
  );
}

/**
 * Balão de 56px de altura, raio 12, com a sombra funda do arquivo.
 *
 * O do CLIENTE vai à direita, com contorno laranja sobre o vidro e o avatar
 * DEPOIS do texto; o do suporte vai à esquerda, cinza chapado (#1b1b1b) e com o
 * avatar antes. É o que dispensa qualquer legenda de "quem falou".
 */
function Bubble({
  message,
  userAvatar,
}: {
  message: OrderMessage;
  userAvatar?: string;
}) {
  const mine = message.from === "cliente";

  return (
    <div className={`mb-[15px] flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        title={message.at}
        className={`flex min-h-[56px] max-w-full items-center gap-[10px] rounded-[12px] px-[10px] py-[7px] shadow-[0px_17px_10.1px_0px_rgba(0,0,0,0.3)] ${
          mine
            ? "flex-row-reverse border border-brand-orange bg-[image:var(--brand-surface-fill)]"
            : "bg-[#1b1b1b]"
        }`}
      >
        <Image
          src={(mine ? userAvatar : undefined) || "/images/avatar-placeholder.png"}
          alt=""
          width={42}
          height={42}
          aria-hidden
          className="size-[42px] shrink-0 rounded-full object-cover"
        />
        <p className="font-poppins text-[16px] leading-[24px] break-words text-white">
          {message.body}
        </p>
      </div>
    </div>
  );
}

function ComposerButton({
  type,
  label,
  icon,
  disabled,
}: {
  type: "submit" | "button";
  label: string;
  icon: string;
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      aria-label={label}
      className="size-[50px] shrink-0 rounded-full transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Image src={icon} alt="" width={50} height={50} aria-hidden className="size-[50px]" />
    </button>
  );
}
