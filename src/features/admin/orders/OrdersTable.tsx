"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { toastError } from "@/components/ui/Toasts";
import { cn } from "@/lib/cn";
import { formatPhone } from "@/lib/masks";
import { backendAsset } from "@/lib/publicApi";
import { updateOrderAction } from "./actions";
import { InlineSelect } from "./InlineSelect";
import { OrderInfoDialog } from "./OrderInfoDialog";
import {
  ORDER_STATUSES,
  UNASSIGNED,
  attendantName,
  formatDateTime,
  orDash,
  statusStyle,
  type AdminOrder,
  type Attendant,
} from "./types";

/**
 * Larguras das colunas (Figma 2546:1136).
 *
 * O arquivo posiciona cada cabeçalho em x absoluto dentro da faixa de 1920:
 * 100, 255, 468, 667, 807, 966, 1100, 1260, 1411 e 1517. As larguras abaixo são
 * as DISTÂNCIAS entre esses x — que é o que uma tabela precisa saber.
 *
 * A ordem VISUAL não é a ordem em que os cabeçalhos aparecem no arquivo: lá
 * "Descrição" está declarado antes de "Ações" mas desenhado depois (x=1517
 * contra 1411). Quem manda é a coordenada.
 */
/**
 * ── Alinhamento ────────────────────────────────────────────────────────────
 * No arquivo, as colunas de TEXTO (ID, Telefone, Cliente, Jogo, Descrição) e o
 * seu cabeçalho partem do MESMO x — alinhadas à esquerda. Já as de CONTROLE
 * (Status, Entregador, Comprovante, Ações) ocupam a mesma faixa horizontal do
 * cabeçalho e ficam centradas nela: a pílula "Status" mede 100px contra 58 do
 * rótulo e sobra igualmente dos dois lados; o ícone de comprovante cai no meio
 * exato dos 119px de "Comprovante".
 *
 * Estavam todas à esquerda, o que empurrava pílula e ícone para o começo da
 * coluna e desalinhava a leitura vertical da tabela.
 *
 * ⚠️ Coluna centrada NÃO leva `pr-[10px]`. O `<th>` não tem esse recuo, então
 * uma célula que o tenha centraliza numa caixa 10px mais estreita e o conteúdo
 * fica 5px à esquerda do rótulo — pouco, constante, e visível nas cinco colunas
 * ao mesmo tempo. O recuo existe como calha entre colunas de TEXTO; numa coluna
 * de pílula, a largura fixa já separa.
 *
 * "Data/Hora" é o único caso em que sigo o OLHO e não a coordenada: no arquivo o
 * valor começa no mesmo x do cabeçalho, mas é 28px mais largo que ele, e o par
 * fica lendo torto entre duas colunas centradas. Centrado, a coluna lê como
 * unidade. É o único desvio desta tabela — se preferir a coordenada crua, é uma
 * linha.
 */
const COLUMNS = [
  { key: "reference", label: "ID", width: 155 },
  { key: "phone", label: "Telefone", width: 213 },
  { key: "customer", label: "Cliente", width: 199 },
  // 140, a distância do arquivo. Chegou a ser 160 emprestando 20px de
  // "Comprovante", porque um `<select>` nativo com "Em andamento" mais a seta
  // do sistema não cabia. Com a pílula do arquivo de volta (117px no rótulo
  // mais largo), o empréstimo deixou de ser necessário.
  { key: "status", label: "Status", width: 140, align: "center" },
  { key: "game", label: "Jogo", width: 159 },
  { key: "assignee", label: "Entregador", width: 134, align: "center" },
  { key: "receipt", label: "Comprovante", width: 160, align: "center" },
  { key: "createdAt", label: "Data/Hora", width: 151, align: "center" },
  { key: "actions", label: "Ações", width: 106, align: "center" },
  { key: "info", label: "Descrição", width: 276 },
  // SEM rótulo, e o arquivo também não tem um: o emblema do jogo fecha a linha
  // encostado na margem direita do card (x=1743 de 1820, com os mesmos 50px de
  // recuo do resto). É identidade visual, não um dado com nome.
  { key: "art", label: "", width: undefined },
] as const;

