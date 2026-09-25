import type { LoyaltyEntry } from "./data";
import { formatCents } from "./tiers";

/**
 * Extrato de Lets Coins — de onde veio e para onde foi cada moeda.
 *
 * ⚠️ NÃO ESTÁ NO FIGMA. O arquivo desenha o resumo e os cinco níveis, e para
 * aí: quem tem 1.750 coins na tela não tem como descobrir por quê.
 *
 * Enquanto o saldo era mock isso não incomodava, porque não havia história
 * nenhuma para contar. Com o programa valendo de verdade, um saldo sem extrato
 * é um número que o suporte não tem como defender quando o cliente reclama — e
 * o backend já grava cada movimento (`LoyaltyEntry`) exatamente por isso.
 *
 * Fica deliberadamente sóbrio, no estilo das tabelas do painel, e some quando
 * não há movimento: conta nova não precisa de uma tabela vazia para entender
 * que ainda não comprou nada.
 *
 * Mostra as 10 últimas. Paginação completa quando a tela ganhar um nó no
 * arquivo — a rota (`/me/loyalty/extrato`) já é paginada.
 */
export function LoyaltyStatement({
  entries,
  coinCents,
}: {
  entries: LoyaltyEntry[];
  coinCents: number;
}) {
  if (entries.length === 0) return null;

  return (
    <section
      aria-labelledby="fidelidade-extrato"
      className="mt-[50px] w-full overflow-hidden rounded-[30px] border border-white/10 bg-brand-surface p-[20px] md:p-[50px]"
    >
      <h2
        id="fidelidade-extrato"
        className="font-helvetica text-[22px] leading-[24px] font-bold tracking-[0.22px] text-white"
      >
        Últimos movimentos
      </h2>

      {/* Tabela larga no celular rola DENTRO do card, nunca a página. */}
      <div className="mt-[25px] overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-left">
        <thead>
          <tr className="font-helvetica text-[14px] leading-[13px] font-bold tracking-[0.14px] text-white/80">
            <th className="pb-[16px] font-normal">Data</th>
            <th className="pb-[16px] font-normal">Movimento</th>
            <th className="pb-[16px] text-right font-normal">Coins</th>
            <th className="pb-[16px] text-right font-normal">Valor</th>
          </tr>
        </thead>

        <tbody>
          {entries.map((entry) => (
            <tr
              key={entry.id}
              className="border-t border-white/10 font-poppins text-[15px] text-brand-fg-muted"
            >
              <td className="py-[16px] whitespace-nowrap">
                {formatDate(entry.createdAt)}
              </td>
              <td className="py-[16px] pr-[25px]">{entry.description}</td>
              {/* Crédito em verde e débito em branco, com o sinal explícito: a
                  cor sozinha não serve a quem não a distingue. */}
              <td
                className={`py-[16px] text-right font-bold whitespace-nowrap ${
                  entry.coins > 0 ? "text-[#00cb45]" : "text-white"
                }`}
              >
                {entry.coins > 0 ? "+" : ""}
                {entry.coins.toLocaleString("pt-BR")}
              </td>
              <td className="py-[16px] text-right whitespace-nowrap">
                {formatCents(Math.abs(entry.coins) * coinCents)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </section>
  );
}

/**
 * Data em pt-BR. O backend manda ISO 8601 porque não sabe o fuso de quem lê —
 * a mesma regra dos pedidos.
 */
function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
