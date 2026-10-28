import type { Metadata } from "next";
import { USER_LINK_CLASS, adminUserHref } from "@/features/admin/users/href";
import { canAccess } from "@/features/admin/permissions";
import { getSessionRole } from "@/features/auth/session";
import Link from "next/link";
import { Pagination } from "@/components/ui/Pagination";
import { AdminSearchBox, FilterMenu } from "@/features/admin/AdminFilters";
import { requirePanelArea } from "@/features/admin/guard";
import { ADMIN_SHELL } from "@/features/admin/layout";
import { getSellRequests } from "@/features/admin/sellRequests/data";
import { SellRequestStatusSelect } from "@/features/admin/sellRequests/SellRequestStatusSelect";
import {
  SELL_PARAM,
  SELL_REQUEST_STATUSES,
  formatSentAt,
  parseStatus,
  platformLabel,
  productTypeLabel,
  serverLabel,
  type SellRequestStatus,
} from "@/features/admin/sellRequests/types";
import { formatPhone } from "@/lib/masks";

export const metadata: Metadata = {
  title: "Propostas de venda | Lets4Trade",
  robots: { index: false, follow: false },
};

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

type Query = { status: SellRequestStatus | null; search: string; page: number };

function hrefFor(query: Query, patch: Partial<Query>): string {
  const next = { ...query, ...patch };
  const params = new URLSearchParams();
  if (next.status) params.set(SELL_PARAM.status, next.status);
  if (next.search) params.set(SELL_PARAM.search, next.search);
  if (next.page > 1) params.set(SELL_PARAM.page, String(next.page));
  const text = params.toString();
  return `/admin/propostas${text ? `?${text}` : ""}`;
}

/**
 * WhatsApp → link `wa.me` montado só com DÍGITOS (regra da casa: campo vindo de
 * fora nunca vira link cru). Número brasileiro sem DDI (10–11 dígitos) ganha o
 * 55; inválido não vira link.
 */
function whatsAppHref(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) return `https://wa.me/55${digits}`;
  if (digits.length >= 12 && digits.length <= 15) return `https://wa.me/${digits}`;
  return null;
}

/**
 * Painel → Propostas de venda (2026-10-23, fora do Figma). O que chega pelo
 * formulário "Venda pra nós" — gente querendo VENDER para a loja. ADMIN e
 * ATENDENTE. Filtro, busca e página na URL; tudo filtrado no BANCO.
 *
 * Todo texto aqui veio de visitante anônimo: é renderizado como TEXTO (o React
 * escapa), nunca como HTML ou Markdown.
 */