/** Soma das colunas com largura fixa. Abaixo disso, quem rola é a tabela. */
const MIN_WIDTH = 1417;

/**
 * Tabela de "Vendas e pedidos" (Figma 2546:1136).
 *
 * `<table>` de verdade, como a de usuários: são dados tabulares com cabeçalho, e
 * é o que faz um leitor de tela anunciar "Status: Aprovado" ao andar pelas
 * células. Uma grade de `<div>` visualmente idêntica não diz nada disso.
 *
 * ── Client component, e só por causa da edição ─────────────────────────────
 * Situação e atendente mudam NA LINHA, sem sair da tela — é o que "Painel de
 * controle" promete. A lista, os filtros e a paginação continuam no servidor,
 * com o estado na URL.
 *
 * A linha guarda um estado local do que foi alterado (`overrides`) para a
 * célula responder na hora, antes de o `revalidatePath` devolver a página. Sem
 * isso, trocar a situação parece não ter feito nada por um instante — e a
 * pessoa clica de novo.
 */
export function OrdersTable({
  orders,
  attendants,
  apiOrigin,
}: {
  orders: AdminOrder[];
  attendants: Attendant[];
  /**
   * Origem do BACKEND, para o link do comprovante.
   *
   * Vem do server component em vez de ser lida aqui: `NEXT_PUBLIC_API_URL`
   * existiria no navegador, mas passá-la de cima deixa explícito que o download
   * sai de outro serviço — e é um lugar só para mudar se o host mudar.
   */
  apiOrigin: string;
}) {
  const [overrides, setOverrides] = useState<Record<string, Partial<AdminOrder>>>({});
  const [detail, setDetail] = useState<AdminOrder | null>(null);
  const [pending, startTransition] = useTransition();

  function apply(order: AdminOrder): AdminOrder {
    return { ...order, ...overrides[order.id] };
  }

  function change(order: AdminOrder, patch: { status?: string; assigneeId?: string | null }) {
    startTransition(async () => {
      const result = await updateOrderAction(order.id, patch);

      if (result.ok) {
        setOverrides((current) => ({
          ...current,
          [order.id]: {
            status: result.order.status,
            assigneeId: result.order.assigneeId,
            assigneeName: result.order.assigneeName,
          },
        }));
        return;
      }

      toastError(
        result.message ??
          (result.reason === "forbidden"
            ? "Sua conta não tem permissão para alterar pedidos."
            : "Não conseguimos salvar a alteração. Tente de novo."),
      );
    });
  }

  return (
    <>
      {/* Abaixo de ~1420px as dez colunas não cabem, e aí quem rola é a TABELA
          dentro do card — nunca a página. Mesma regra da tabela de usuários. */}
      <div className="scrollbar-orange -mx-[10px] overflow-x-auto px-[10px]">
        <table
          className="w-full table-fixed border-collapse"
          style={{ minWidth: MIN_WIDTH }}
        >
          <caption className="sr-only">
            Pedidos de todos os clientes, com situação, jogo, entregador e data
          </caption>

          <colgroup>
            {COLUMNS.map((column) => (
              <col key={column.key} style={{ width: column.width }} />
            ))}
          </colgroup>

          <thead>
            <tr>
              {COLUMNS.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    "pb-[18px] font-helvetica text-[14px] leading-[17px] font-bold tracking-[0.14px] text-white",
                    "align" in column && column.align === "center"
                      ? "text-center"
                      : "text-left",
                  )}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td
                  colSpan={COLUMNS.length}
                  className="py-[60px] text-center font-poppins text-[15px] text-brand-fg-subtle"
                >
                  Nenhum pedido com esses filtros.
                </td>
              </tr>
            ) : (
              orders.map((raw) => {
                const order = apply(raw);
                const style = statusStyle(order.status);
                const art = backendAsset(order.gameImageUrl);

                return (
                  <tr key={order.id} className="border-t border-white/15">
                    <td className="py-[14px] pr-[10px] font-helvetica text-[16px] tracking-[0.16px] text-brand-placeholder">
                      {order.reference}
                    </td>

                    <td className="py-[14px] pr-[10px] font-helvetica text-[16px] tracking-[0.16px] text-brand-placeholder">
                      {orDash(order.customerPhone && formatPhone(order.customerPhone))}
                    </td>

                    <td className="truncate py-[14px] pr-[10px] font-helvetica text-[16px] tracking-[0.16px] text-brand-placeholder">
                      {order.customerName}
                    </td>

                    <td className="py-[14px] text-center">
                      {/*
                        A PÍLULA do arquivo, que também escolhe: 24px de altura,
                        raio total, borda branca a 5% e as cores da situação.

                        Era um `<select>` nativo, com o argumento de que quinze
                        menus flutuantes custariam mais do que a aparência
                        ganha — e o Windows desenhava a própria seta cinza
                        quadrada dentro da pílula colorida. O Radix só monta o
                        painel ao ABRIR, então o custo não existia. Ver
                        `InlineSelect`.
                      */}
                      <InlineSelect
                        value={order.status}
                        disabled={pending}
                        onValueChange={(value) => change(raw, { status: value })}
                        ariaLabel={`Situação do pedido ${order.reference}`}
                        className={style.className}
                        options={ORDER_STATUSES.map((value) => ({
                          value,
                          label: statusStyle(value).label,
                        }))}
                      />
                    </td>

                    <td className="truncate py-[14px] pr-[10px] font-helvetica text-[16px] tracking-[0.16px] text-brand-placeholder">
                      {orDash(order.gameName)}
                    </td>

                    <td className="py-[14px] text-center">
                      {/*
                        `UNASSIGNED` e não `""`: o Radix reserva a string vazia
                        para "nada escolhido" e recusa um `<Select.Item>` com
                        esse valor. "Sem atendente" é uma escolha de verdade —
                        é como se DESATRIBUI um pedido —, então precisa de um
                        valor próprio, traduído de volta para `null` no envio.
                      */}
                      <InlineSelect
                        value={order.assigneeId ?? UNASSIGNED}
                        disabled={pending}
                        onValueChange={(value) =>
                          change(raw, {
                            assigneeId: value === UNASSIGNED ? null : value,
                          })
                        }
                        ariaLabel={`Entregador do pedido ${order.reference}`}
                        display={
                          order.assigneeName || orDash(null)
                        }
                        className="bg-[image:var(--brand-surface-fill)] text-white/80"
                        options={[
                          { value: UNASSIGNED, label: "Sem atendente" },
                          ...attendants.map((attendant) => ({
                            value: attendant.id,
                            label: attendantName(attendant),
                          })),
                        ]}
                      />
                    </td>

                    <td className="py-[14px] text-center">
                      {/*
                        Link direto para o backend, e não `fetch` + blob: o
                        download é uma navegação, o navegador já sabe fazê-la, e
                        o cookie de sessão viaja junto por ser same-site.
                        `rel="noreferrer"` porque é outra origem.
                      */}
                      <a
                        href={`${apiOrigin}/api/v1/admin/orders/${encodeURIComponent(order.reference)}/receipt`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex transition-opacity hover:opacity-80"
                      >
                        {/*
                          SÓ O ÍCONE, como no arquivo: 24px, `Inbox Out`, já no
                          degradê laranja da marca dentro do próprio SVG. Havia um
                          "Baixar ↓" escrito aqui que o arquivo não desenha — e a
                          seta era um caractere de texto, não ícone nenhum.

                          O rótulo vai para leitor de tela: um link cujo conteúdo
                          visual é só uma imagem precisa dizer o que faz, e "24px
                          de ícone" não diz.
                        */}
                        <Image
                          src="/icons/admin/inbox-out.svg"
                          alt=""
                          width={24}
                          height={24}
                          aria-hidden
                          className="size-[24px]"
                        />
                        <span className="sr-only">
                          Baixar comprovante do pedido {order.reference}
                        </span>
                      </a>
                    </td>

                    <td className="py-[14px] font-helvetica text-[16px] tracking-[0.16px] text-brand-placeholder text-center whitespace-nowrap">
                      {formatDateTime(order.createdAt)}
                    </td>

                    <td className="py-[14px] text-center">
                      {/*
                        PÍLULA de 74×24 com BORDA LARANJA e o mesmo fundo do
                        entregador — as medidas do arquivo. O ícone vem ANTES do
                        texto, também como no arquivo; aqui vinha depois, e era um
                        emoji.

                        `order/chat.svg` é exatamente o nó que o arquivo usa
                        (`Outline / Messages, Conversation / Chat Round Dots`,
                        16px) — já estava em `public/`, vindo da tela de pedido do
                        cliente.

                        Leva ao ATENDIMENTO filtrado pelo pedido (2026-09-15).
                        Antes abria a tela do cliente, onde o admin escrevia como
                        se fosse o dono do pedido.
                      */}
                      <a
                        href={`/admin/chats?situacao=&busca=${encodeURIComponent(order.reference)}`}
                        className="inline-flex h-[24px] w-[74px] items-center justify-center gap-[6px] rounded-full border border-brand-orange bg-[image:var(--brand-surface-fill)] font-helvetica text-[14px] tracking-[0.14px] text-white transition-opacity hover:opacity-80"
                      >
                        <Image
                          src="/icons/order/chat.svg"
                          alt=""
                          width={16}
                          height={16}
                          aria-hidden
                          className="size-[16px]"
                        />
                        Chat
                        <span className="sr-only">do pedido {order.reference}</span>
                      </a>
                    </td>

                    <td className="py-[14px] pr-[10px]">
                      {/*
                        No arquivo este texto é CINZA (#d8d8d8), 16px, regular —
                        igual ao resto da linha. Estava laranja e negrito, o que
                        o fazia disputar atenção com o "Baixar" ao lado e com o
                        próprio status. O sublinhado no hover é o que diz que
                        clica, sem mudar a linha parada.
                      */}
                      <button
                        type="button"
                        onClick={() => setDetail(order)}
                        className="text-left font-helvetica text-[16px] tracking-[0.16px] whitespace-nowrap text-brand-placeholder transition-colors hover:text-white hover:underline"
                      >
                        Informações de compra
                      </button>
                    </td>

                    <td className="py-[14px]">
                      {/*
                        O emblema do jogo fechando a linha: 27×27, encostado na
                        margem direita. É a arte CONGELADA no pedido
                        (`Order.gameImageUrl`), não a do catálogo de hoje — ver
                        o model.

                        Pedido sem arte (os que nasceram antes da coluna, ou de
                        jogo já removido) simplesmente não desenha nada: um
                        quadrado vazio de 27px seria ruído numa tabela de quinze
                        linhas.
                      */}
                      {art ? (
                        // Caixa de 27px com a arte PREENCHENDO — a mesma
                        // estrutura do arquivo (moldura fixa + `object-cover`).
                        //
                        // `fill` e não `width`/`height`: com as duas medidas em
                        // atributo mais o `object-cover` recortando, o Next
                        // avisa que a proporção mudou (a arte dos jogos é
                        // larga, o quadro é quadrado) — e o aviso está certo, é
                        // recorte de propósito. Dentro de um pai posicionado o
                        // `fill` diz exatamente isso, sem aviso.
                        <span className="relative ml-auto block size-[27px] overflow-hidden rounded-[4px]">
                          <Image
                            src={art}
                            alt=""
                            fill
                            sizes="27px"
                            aria-hidden
                            className="object-cover"
                          />
                        </span>
                      ) : null}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {detail ? (
        <OrderInfoDialog order={detail} onClose={() => setDetail(null)} />
      ) : null}
    </>
  );
}
