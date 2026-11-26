import { getMenuGames } from "@/features/game/menuGames";
import { getSectionItemsFor, getSectionsFor } from "@/features/site/content";
import { SellForm } from "./SellForm";

const SECTION_HEADING =
  "font-helvetica text-[30px] leading-[26px] font-bold tracking-[0.3px] text-white";

/**
 * O MIOLO da tela "Venda pra nós" (Figma 2030:995): título e formulário. O
 * card "Contato Rápido" saiu em 2026-11-26 (pedido do usuário); o mascote
 * dele foi para dentro do formulário (`SellForm`).
 *
 * Saiu de `app/venda/page.tsx` em 2026-09-25 para ser uma "seção do desenho"
 * no construtor de páginas — a mesma peça aparece na página real e na prévia
 * do editor, e blocos novos podem entrar antes ou depois dela.
 *
 * Desde 2026-09-30 também é o layout SELL de uma aba de jogo (Figma 1798:772):
 * com `game`, o formulário nasce com o jogo da página escolhido e o título
 * "VENDA PRA NÓS" + divisor saem — a página do jogo já tem o próprio título e
 * as abas logo acima.
 */
export async function SellPageBody({ game }: { game?: { slug: string; name: string } } = {}) {
  // O título vem da tela "Edição de sessões"; vazio devolve o do arquivo.
  // Jogos do select: a mesma leitura cacheada do menu de jogos do cabeçalho.
  const [section, items, games] = await Promise.all([
    getSectionsFor("venda"),
    getSectionItemsFor("venda"),
    getMenuGames(),
  ]);

  /**
   * O subtítulo do formulário, editado como LISTA em "Edição de sessões" (o
   * 1º item). O 2º titulava o "Contato Rápido", que saiu em 2026-11-26.
   */
  const tituloFormulario = items("blocos")[0]?.title || "Suas Informações";

  return (
    <>
      {game ? null : (
        <>
          <h1 className={SECTION_HEADING}>
            {section("formulario").title || "VENDA PRA NÓS"}
          </h1>

          <hr className="mt-[25px] border-0 border-t border-brand-hairline" />
        </>
      )}

      {/* 63px até o título da seção — medido no design (divisor em 101,
          título em 165). É o único vão da tela que foge dos 25px. Dentro do
          jogo não há divisor: o vão é o da página, e o card fica CENTRADO
          na faixa de 1715 com a largura que o par formulário + contato tinha. */}
      <section className={`${game ? "mx-auto w-full max-w-[1195px] " : "mt-[63px] "}flex flex-col`}>
        <h2 className={SECTION_HEADING}>{tituloFormulario}</h2>

        <div className="mt-[25px] flex-1 rounded-[30px] border border-white/10 bg-brand-surface p-[25px] sm:p-[50px]">
          <SellForm games={games} game={game} />
        </div>
      </section>
    </>
  );
}