export default async function AdminSellRequestsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePanelArea("orders");
  const canOpenUsers = canAccess(await getSessionRole(), "users");
  const params = await searchParams;
  const query: Query = {
    status: parseStatus(first(params[SELL_PARAM.status])),
    search: first(params[SELL_PARAM.search]).trim().slice(0, 80),
    page: Math.max(1, Number.parseInt(first(params[SELL_PARAM.page]), 10) || 1),
  };
  const result = await getSellRequests(query);

  const statusOptions = [
    { href: hrefFor(query, { status: null, page: 1 }), label: "Todas as situações", active: query.status === null },
    ...SELL_REQUEST_STATUSES.map((status) => ({
      href: hrefFor(query, { status: status.value, page: 1 }),
      label: status.label,
      active: query.status === status.value,
    })),
  ];
  const hidden: Record<string, string> = {};
  if (query.status) hidden[SELL_PARAM.status] = query.status;

  return (
    <div className={`${ADMIN_SHELL} pb-[120px]`}>
      <header className="flex flex-wrap items-end justify-between gap-[20px]">
        <div>
          <h1 className="font-helvetica text-[30px] leading-none font-bold tracking-[0.3px] text-white">
            Propostas de venda
          </h1>
          <p className="mt-[12px] font-poppins text-[15px] text-brand-fg-muted">
            {result
              ? `${result.total} ${result.total === 1 ? "proposta" : "propostas"}${
                  result.newCount > 0 ? ` · ${result.newCount} ${result.newCount === 1 ? "nova" : "novas"}` : ""
                }`
              : "-"}
          </p>
          <p className="mt-[6px] font-helvetica text-[13px] text-brand-fg-subtle">
            Quem preencheu o formulário &quot;Venda pra nós&quot; querendo vender para a loja.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-[15px]">
          <FilterMenu
            key={`${query.status}-${query.search}`}
            width={220}
            label={statusOptions.find((option) => option.active)?.label ?? "Todas as situações"}
            active={query.status !== null}
            options={statusOptions}
          />
          <AdminSearchBox
            action="/admin/propostas"
            name={SELL_PARAM.search}
            defaultValue={query.search}
            placeholder="Jogo, Discord, WhatsApp"
            hidden={hidden}
          />
        </div>
      </header>

      {result === null ? (
        <Empty message="Não conseguimos carregar as propostas agora. Tente recarregar a página." />
      ) : result.items.length === 0 ? (
        <Empty
          message={
            query.search || query.status
              ? "Nenhuma proposta com esses filtros."
              : "Nenhuma proposta ainda. Elas chegam pelo formulário \"Venda pra nós\" da loja."
          }
        />
      ) : (
        <>
          <ul className="mt-[40px] flex flex-col gap-[14px]">
            {result.items.map((item) => {
              const wa = whatsAppHref(item.whatsapp);
              return (
                <li
                  key={item.id}
                  className="rounded-[20px] border border-brand-border bg-[image:var(--brand-surface-fill)] px-[25px] py-[20px]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-[14px]">
                    <div className="min-w-0">
                      <p className="font-poppins text-[18px] font-bold text-white">{item.gameName}</p>
                      <p className="mt-[4px] font-helvetica text-[13px] text-brand-fg-muted">
                        {productTypeLabel(item.productType)} · {platformLabel(item.platform)} · {serverLabel(item.server)}
                      </p>
                    </div>
                    <div className="flex items-center gap-[14px]">
                      <span className="font-helvetica text-[13px] text-brand-fg-subtle">{formatSentAt(item.createdAt)}</span>
                      <SellRequestStatusSelect id={item.id} status={item.status} />
                    </div>
                  </div>

                  <p className="mt-[14px] font-poppins text-[14px] leading-[21px] break-words whitespace-pre-wrap text-white/90">
                    {item.description}
                  </p>

                  <div className="mt-[14px] flex flex-wrap items-center gap-x-[24px] gap-y-[8px] border-t border-white/[0.07] pt-[12px] font-helvetica text-[13px]">
                    {/* Discord OU WhatsApp (2026-10-28): só o que veio. */}
                    {item.discord ? (
                      <span className="text-brand-fg-muted">
                        Discord: <span className="font-bold text-white select-all">{item.discord}</span>
                      </span>
                    ) : null}
                    {item.whatsapp ? (
                      <span className="text-brand-fg-muted">
                        WhatsApp:{" "}
                        {wa ? (
                          <a
                            href={wa}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-white underline decoration-white/30 underline-offset-[3px] hover:text-brand-orange"
                          >
                            {formatPhone(item.whatsapp)}
                          </a>
                        ) : (
                          <span className="font-bold text-white">{item.whatsapp}</span>
                        )}
                      </span>
                    ) : null}
                    <span className="text-brand-fg-subtle">
                      {item.user ? (
                        <>
                          Conta:{" "}
                          {canOpenUsers ? (
                            <Link href={adminUserHref(item.user.id)} prefetch={false} className={`text-white ${USER_LINK_CLASS}`}>
                              {item.user.name}
                            </Link>
                          ) : (
                            item.user.name
                          )}
                        </>
                      ) : (
                        "Enviada sem conta"
                      )}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
          <Pagination
            current={result.page}
            pageCount={result.pageCount}
            href={(page) => hrefFor(query, { page })}
            label="das propostas"
            className="mt-[50px]"
          />
        </>
      )}
    </div>
  );
}

function Empty({ message }: { message: string }) {
  return (
    <p className="mt-[60px] rounded-[20px] border border-dashed border-white/15 px-[25px] py-[50px] text-center font-poppins text-[15px] text-brand-fg-subtle">
      {message}
    </p>
  );
}
