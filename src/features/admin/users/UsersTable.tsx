import { cn } from "@/lib/cn";
import { UserEditDialog } from "./UserEditDialog";
import {
  formatDateTime,
  phoneOrDash,
  roleLabel,
  type AdminUser,
  type AdminUserStatus,
} from "./types";

/**
 * Larguras das colunas (Figma 3831:123 e irmãos).
 *
 * O arquivo posiciona cada célula em x absoluto dentro do card: 52, 265, 445,
 * 617, 837 e 990, numa faixa de 1720. As larguras abaixo são as DISTÂNCIAS
 * entre esses x — que é o que uma tabela precisa saber.
 *
 * A última coluna é a de AÇÕES, e não está no arquivo — ela ocupa o espaço
 * vazio que o desenho já deixava à direita.
 */
const COLUMNS = [
  { key: "phone", label: "Telefone", width: 213 },
  { key: "name", label: "Cliente", width: 180 },
  { key: "role", label: "Cargo Atual", width: 172 },
  { key: "status", label: "Status de Conta", width: 220 },
  { key: "orders", label: "Compras", width: 153 },
  { key: "createdAt", label: "Data de Criação", width: 200 },
  // Coluna de ações — NÃO está no arquivo do Figma. O lápis abre o modal de
  // edição, pedido depois. Fica no fim da linha, no espaço que o desenho já
  // deixava vazio.
  { key: "actions", label: "", width: undefined },
] as const;

/**
 * Tabela do "Painel de usuário" (Figma 3831:117).
 *
 * `<table>` de verdade, e não uma grade de `<div>`: são dados tabulares com
 * cabeçalho, e é o que faz um leitor de tela anunciar "Cargo Atual: Admin" ao
 * navegar pelas células. Uma grade visualmente idêntica não diz nada disso.
 *
 * `table-fixed` com larguras explícitas porque as colunas são medidas do
 * arquivo — sem isso o navegador as redistribuiria conforme o conteúdo, e um
 * nome longo empurraria as pílulas para fora do lugar.
 *
 * O lápis do fim da linha abre o modal de edição. Ele NÃO está no arquivo do
 * Figma: a tabela desenhada não tem ação nenhuma, e o botão foi pedido depois.
 * `w-full` e não os 1720 do arquivo: com `table-fixed`, as larguras em px
 * das colunas continuam valendo e a ÚLTIMA (sem largura) absorve o que
 * sobra. As colunas somam 1138, então a tabela cabe bem antes de qualquer
 * viewport realista — e a página nunca ganha barra horizontal.
 */
export function UsersTable({ users }: { users: AdminUser[] }) {
  return (
    /* Abaixo de ~1240px as seis colunas não cabem mais, e aí quem rola é a
       TABELA dentro do card — nunca a página. Barra horizontal na página é o
       que a loja inteira evita; barra numa tabela larga é o comportamento
       esperado, e mantém o cabeçalho do painel no lugar. */
    <div className="scrollbar-orange -mx-[10px] overflow-x-auto px-[10px]">
      <table className="w-full min-w-[1138px] table-fixed border-collapse">
        <caption className="sr-only">
          Usuários da plataforma, com cargo, status de conta, número de compras
          e data de criação
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
                className="pb-[10px] text-left font-helvetica text-[18px] leading-[17px] font-bold tracking-[0.18px] text-white"
              >
                {column.label === "" ? (
                  /* A coluna de ações não tem título no desenho, mas um cabeçalho
                   vazio deixa o leitor de tela anunciar "coluna em branco". */
                  <span className="sr-only">Ações</span>
                ) : (
                  column.label
                )}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {users.map((user) => (
            /* A linha do arquivo tem 46px: uma divisória em cima e o conteúdo
             centrado logo abaixo. `border-t` em cada `<td>` (e não no `<tr>`,
             que não aceita borda com `border-collapse` em todos os
             navegadores) é o que desenha a linha contínua. */
            <tr key={user.id} className="h-[46px]">
              <Cell>{phoneOrDash(user.whatsapp)}</Cell>
              <Cell>{user.name}</Cell>

              <Cell>
                {/* Pílula de cargo: 100×24, raio 66, degradê cinza do arquivo. */}
                <span className="inline-flex h-[24px] w-[100px] items-center justify-center rounded-[66px] border border-white/5 bg-gradient-to-b from-[#222] to-[#1d1d1d] font-helvetica text-[14px] tracking-[0.14px] text-white">
                  {roleLabel(user.role)}
                </span>
              </Cell>

              <Cell>
                <StatusPill status={user.status} />
              </Cell>

              <Cell>{user.orderCount}</Cell>
              <Cell>{formatDateTime(user.createdAt)}</Cell>

              <Cell>
                <div className="flex justify-end pr-[10px]">
                  <UserEditDialog user={user} />
                </div>
              </Cell>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Cell({ children }: { children: React.ReactNode }) {
  return (
    <td className="truncate border-t border-white/15 pt-[12px] pb-[10px] font-helvetica text-[16px] leading-[16px] tracking-[0.16px] text-brand-placeholder">
      {children}
    </td>
  );
}

/**
 * Pílula de status. As cores são as do arquivo: verde `#00f55f` sobre `#0f361e`
 * e vermelho `#ff2828` sobre `#350507` — texto saturado sobre a mesma matiz bem
 * escurecida, a mesma fórmula das pílulas de situação do pedido.
 *
 * O rótulo está no feminino ("Banida") porque concorda com "conta", como no
 * arquivo.
 */
function StatusPill({ status }: { status: AdminUserStatus }) {
  const banned = status === "BANIDA";

  return (
    <span
      className={cn(
        "inline-flex h-[24px] w-[100px] items-center justify-center rounded-[66px] border border-white/5",
        "font-helvetica text-[14px] tracking-[0.14px]",
        banned ? "bg-[#350507] text-[#ff2828]" : "bg-[#0f361e] text-[#00f55f]",
      )}
    >
      {banned ? "Banida" : "Funcional"}
    </span>
  );
}
