"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  GameFaqSection,
  NewsSection,
  ReferencesSection,
} from "@/features/game/GameSections";
import { ProductCardShell } from "@/features/game/ProductCardShell";
import { gapBefore, type GameSectionKey } from "@/features/game/sections";
import { LINK_TABS, PRODUCT_TABS, type ProductTabDef } from "@/features/game/tabs";
import type { BuilderShared, Draft } from "./types";

/**
 * A pré-visualização do builder (Figma 3916:2867) — a página do jogo desenhada
 * a partir do RASCUNHO, antes de publicar.
 *
 * ── Por que não reusar os componentes da vitrine ───────────────────────────
 * Porque eles leem o BANCO, e o que esta área precisa mostrar é o que ainda não
 * foi salvo. Um preview que só mostra o estado publicado não é preview — é a
 * própria página, e para isso já existe `/games/[slug]`.
 *
 * ── A escala ───────────────────────────────────────────────────────────────
 * O arquivo desenha a área de preview com 1202px de largura mostrando uma
 * página de 1920. Medido nos cards de produto: 265px na vitrine viram 165,9 no
 * builder — 0,626 exatos. Então aqui a página é montada nas medidas REAIS e o
 * bloco inteiro é reduzido por `transform: scale`, em vez de ter uma segunda
 * folha de medidas para manter em sincronia com a vitrine.
 *
 * `transform` não ocupa espaço no fluxo (o elemento continua "grande" para o
 * layout), então o invólucro declara a altura já reduzida — sem isso o painel
 * ganharia centenas de pixels de vazio embaixo.
 *
 * ── Os cards são MARCADORES, mas o CARD é o de verdade ─────────────────────
 * 24 cards escritos "Product Name / R$ 25,00", como no arquivo — os produtos
 * reais não entram porque esta tela edita a ESTRUTURA da página, e buscar o
 * catálogo a cada tecla digitada no painel ao lado seria uma consulta por
 * rascunho.
 *
 * Mas a MOLDURA é `ProductCardShell`, a mesma da vitrine: assim o card tem o
 * degradê, a faixa preta e a fileira de ações no lugar certo. Redesenhá-lo aqui
 * é como as duas versões começam a divergir num pixel que ninguém percebe.
 *
 * ── O que vem PRONTO do servidor ───────────────────────────────────────────
 * Referências, notícias, FAQ e a moeda de fidelidade não são editáveis por
 * aqui: chegam em `shared` e são desenhadas pelos COMPONENTES DA VITRINE. A
 * primeira versão desta tela punha retângulos rotulados no lugar deles, e a
 * maquete deixava de parecer a página.
 */

/**
 * A escala do ARQUIVO: 1202px de área de preview para uma página de 1920.
 *
 * Fica aqui como referência histórica e como piso do que já se sabia legível —
 * a escala de verdade é MEDIDA, porque o layout desta tela dá mais espaço à
 * maquete do que o arquivo dava (1486px contra 1202). Ver `useScaledPreview`.
 */
const FIGMA_SCALE = 0.626;

/** A faixa de conteúdo da vitrine, em medida real. */
const CONTENT_WIDTH = 1714;

/**
 * Altura inicial da maquete, antes de a medição chegar.
 *
 * Serve só para o primeiro quadro não ter altura zero e a tela não pular. Quem
 * manda depois é o `ResizeObserver`.
 */
const INITIAL_HEIGHT = 1815;

