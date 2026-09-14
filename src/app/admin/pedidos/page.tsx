import type { Metadata } from "next";
import { Pagination } from "@/components/ui/Pagination";
import { AdminSearchBox, FilterMenu } from "@/features/admin/AdminFilters";
import {
  PARAM,
  SORTS,
  UNASSIGNED,
  buildHref,
  getAdminOrders,
  getAttendants,
  parseOrdersQuery,
} from "@/features/admin/orders/list";
import { OrdersTable } from "@/features/admin/orders/OrdersTable";
import { ADMIN_SHELL } from "@/features/admin/layout";
import {
  ORDER_STATUSES,
  attendantName,
  statusStyle,
} from "@/features/admin/orders/types";

export const metadata: Metadata = {
  title: "Vendas e pedidos — Lets4Trade",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * "Vendas e pedidos" (Figma 2546:1136) — o painel de controle dos pedidos.
 *
 * A guarda de rota é do `app/admin/layout.tsx` (sem sessão vai para o login,
 * sessão sem ADMIN recebe 404) e quem autoriza de verdade é o `RolesGuard` do
 * backend, rota por rota.
 *
 * Server component: busca, filtro, ordenação e paginação rodam no SERVIDOR com
 * o estado na URL — a mesma decisão da vitrine e da tela de produtos. Só o
 * corpo da tabela é client, porque situação e entregador mudam na linha.
 *
 * O contador do título ("Pedidos (25)") é o TOTAL do filtro, não a contagem da
 * página: é o número que responde "quantos pedidos tenho para atender".
 */
export default async function AdminOrdersPage({ searchParams }: PageProps) {
  const query = parseOrdersQuery(await searchParams, ORDER_STATUSES);

  // As duas leituras em paralelo: a lista de atendentes não depende do filtro,
  // e em série ela somaria latência à tela toda vez.
  const [page, attendants] = await Promise.all([
    getAdminOrders(query),
    getAttendants(),
  ]);

  /**
   * Origem do backend, para o link do comprovante.
   *
   * Resolvida AQUI e passada para a tabela: o download é uma navegação para
   * outro serviço, e deixar isso explícito num lugar só evita que cada
   * componente monte a URL do seu jeito.
   */
  const apiOrigin = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(
    /\/api\/v\d+\/?$/,
    "",
  );

  /**
   * As opções dos três menus, no formato de LINKS que o `FilterMenu` usa —
   * filtrar é navegar, e é o que mantém a filtragem no servidor.
   */
  const statusOptions = [
    { value: "", label: "Todas as situações" },
    ...ORDER_STATUSES.map((value) => ({ value, label: statusStyle(value).label })),
  ].map((option) => ({
    href: buildHref(query, { status: option.value }),
    label: option.label,
    active: query.status === option.value,
  }));

  const attendantOptions = [
    { value: "", label: "Todos os atendentes" },
    { value: UNASSIGNED, label: "Sem atendente" },
    ...attendants.map((a) => ({ value: a.id, label: attendantName(a) })),
  ].map((option) => ({
    href: buildHref(query, { assignee: option.value }),
    label: option.label,
    active: query.assignee === option.value,
  }));

  const sortOptions = SORTS.map((option) => ({
    href: buildHref(query, { sort: option.value }),
    label: option.label,
    active: query.sort === option.value,
  }));

  /** O rótulo fechado de cada menu é a opção escolhida. */
  const statusLabel =
    statusOptions.find((o) => o.active)?.label ?? "Todas as situações";
  const attendantLabel =
    attendantOptions.find((o) => o.active)?.label ?? "Todos os atendentes";
  const sortLabel = sortOptions.find((o) => o.active)?.label ?? "Mais recente";

  // A `key` muda a cada filtro novo para o `<details>` remontar fechado — a
  // navegação do Next é suave e preservaria o `open` por cima do resultado.
  const filterKey = `${query.status}-${query.assignee}-${query.sort}-${query.search}-${query.page}`;

  return (
    <div className={`${ADMIN_SHELL} pb-[100px]`}>
      <header className="flex flex-wrap items-start justify-between gap-[25px]">
        <div>
          <h1 className="font-helvetica text-[25px] leading-none font-bold tracking-[0.25px] text-white">
            Vendas e pedidos
          </h1>
          <p className="mt-[14px] font-poppins text-[16px] text-brand-fg-muted">
            Painel de controle
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-[20px]">
          <FilterMenu
            key={`situacao-${filterKey}`}
            width={249}
            label={statusLabel}
            active={query.status !== ""}
            options={statusOptions}
          />
          <FilterMenu
            key={`atendente-${filterKey}`}
            width={249}
            label={attendantLabel}
            active={query.assignee !== ""}
            options={attendantOptions}
          />
          <FilterMenu
            key={`ordem-${filterKey}`}
            width={210}
            label={sortLabel}
            active={query.sort !== "recente"}
            options={sortOptions}
          />
          <AdminSearchBox
            action="/admin/pedidos"
            name={PARAM.search}
            defaultValue={query.search}
            placeholder="Pesquisar"
            hidden={hiddenFields(query)}
          />
        </div>
      </header>

      <section
        aria-labelledby="titulo-pedidos"
        className="mt-[50px] rounded-[30px] border border-brand-border bg-[image:var(--brand-surface-fill)] px-[40px] pt-[35px] pb-[40px]"
      >
        <h2
          id="titulo-pedidos"
          className="mb-[30px] font-helvetica text-[20px] leading-none font-bold tracking-[0.2px] text-white"
        >
          Pedidos ({page.total})
        </h2>

        <OrdersTable
          orders={page.items}
          attendants={attendants}
          apiOrigin={apiOrigin}
        />

        <Pagination
          current={page.page}
          pageCount={page.pageCount}
          href={(next) => buildHref(query, { page: next })}
          label="de pedidos"
          className="mt-[40px]"
        />
      </section>
    </div>
  );
}

/**
 * Os filtros atuais em campos escondidos, para a busca não os descartar.
 *
 * Um `<form method="get">` manda SÓ o que está dentro dele — sem isso, buscar
 * limparia a situação e o atendente escolhidos. Mesma armadilha já resolvida na
 * busca da vitrine.
 */
function hiddenFields(query: {
  status: string;
  assignee: string;
  sort: string;
}): Record<string, string> {
  const fields: Record<string, string> = {};
  if (query.status) fields[PARAM.status] = query.status;
  if (query.assignee) fields[PARAM.assignee] = query.assignee;
  if (query.sort && query.sort !== "recente") fields[PARAM.sort] = query.sort;
  return fields;
}
