import type { Metadata } from "next";
import { Pagination } from "@/components/ui/Pagination";
import { AdminSearchBox, FilterMenu } from "@/features/admin/AdminFilters";
import { ChatsBoard } from "@/features/admin/chats/ChatsBoard";
import { getStaffConversation, getStaffConversations } from "@/features/admin/chats/list";
import {
  CHAT_PARAM,
  QUEUES,
  STATUSES,
  buildChatsHref,
  parseChatsQuery,
} from "@/features/admin/chats/types";
import { ADMIN_SHELL } from "@/features/admin/layout";
import { getAttendants } from "@/features/admin/orders/list";
import { getSessionUserId } from "@/features/auth/session";

export const metadata: Metadata = {
  title: "Chats — Lets4Trade",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Atendimento — as conversas do popup de contato e da tela do pedido, e as
 * respostas que a equipe der pelo Discord (2026-09-15). NÃO está no Figma: foi
 * desenhada no idioma do painel (mesma moldura, filtros e paginação).
 *
 * Guarda: `app/admin/layout.tsx` (conveniência) e `RolesGuard` no backend (a
 * autorização de verdade). Filtro, busca, página e conversa aberta moram na URL.
 */
export default async function AdminChatsPage({ searchParams }: PageProps) {
  const query = parseChatsQuery(await searchParams);

  const [page, detail, attendants, staffId] = await Promise.all([
    getStaffConversations(query),
    getStaffConversation(query.conversation),
    getAttendants(),
    getSessionUserId(),
  ]);

  const pageCount = Math.max(1, Math.ceil(page.total / page.limit));
  const hrefFor = Object.fromEntries(
    page.items.map((item) => [item.id, buildChatsHref(query, { conversation: item.id })]),
  );

  const statusOptions = STATUSES.map((option) => ({
    href: buildChatsHref(query, { status: option.value, conversation: "" }),
    label: option.label,
    active: query.status === option.value,
  }));
  const queueOptions = QUEUES.map((option) => ({
    href: buildChatsHref(query, { queue: option.value, conversation: "" }),
    label: option.label,
    active: query.queue === option.value,
  }));
  const filterKey = `${query.status}-${query.queue}-${query.search}-${query.page}`;

  const hidden: Record<string, string> = {};
  if (query.status !== "ABERTA") hidden[CHAT_PARAM.status] = query.status;
  if (query.queue !== "todas") hidden[CHAT_PARAM.queue] = query.queue;

  return (
    <div className={`${ADMIN_SHELL} pb-[60px]`}>
      <header className="flex flex-wrap items-start justify-between gap-[25px]">
        <div>
          <h1 className="font-helvetica text-[25px] leading-none font-bold tracking-[0.25px] text-white">
            Chats
          </h1>
          <p className="mt-[14px] font-poppins text-[16px] text-brand-fg-muted">
            Conversas com clientes ({page.total})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-[20px]">
          <FilterMenu
            key={`situacao-${filterKey}`}
            width={230}
            label={statusOptions.find((o) => o.active)?.label ?? "Abertas"}
            active={query.status !== "ABERTA"}
            options={statusOptions}
          />
          <FilterMenu
            key={`fila-${filterKey}`}
            width={230}
            label={queueOptions.find((o) => o.active)?.label ?? "Todas as filas"}
            active={query.queue !== "todas"}
            options={queueOptions}
          />
          <AdminSearchBox
            action="/admin/chats"
            name={CHAT_PARAM.search}
            defaultValue={query.search}
            placeholder="Cliente, assunto, pedido"
            hidden={hidden}
          />
        </div>
      </header>

      <div className="mt-[40px]">
        <ChatsBoard
          items={page.items}
          detail={detail}
          attendants={attendants}
          hrefFor={hrefFor}
          currentStaffId={staffId}
        />
      </div>

      <Pagination
        current={page.page}
        pageCount={pageCount}
        href={(next) => buildChatsHref(query, { page: next, conversation: "" })}
        label="de conversas"
        className="mt-[30px]"
      />
    </div>
  );
}

