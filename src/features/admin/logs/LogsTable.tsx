import { cn } from "@/lib/cn";
import {
  CATEGORY_STYLES,
  actionLabel,
  actorTypeLabel,
  formatEventTime,
  type AuditEntry,
} from "./types";

/**
 * Colunas da trilha. As larguras seguem a mesma lógica da tabela de usuários —
 * medidas fixas com `table-fixed`, e a última absorvendo a sobra.
 *
 * A ordem responde, da esquerda para a direita, às perguntas de uma auditoria:
 * QUANDO, QUEM, O QUÊ, SOBRE O QUÊ, ONDE, DE ONDE.
 */
const COLUMNS = [
  { key: "when", label: "Quando", width: 180 },
  { key: "who", label: "Quem", width: 260 },
  { key: "category", label: "Categoria", width: 170 },
  { key: "action", label: "Ação", width: 200 },
  { key: "target", label: "Alvo", width: 200 },
  { key: "path", label: "Rota", width: 260 },
  { key: "ip", label: "IP", width: undefined },
] as const;

/**
 * Tabela da trilha de auditoria (`/admin/logs`).
 *
 * ⚠️ NÃO ESTÁ NO FIGMA — a tela foi pedida depois. Segue o estilo do "Painel de
 * usuário" (3831:117): mesmo card, mesma tabela, mesmas pílulas.
 *
 * `<table>` semântica pelo mesmo motivo da outra: são dados tabulares, e é o
 * que faz o leitor de tela anunciar "Ação: Produto · excluído" ao percorrer as
 * células.
 *
 * A tabela rola DENTRO do card abaixo de ~1500px. Barra horizontal na página é
 * o que a loja inteira evita; numa tabela de sete colunas ela é esperada.
 */
export function LogsTable({ entries }: { entries: AuditEntry[] }) {
  return (
    <div className="scrollbar-orange -mx-[10px] overflow-x-auto px-[10px]">
      <table className="w-full min-w-[1270px] table-fixed border-collapse">
        <caption className="sr-only">
          Eventos de auditoria: quando, quem, categoria, ação, alvo, rota e IP
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
                {column.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id} className="h-[46px]">
              <Cell>{formatEventTime(entry.createdAt)}</Cell>

              <Cell>
                {/* O ator vem congelado. Sem rótulo é visitante anônimo — e
                    dizer "Visitante" é mais honesto que deixar em branco. */}
                <span className="text-white">
                  {entry.actorLabel ?? actorTypeLabel(entry.actorType)}
                </span>
              </Cell>

              <Cell>
                <CategoryPill category={entry.category} />
              </Cell>

              <Cell>{actionLabel(entry.action)}</Cell>

              <Cell>
                {entry.entity ? (
                  <span title={entry.entityId ?? undefined}>
                    {entry.entity}
                    {entry.entityId ? ` ${entry.entityId.slice(0, 8)}…` : ""}
                  </span>
                ) : (
                  "—"
                )}
              </Cell>

              <Cell>{entry.path ?? "—"}</Cell>
              <Cell>{entry.ip ?? "—"}</Cell>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Cell({ children }: { children: React.ReactNode }) {
  return (
    <td className="truncate border-t border-white/15 pt-[12px] pb-[10px] pr-[15px] font-helvetica text-[15px] leading-[16px] tracking-[0.15px] text-brand-placeholder">
      {children}
    </td>
  );
}

function CategoryPill({ category }: { category: AuditEntry["category"] }) {
  const style = CATEGORY_STYLES[category];

  return (
    <span
      className={cn(
        "inline-flex h-[24px] w-[130px] items-center justify-center rounded-[66px] border border-white/5",
        "font-helvetica text-[13px] tracking-[0.13px]",
        style.className,
      )}
    >
      {style.label}
    </span>
  );
}
