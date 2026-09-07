import { Pagination } from "@/components/ui/Pagination";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminSearchBox, FilterMenu } from "@/features/admin/AdminFilters";
import { UsersTable } from "@/features/admin/users/UsersTable";
import {
  PARAM,
  buildHref,
  getAdminUsers,
  parseUsersQuery,
  type UsersQuery,
} from "@/features/admin/users/list";
import { ROLE_OPTIONS } from "@/features/admin/users/types";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Painel de usuário | Lets4Trade",
  robots: { index: false, follow: false },
};

/**
 * Painel → Usuários (Figma 3831:117).
 *
 * Server component inteiro — não há nada para hidratar: os filtros são links e
 * um `<form method="get">`.
 *
 * Medidas do arquivo: título em y=120 e subtítulo em y=159 na margem de 80px, o
 * select (249×50) e a busca (219×50) na mesma faixa à direita terminando em
 * x=1870, e o card de 1820×837 em x=50, y=193.
 *
 * ⚠️ A tela mostra NOME e TELEFONE de todos os cadastrados. É a rota mais
 * sensível do painel; o que a protege está no backend (`AdminUsersController`),
 * não aqui — a guarda desta pasta é conveniência de navegação.
 * Sem `overflow-x-auto` e sem `w-max`: a página do painel NÃO pode ter
 * barra horizontal (regra da loja inteira). O conteúdo tem a largura do
 * arquivo como TETO e cede abaixo dela — quem encolhe é a moldura, não o
 * usuário que precisa rolar de lado para ler uma tabela.
 */
export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = parseUsersQuery(await searchParams);
  const page = await getAdminUsers(query);

  const currentRole = ROLE_OPTIONS.find((option) => option.value === query.role);

  return (
    <div className="mx-auto w-full max-w-[1920px] px-[50px] pt-[37px] pb-[110px]">
        {/* Cabeçalho da página: título à esquerda, filtros à direita, alinhados
            pelo centro do bloco de duas linhas — como no arquivo. */}
        {/* `flex-wrap`: abaixo de ~1200px o título e os filtros passam a
            ocupar duas linhas em vez de empurrar a página para fora. */}
        <div className="flex w-full max-w-[1820px] flex-wrap items-center justify-between gap-[25px] pl-[30px]">
          <div>
            <h1 className="font-helvetica text-[25px] leading-[24px] font-bold tracking-[0.25px] text-white">
              Painel de usuário
            </h1>
            <p className="mt-[15px] font-helvetica text-[16px] leading-[16px] tracking-[0.16px] text-brand-placeholder">
              Tenho o controle sobre os usuários
            </p>
          </div>

          <div className="flex items-center gap-[25px]">
            <FilterMenu
              // A `key` muda a cada filtro novo para o `<details>` remontar
              // fechado — a navegação do Next é suave e preservaria o `open`.
              key={`role-${query.role}-${query.search}-${query.page}`}
              width={249}
              label={currentRole?.label ?? "Cargo atual"}
              active={query.role !== ""}
              options={[
                {
                  href: buildHref(query, { role: "" }),
                  label: "Todos os cargos",
                  active: query.role === "",
                },
                ...ROLE_OPTIONS.map((option) => ({
                  href: buildHref(query, { role: option.value }),
                  label: option.label,
                  active: option.value === query.role,
                })),
              ]}
            />

            <AdminSearchBox
              action="/admin/usuarios"
              name={PARAM.search}
              defaultValue={query.search}
              placeholder="Pesquisar"
              hidden={{ [PARAM.role]: query.role }}
            />
          </div>
        </div>

        {/* Card de 1820×837. `min-h` e não altura fixa: a tabela cresce com a
            página de 25, e um card cortado esconderia a última linha. */}
        <section className="mt-[24px] min-h-[837px] w-full max-w-[1820px] rounded-[30px] border border-white/15 bg-brand-surface p-[50px]">
          <h2 className="font-helvetica text-[20px] leading-[20px] font-bold tracking-[0.2px] text-white">
            Usuários ({page.total})
          </h2>

          <div className="mt-[26px]">
            {page.items.length === 0 ? (
              <EmptyState query={query} />
            ) : (
              <>
                <UsersTable users={page.items} />
                <Pagination
                  current={page.page}
                  pageCount={page.pageCount}
                  href={(next) => buildHref(query, { page: next })}
                  label="dos usuários"
                />
              </>
            )}
          </div>
        </section>
    </div>
  );
}

/**
 * Vazio por FILTRO e vazio por PLATAFORMA dizem coisas diferentes. "Nenhum
 * usuário cadastrado" numa busca sem resultado faria o admin achar que a base
 * sumiu — e numa listagem de usuários esse susto é caro.
 */
function EmptyState({ query }: { query: UsersQuery }) {
  const filtering = query.role !== "" || query.search !== "";

  return (
    <div className="py-[60px] text-center">
      <p className="font-helvetica text-[18px] text-brand-fg-muted">
        {filtering
          ? "Nenhum usuário encontrado com esses filtros."
          : "Nenhum usuário cadastrado ainda."}
      </p>
      {filtering ? (
        <Link
          href="/admin/usuarios"
          className="mt-4 inline-block font-poppins text-[16px] font-bold tracking-[0.16px] text-brand-orange transition-opacity hover:opacity-80"
        >
          Limpar filtros
        </Link>
      ) : null}
    </div>
  );
}
