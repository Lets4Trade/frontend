import Image from "next/image";
import { StatBox, StatValue } from "@/components/ui/StatBox";
import type { LoyaltySummary as LoyaltySummaryData } from "./data";
import { formatBps, formatCents, tierArt } from "./tiers";

/**
 * Painel-resumo da fidelidade (Figma 2176:2408) — 1612×549, raio 30.
 *
 * Medidas do design: emblema do nível em (50,47) 62×62, título em (127,50),
 * subtítulo em (127,89); caixa do saldo em (50,130) 1512×127; cashback e total
 * economizado em (50,282) e (819,282), 743×96 cada; progresso em (50,403)
 * 1512×96. Vãos de 25px entre as faixas e 50px de padding.
 *
 * O emblema mostra o ícone do nível ATUAL — no design é o de Bronze porque era
 * o nível do usuário do mock, não porque seja fixo.
 *
 * Todos os números vêm do backend (`GET /me/loyalty`). O único cálculo que
 * sobrou na tela é qual arte desenhar.
 */
export function LoyaltySummary({
  data,
  caption = "Ganhe mais benefícios",
}: {
  data: LoyaltySummaryData;
  /**
   * A legenda sob o nome do nível.
   *
   * Era texto fixo, e a sessão "Fidelidade - Resumo" da tela de edição não tinha
   * nada editável — salvar não fazia efeito nenhum. O resto do painel é DADO do
   * cliente (saldo, cashback, progresso) e continua sem se editar.
   */
  caption?: string;
}) {
  const art = tierArt(data.tier);

  return (
    // Em FLUXO, não em coordenadas absolutas (2026-09-25): com 1612px fixos e
    // tudo posicionado por pixel, a página inteira rolava na horizontal em
    // qualquer tela menor que 1920. Os vãos abaixo reproduzem as medidas do
    // arquivo no desktop — cabeçalho até 111, saldo em 130, cashback em 282,
    // progresso em 403, fim em 549 — e deixam o card encolher com a janela.
    <section
      aria-labelledby="fidelidade-resumo"
      className="w-full overflow-hidden rounded-[30px] border border-white/10 bg-brand-surface px-[20px] pt-[20px] pb-[20px] md:px-[50px] md:pt-[38px] md:pb-[50px]"
    >
      <header className="flex items-start gap-[15px] md:min-h-[73px]">
        <Image
          src={art.icon}
          alt=""
          width={62}
          height={62}
          aria-hidden
          className="mt-[9px] size-[48px] shrink-0 object-contain md:size-[62px]"
        />

        <div className="min-w-0 pt-[12px]">
          <h1
            id="fidelidade-resumo"
            className="font-helvetica text-[22px] leading-[24px] font-bold tracking-[0.25px] text-white md:text-[25px]"
          >
            {data.tierName}
          </h1>
          <p className="mt-[15px] font-helvetica text-[16px] leading-[16px] tracking-[0.16px] text-brand-placeholder">
            {caption}
          </p>
        </div>

        {/* Emblema decorativo maior, no canto direito do cabeçalho. */}
        <Image
          src="/images/tiers/resumo-decor.png"
          alt=""
          width={82}
          height={73}
          aria-hidden
          className="ml-auto hidden h-[73px] w-[82px] shrink-0 object-contain sm:block"
        />
      </header>

      <div className="mt-[19px] flex flex-col gap-[25px]">
        <StatBox
          label="Saldo de Lets Coins"
          className="min-h-[110px] md:h-[127px]"
          contentClassName="px-[20px] py-[20px] md:px-[50px]"
        >
          {/* O equivalente em dinheiro fica NA MESMA LINHA do número, alinhado
              pela base. Sem ele, "1.750" não diz nada a quem nunca leu a regra —
              e a regra (1 coin = R$ 0,10) vem do backend, não de uma constante
              desta tela. O `StatValue` é um `<p>`, então os dois precisam de um
              flex em volta para não empilhar. */}
          <span className="flex flex-wrap items-baseline gap-x-[12px]">
            <StatValue>{data.coins.toLocaleString("pt-BR")}</StatValue>
            <span className="font-helvetica text-[16px] leading-[16px] tracking-[0.16px] text-brand-placeholder">
              = {formatCents(data.coinsCents)}
            </span>
          </span>
        </StatBox>

        {/* Lado a lado no desktop (743 + 26 + 743 no arquivo), empilhados no celular. */}
        <div className="grid gap-[25px] md:grid-cols-2 md:gap-[26px]">
          <StatBox
            label="Cashback Atual"
            className="h-[96px]"
            contentClassName="px-[20px] md:px-[50px]"
          >
            <StatValue>{formatBps(data.cashbackBps)}</StatValue>
          </StatBox>

          <StatBox
            label="Total Economizado"
            className="h-[96px]"
            contentClassName="px-[20px] md:px-[50px]"
          >
            {/* Verde sólido, não o degradê laranja das outras — é o único número
                "de ganho" do painel e o design o destaca com cor própria. */}
            <StatValue gradient={false} className="text-[#00cb45]">
              {formatCents(data.totalSavedCents)}
            </StatValue>
          </StatBox>
        </div>

        <div className="min-h-[96px] overflow-hidden rounded-[15px] border border-white/10 bg-black px-[20px] pt-[25px] pb-[14px] md:px-[50px]">
          <div className="flex items-baseline justify-between gap-[15px]">
            <p className="font-helvetica text-[14px] leading-[13px] font-bold tracking-[0.14px] text-white/80">
              {data.nextTierName
                ? `Progresso para o ${data.nextTierName}`
                : "Você está no nível máximo"}
            </p>
            <p className="text-brand-gradient font-helvetica text-[16px] leading-[13px] font-bold tracking-[0.16px]">
              {data.progress}%
            </p>
          </div>

          {/* Trilho e preenchimento partem do mesmo ponto; só a largura muda. */}
          <div className="mt-[8px] h-[6px] w-full rounded-[44px] border-[0.8px] border-white/[0.09] bg-gradient-to-b from-white/[0.04] to-white/[0.01]">
            <div
              className="h-full rounded-[44px]"
              style={{
                width: `${data.progress}%`,
                backgroundImage:
                  "linear-gradient(179.68deg, #ff7300 13.819%, #ff4d00 89.223%)",
              }}
              role="progressbar"
              aria-valuenow={data.progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={
                data.nextTierName
                  ? `Progresso para o nível ${data.nextTierName}`
                  : "Nível máximo alcançado"
              }
            />
          </div>

          <p className="mt-[10px] font-helvetica text-[14px] leading-[16px] tracking-[0.14px] text-brand-placeholder">
            {data.nextTierName ? (
              <>
                Faltam{" "}
                <span className="font-bold">
                  {formatCents(data.missingToNextCents)}
                </span>{" "}
                para o próximo nível
              </>
            ) : (
              /* Adamantium não tem "próximo". Repetir a frase com R$ 0,00 seria
                 dizer que falta alguma coisa a quem já chegou ao fim. */
              <>
                Você tem o maior cashback do programa:{" "}
                <span className="font-bold">{formatBps(data.cashbackBps)}</span>
              </>
            )}
          </p>
        </div>
      </div>
    </section>
  );
}
