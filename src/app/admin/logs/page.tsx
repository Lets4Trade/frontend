import { Pagination } from "@/components/ui/Pagination";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminSearchBox, FilterMenu } from "@/features/admin/AdminFilters";
import { LogsTable } from "@/features/admin/logs/LogsTable";
import {
  PARAM,
  buildHref,
  getAuditLogs,
  parseLogsQuery,
  type LogsQuery,
} from "@/features/admin/logs/list";
import { CATEGORY_OPTIONS } from "@/features/admin/logs/types";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Logs | Lets4Trade",
  robots: { index: false, follow: false },
};

/**
 * Painel → Logs — a trilha de auditoria.
 *
 * ⚠️ NÃO ESTÁ NO FIGMA. A tela foi pedida depois e segue o estilo do "Painel de
 * usuário" (3831:117): mesmo cabeçalho de página, mesmos filtros à direita,
 * mesmo card, mesma tabela.
 *
 * ── O que entra aqui ────────────────────────────────────────────────────────
 *   Alteração      · toda mutação do painel, gravada automaticamente pelo
 *                    `AuditInterceptor` — rota administrativa nova nasce
 *                    auditada, sem depender de alguém lembrar.
 *   Tela do painel · quem abriu qual tela do admin, e quando. É a prova de
 *                    acesso a dado pessoal de terceiros.
 *   Navegação      · o passo do visitante pelas telas da loja.
 *   Autenticação   · login, logout, falha. AINDA NÃO INSTRUMENTADO.
 *
 * ── O que NÃO entra ─────────────────────────────────────────────────────────
 * Clique a clique. Uma linha por clique é volume que não cabe em Postgres (o
 * `CLAUDE.md` chama isso de anti-padrão), e o que se aprende com ele é
 * pergunta de produto — que é trabalho de ferramenta de analytics, não da
 * trilha que protege a operação. Ver open-questions.
 *
 * Não existe rota para APAGAR log: trilha que o próprio auditado limpa não é
 * trilha. O que remove linha antiga é a retenção por idade, no backend.
 */
export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = parseLogsQuery(await searchParams);
  const page = await getAuditLogs(query);

  const current = CATEGORY_OPTIONS.find((option) => option.value === query.category);

  return (
    <div className="mx-auto w-full max-w-[1920px] px-[50px] pt-[37px] pb-[110px]">
      <div className="flex w-full max-w-[1820px] flex-wrap items-center justify-between gap-[25px] pl-[30px]">
        <div>
          <h1 className="font-helvetica text-[25px] leading-[24px] font-bold tracking-[0.25px] text-white">
            Logs
          </h1>
          <p className="mt-[15px] font-helvetica text-[16px] leading-[16px] tracking-[0.16px] text-brand-placeholder">
            Tudo o que aconteceu na plataforma, do mais recente
          </p>
        </div>

        <div className="flex items-center gap-[25px]">
          <FilterMenu
            key={`cat-${query.category}-${query.search}-${query.page}`}
            width={249}
            label={current?.label ?? "Categoria"}
            active={query.category !== ""}
            options={[
              {
                href: buildHref(query, { category: "" }),
                label: "Todas as categorias",
                active: query.category === "",
              },
              ...CATEGORY_OPTIONS.map((option) => ({
                href: buildHref(query, { category: option.value }),
                label: option.label,
                active: option.value === query.category,
              })),
            ]}
          />

          <AdminSearchBox
            action="/admin/logs"
            name={PARAM.search}
            defaultValue={query.search}
            placeholder="Pesquisar"
            hidden={{ [PARAM.category]: query.category }}
          />
        </div>
      </div>

      <section className="mt-[24px] min-h-[837px] w-full max-w-[1820px] rounded-[30px] border border-white/15 bg-brand-surface p-[50px]">
        <h2 className="font-helvetica text-[20px] leading-[20px] font-bold tracking-[0.2px] text-white">
          Eventos ({page.total})
        </h2>

        {/* A retenção é diferente por categoria e essa informação muda como se
            lê a tela: não achar um evento de navegação de dois meses atrás é o
            comportamento esperado, não uma falha. */}
        <p className="mt-[8px] font-helvetica text-[13px] text-brand-fg-subtle">
          Navegação é guardada por 30 dias; telas do painel por 180; alterações e
          autenticação por 1 ano.
        </p>

        <div className="mt-[26px]">
          {page.items.length === 0 ? (
            <EmptyState query={query} />
          ) : (
            <>
              <LogsTable entries={page.items} />
              <Pagination
                current={page.page}
                pageCount={page.pageCount}
                href={(next) => buildHref(query, { page: next })}
                label="dos eventos"
              />
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function EmptyState({ query }: { query: LogsQuery }) {
  const filtering = query.category !== "" || query.search !== "";

  return (
    <div className="py-[60px] text-center">
      <p className="font-helvetica text-[18px] text-brand-fg-muted">
        {filtering
          ? "Nenhum evento encontrado com esses filtros."
          : "Nenhum evento registrado ainda."}
      </p>
      {filtering ? (
        <Link
          href="/admin/logs"
          className="mt-4 inline-block font-poppins text-[16px] font-bold tracking-[0.16px] text-brand-orange transition-opacity hover:opacity-80"
        >
          Limpar filtros
        </Link>
      ) : null}
    </div>
  );
}