/**
 * A ESCALA e a ALTURA da maquete, medidas do próprio layout.
 *
 * ── Por que a escala não é a do arquivo ────────────────────────────────────
 * O Figma desenha a área de preview com 1202px. Esta tela dá 1486 — a lateral
 * de etapas é mais estreita que a do desenho, e a moldura mudou. Fixar 0,626
 * deixava 413px (28%) de vazio à direita, que foi exatamente o que o usuário
 * apontou.
 *
 * A escala passa a ser `largura disponível ÷ 1714`. A maquete ocupa a coluna
 * inteira em qualquer janela, e fica MAIS legível do que no arquivo — o que é
 * bom numa tela cujo trabalho é conferir uma página.
 *
 * Teto de 1: a maquete nunca AUMENTA a página além do tamanho real. Passar de
 * 1:1 não mostraria mais nada, só ampliaria o desenho e daria uma impressão
 * errada de proporção a quem está decidindo layout.
 *
 * ── Por que a altura também é medida ───────────────────────────────────────
 * `transform: scale()` não encolhe a caixa no fluxo: o elemento continua com a
 * altura original, e o invólucro precisa declarar a altura JÁ reduzida.
 *
 * A primeira versão usava uma constante (2900) "com folga". Não tinha folga:
 * quando a maquete passou a desenhar referências, notícias e FAQ de verdade, o
 * conteúdo foi para 6241px e o `overflow-hidden` cortava mais da metade.
 * Constante que mede algo que a própria tela edita é constante errada.
 *
 * ── O laço que não acontece ────────────────────────────────────────────────
 * Definir a altura do invólucro dispara o observador dele de novo. Por isso o
 * de fora só reage à LARGURA: a altura muda, o `width` não, e a atualização
 * para ali. A largura não depende da altura — a coluna é `flex-1`.
 *
 * ── A primeira medida NÃO espera o observador ──────────────────────────────
 * Cada efeito mede uma vez, na hora, e só depois liga o `ResizeObserver`. A
 * diferença aparece quando a aba está em SEGUNDO PLANO: o navegador pausa os
 * passos de renderização, e é neles que a callback do observador é entregue —
 * então uma maquete que dependesse só dele nasceria com a escala do arquivo e
 * ficaria assim até alguém olhar para a aba.
 *
 * Descoberto testando exatamente esse caso (`document.hidden === true`), e vale
 * além do teste: quem deixa o painel aberto numa aba de fundo e volta depois
 * encontraria a tela errada.
 */
