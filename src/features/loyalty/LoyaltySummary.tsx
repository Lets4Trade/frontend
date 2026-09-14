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
    <section
      aria-labelledby="fidelidade-resumo"
      className="relative h-[549px] w-[1612px] shrink-0 overflow-hidden rounded-[30px] border border-white/10 bg-brand-surface"
    >
      <Image
        src={art.icon}
        alt=""
        width={62}
        height={62}
        aria-hidden
        className="absolute top-[47px] left-[50px] size-[62px] object-contain"
      />

      <h1
        id="fidelidade-resumo"
        className="absolute top-[50px] left-[127px] font-helvetica text-[25px] leading-[24px] font-bold tracking-[0.25px] text-white"
      >
        {data.tierName}
      </h1>

      <p className="absolute top-[89px] left-[127px] font-helvetica text-[16px] leading-[16px] tracking-[0.16px] text-brand-placeholder">
        {caption}
      </p>

      {/* Emblema decorativo maior, no canto direito do cabeçalho. */}
      <Image
        src="/images/tiers/resumo-decor.png"
        alt=""
        width={82}
        height={73}
        aria-hidden
        className="absolute top-[38px] left-[1480px] h-[73px] w-[82px] object-contain"
      />

      <StatBox
        label="Saldo de Lets Coins"
        className="absolute top-[130px] left-[50px] h-[127px] w-[1512px]"
      >
        {/* O equivalente em dinheiro fica NA MESMA LINHA do número, alinhado
            pela base. Sem ele, "1.750" não diz nada a quem nunca leu a regra —
            e a regra (1 coin = R$ 0,10) vem do backend, não de uma constante
            desta tela. O `StatValue` é um `<p>`, então os dois precisam de um
            flex em volta para não empilhar. */}
        <span className="flex items-baseline gap-[12px]">
          <StatValue>{data.coins.toLocaleString("pt-BR")}</StatValue>
          <span className="font-helvetica text-[16px] leading-[16px] tracking-[0.16px] text-brand-placeholder">
            = {formatCents(data.coinsCents)}
          </span>
        </span>
      </StatBox>

      <StatBox
        label="Cashback Atual"
        className="absolute top-[282px] left-[50px] h-[96px] w-[743px]"
      >
        <StatValue>{formatBps(data.cashbackBps)}</StatValue>
      </StatBox>

      <StatBox
        label="Total Economizado"
        className="absolute top-[282px] left-[819px] h-[96px] w-[743px]"
      >
        {/* Verde sólido, não o degradê laranja das outras — é o único número
            "de ganho" do painel e o design o destaca com cor própria. */}
        <StatValue gradient={false} className="text-[#00cb45]">
          {formatCents(data.totalSavedCents)}
        </StatValue>
      </StatBox>

      <div className="absolute top-[403px] left-[50px] h-[96px] w-[1512px] overflow-hidden rounded-[15px] border border-white/10 bg-black">
        <p className="absolute top-[26px] left-[50px] font-helvetica text-[14px] leading-[13px] font-bold tracking-[0.14px] text-white/80">
          {data.nextTierName
            ? `Progresso para o ${data.nextTierName}`
            : "Você está no nível máximo"}
        </p>

        <p className="text-brand-gradient absolute top-[26px] right-[50px] font-helvetica text-[16px] leading-[13px] font-bold tracking-[0.16px]">
          {data.progress}%
        </p>

        {/* Trilho e preenchimento partem do mesmo x/y; só a largura muda. */}
        <div className="absolute top-[47px] left-[49px] h-[6px] w-[1412px] rounded-[44px] border-[0.8px] border-white/[0.09] bg-gradient-to-b from-white/[0.04] to-white/[0.01]">
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

        <p className="absolute top-[63px] left-[50px] font-helvetica text-[14px] leading-[16px] tracking-[0.14px] text-brand-placeholder">
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
    </section>
  );
}