function useScaledPreview() {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(FIGMA_SCALE);
  const [height, setHeight] = useState(INITIAL_HEIGHT);

  useEffect(() => {
    const outer = outerRef.current;
    if (!outer) return;

    let lastWidth = 0;
    const apply = (width: number) => {
      if (width <= 0 || width === lastWidth) return;
      lastWidth = width;
      setScale(Math.min(1, width / CONTENT_WIDTH));
    };

    // Mede JÁ — sem depender de o observador ser entregue.
    apply(outer.getBoundingClientRect().width);

    const observer = new ResizeObserver(([entry]) => apply(entry.contentRect.width));
    observer.observe(outer);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const inner = innerRef.current;
    if (!inner) return;

    // `getBoundingClientRect` já vem com a transformação aplicada, então este
    // valor é a altura VISÍVEL — que é a que o invólucro precisa.
    const measure = () => {
      const visible = inner.getBoundingClientRect().height;
      if (visible > 0) setHeight(Math.ceil(visible));
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(inner);
    return () => observer.disconnect();
  }, []);

  // A altura precisa acompanhar a escala na MESMA pintura em que ela muda: sem
  // isto, aumentar a janela deixaria um vão até o observador de altura reagir.
  useEffect(() => {
    const inner = innerRef.current;
    if (inner) setHeight(Math.ceil(inner.getBoundingClientRect().height));
  }, [scale]);

  return { outerRef, innerRef, scale, height };
}

/** O que o arquivo escreve no lugar de uma imagem que ainda não existe. */
function SlotHint({ label }: { label: string }) {
  return (
    <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-center font-poppins text-[15px] text-white/30">
      {label}
    </span>
  );
}

export function BuilderPreview({
  draft,
  gameName,
  shared,
}: {
  draft: Draft;
  gameName: string;
  shared: BuilderShared | null;
}) {
  const tabs = PRODUCT_TABS.filter((tab) => draft.productTypes.includes(tab.productType));
  const heading = draft.heading.trim() || derivedHeading(gameName, tabs[0]?.label);
  const banner = draft.banners[0];
  const { outerRef, innerRef, scale, height } = useScaledPreview();

  return (
    <div
      ref={outerRef}
      className="overflow-hidden rounded-[20px] border border-brand-border bg-black"
      // Escala e altura vêm da MEDIÇÃO do layout. Ver `useScaledPreview`.
      style={{ height }}
    >
      <div
        ref={innerRef}
        aria-hidden
        // `aria-hidden` porque isto é uma MAQUETE: repetir a página inteira na
        // árvore de acessibilidade faria o leitor de tela ler 24 cards falsos
        // entre os controles reais do formulário. Quem edita usa o painel, não
        // esta área.
        style={{
          width: CONTENT_WIDTH,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
        className="relative"
      >
        {/* Brilho do topo (Figma 1127:360), igual ao da página: o centro cai
            acima do frame e o que aparece é só a borda de baixo. */}
        <Image
          src="/images/game/glow-top.svg"
          alt=""
          width={472}
          height={472}
          className="pointer-events-none absolute -top-[310px] -left-[222px] size-[472px] max-w-none"
        />

        <div className="px-[50px] pt-[50px] pb-[100px]">
          {/* A ORDEM é a do rascunho (etapa 10). Bloco escondido não está na
              lista, então não desenha — e não deixa o vão dele para trás. */}
          {draft.sectionOrder.map((key, index) => (
            <div
              key={key}
              style={
                index === 0
                  ? undefined
                  : { marginTop: gapBefore(draft.sectionOrder, index) }
              }
            >
              {renderBlock(key, { draft, gameName, tabs, heading, banner, shared })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

type BlockContext = {
  draft: Draft;
  gameName: string;
  tabs: ProductTabDef[];
  heading: string;
  banner: Draft["banners"][number] | undefined;
  shared: BuilderShared | null;
};

/**
 * Um bloco da maquete.
 *
 * `null` = não tem o que mostrar, e some sem deixar vão — o mesmo
 * comportamento de `GamePageSections` na vitrine de verdade.
 */
function renderBlock(key: GameSectionKey, ctx: BlockContext) {
  const { draft, gameName, tabs, heading, banner, shared } = ctx;

  switch (key) {
    case "banner":
      return (
        <div className="relative h-[490px] w-full overflow-hidden rounded-[30px] border border-white/10 bg-[#111]">
          {banner ? (
            <Image
              src={banner.imageUrl}
              alt=""
              fill
              sizes="1715px"
              className="object-cover"
            />
          ) : (
            <SlotHint label="Tamanho da imagem W:1715 H:490" />
          )}
        </div>
      );

    case "identity":
      return (
        // `relative` porque a moeda sangra para fora da faixa, como na vitrine.
        <div className="relative flex items-start gap-[30px]">
          <div className="relative h-[164px] w-[199px] shrink-0">
            {draft.imageUrl ? (
              <Image
                src={draft.imageUrl}
                alt=""
                fill
                sizes="200px"
                className="object-contain"
              />
            ) : (
              <span className="absolute inset-0 rounded-[12px] border border-dashed border-white/15" />
            )}
          </div>

          <div className="min-w-0 flex-1 pt-[8px]">
            <p className="font-helvetica text-[30px] leading-none font-bold text-white">
              {heading}
            </p>

            <div className="mt-[25px] flex flex-wrap gap-[15px]">
              {[...tabs, ...LINK_TABS].map((tab, index) => (
                <span
                  key={tab.id}
                  className={`flex h-[99px] min-w-[130px] flex-col items-center rounded-[8px] border-2 border-white/10 px-[10px] pt-[11px] ${
                    index === 0
                      ? "bg-[image:var(--brand-orange-gradient)] text-white"
                      : "bg-[image:var(--brand-surface-fill)] text-white/80"
                  }`}
                >
                  <Image
                    src={tab.icon}
                    alt=""
                    width={50}
                    height={50}
                    className="size-[50px]"
                  />
                  <span className="mt-[5px] font-poppins text-[15px] leading-none font-bold">
                    {tab.label}
                  </span>
                </span>
              ))}
              {tabs.length === 0 ? (
                <span className="font-poppins text-[15px] text-white/40">
                  Nenhuma categoria principal escolhida — a loja abriria sem abas.
                </span>
              ) : null}
            </div>
          </div>

          {/* A moeda "4" da fidelidade. Não é editável pelo builder, mas está
              na página — e sem ela a maquete tem um vazio à direita das abas
              que a página real não tem. */}
          {shared?.coin ? (
            <Image
              src={shared.coin.src}
              alt=""
              width={shared.coin.width}
              height={shared.coin.height}
              className="absolute top-[150px] -right-[16px] size-[179px]"
            />
          ) : null}
        </div>
      );

    case "servers":
      return (
        <div>
          <p className="font-helvetica text-[18px] leading-none font-bold text-white">
            {draft.serversLabel.trim() || "Selecionar servidor"}
          </p>
          <div className="mt-[25px] flex flex-wrap gap-[25px]">
            {draft.servers.length === 0 ? (
              <span className="font-poppins text-[15px] text-white/40">
                Nenhum servidor cadastrado.
              </span>
            ) : (
              draft.servers.map((server, index) => (
                <span
                  key={server.key}
                  className={`inline-flex h-[50px] min-w-[197px] items-center justify-center rounded-full px-6 font-poppins text-[16px] font-bold ${
                    index === 0
                      ? "bg-[image:var(--brand-orange-gradient)] text-black"
                      : "border border-brand-border bg-[image:var(--brand-surface-fill)] text-white/80"
                  }`}
                >
                  {server.label || "—"}
                </span>
              ))
            )}
          </div>
        </div>
      );

    case "categories":
      if (draft.categories.length === 0) return null;
      return (
        <div className="rounded-[30px] border border-brand-border bg-[image:var(--brand-surface-fill)] px-[49px] pt-[25px] pb-[36px]">
          <p className="font-helvetica text-[18px] leading-none font-bold text-white">
            {draft.categoriesLabel.trim() || "Selecionar categoria"}
          </p>
          <div className="mt-[24px] grid grid-cols-[repeat(auto-fill,282px)] gap-x-[24px] gap-y-[15px]">
            {draft.categories.map((category) => (
              <span
                key={category.key}
                className="flex h-[40px] w-[282px] items-center gap-[10px] rounded-[8px] border border-white/10 bg-[image:var(--brand-surface-fill)] px-[25px]"
              >
                <span className="h-[30px] w-[32px] shrink-0 rounded-[8px] border-2 border-white/10" />
                <span className="truncate font-poppins text-[13px] leading-none font-bold text-white/80">
                  {category.label || "—"}
                </span>
              </span>
            ))}
          </div>
        </div>
      );

    case "catalog":
      return (
        <div>
          <div className="flex items-center justify-between">
            <p className="font-helvetica text-[22px] leading-none font-bold text-white">
              {draft.servers[0]?.label || gameName}
            </p>
            <div className="flex items-center gap-[32px]">
              {["De A a Z", "De Z a A", "Menor preço", "Maior preço"].map((label) => (
                <span key={label} className="flex items-center gap-[10px]">
                  <span className="h-[30px] w-[32px] rounded-[8px] border-2 border-white/10" />
                  <span className="font-poppins text-[15px] leading-none font-bold text-white/80">
                    {label}
                  </span>
                </span>
              ))}
              <span className="flex h-[50px] w-[219px] items-center rounded-full border border-brand-border bg-[image:var(--brand-surface-fill)] pl-[60px] font-helvetica text-[15px] text-brand-placeholder">
                Pesquisar itens...
              </span>
            </div>
          </div>

          <div className="mt-[25px] grid grid-cols-[repeat(auto-fill,265px)] justify-between gap-x-[24px] gap-y-[25px]">
            {Array.from({ length: 24 }, (_, i) => (
              <ProductCardShell
                key={i}
                name="Product Name"
                price="R$ 25,00"
                actions={<CardActions />}
              />
            ))}
          </div>

          {/* A paginação do arquivo: quatro círculos. Na maquete são inertes —
              a página real calcula quantas há a partir do catálogo. */}
          <div className="mt-[50px] flex justify-center gap-[15px]">
            {[1, 2, 3, 4].map((n) => (
              <span
                key={n}
                className={`flex size-[50px] items-center justify-center rounded-full border font-poppins text-[16px] font-bold ${
                  n === 1
                    ? "border-transparent bg-[image:var(--brand-orange-gradient)] text-black"
                    : "border-brand-border bg-[image:var(--brand-surface-fill)] text-white/80"
                }`}
              >
                {n}
              </span>
            ))}
          </div>
        </div>
      );

    case "description":
      return (
        <div className="rounded-[30px] border border-brand-border bg-[image:var(--brand-surface-fill)] px-[50px] py-[40px]">
          {draft.description.trim() ? (
            <p className="font-poppins text-[16px] leading-[26px] whitespace-pre-line text-white/80">
              {draft.description}
            </p>
          ) : (
            <p className="font-poppins text-[16px] text-white/30">
              A descrição da página aparece aqui.
            </p>
          )}
        </div>
      );

    /*
     * Os COMPONENTES DA VITRINE, com o conteúdo publicado.
     *
     * O builder não edita estes três — eles vêm do conteúdo editorial e da tela
     * "Edição de sessões", iguais para todo jogo. Mas quem monta a página
     * precisa vê-los como são, porque a etapa 10 decide ONDE eles ficam: um
     * retângulo rotulado de 220px no lugar de um bloco de novecentos dá uma
     * noção errada de quanto a página mede e de onde cada coisa cai.
     *
     * Era assim na primeira versão desta tela, e o usuário apontou o que isso
     * custava: a maquete deixava de parecer a página.
     *
     * `shared` nulo (a leitura da página publicada falhou) esconde o bloco em
     * vez de derrubar a tela — o builder continua editável sem a maquete
     * completa.
     */
    case "references":
      return shared ? <ReferencesSection references={shared.references} /> : null;
    case "news":
      return shared ? <NewsSection news={shared.news} /> : null;
    case "faq":
      return shared ? <GameFaqSection groups={shared.faq} /> : null;
  }
}

/**
 * A fileira de ações do card, como a vitrine desenha: dois passos, o contador e
 * o botão de carrinho, a 32px da borda.
 *
 * Inerte de propósito — é uma maquete. Mas ocupa o mesmo espaço, que é o que
 * faz o card ter a altura certa.
 */
function CardActions() {
  return (
    <span className="flex items-center gap-[15px] pl-[32px]">
      {["−", "1", "+"].map((simbolo, i) => (
        <span
          key={simbolo}
          className={
            i === 1
              ? "w-[22px] text-center font-poppins text-[18px] leading-[27px] font-bold text-white"
              : "flex size-[50px] items-center justify-center rounded-[8px] border border-white/10 bg-[image:var(--brand-surface-fill)] font-poppins text-[18px] font-bold text-white"
          }
        >
          {simbolo}
        </span>
      ))}
      <span className="flex size-[50px] items-center justify-center rounded-[8px] border border-white/15 bg-[image:var(--brand-orange-gradient)]">
        <Image
          src="/icons/game/cart.svg"
          alt=""
          width={22}
          height={22}
          className="size-[22px]"
        />
      </span>
    </span>
  );
}

/** O mesmo título que a vitrine deriva quando o admin não escreveu um. */
function derivedHeading(name: string, tabLabel?: string) {
  if (!tabLabel) return `Compre em ${name}`;
  const what = tabLabel.charAt(0) + tabLabel.slice(1).toLocaleLowerCase("pt-BR");
  return `Compre ${what} De ${name}`;
}
