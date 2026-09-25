import Image from "next/image";
import Link from "next/link";
import type { GamePage, GameTab } from "./types";

/**
 * Identidade do jogo (Figma 1524:517 + 1524:401): logo, título e as abas de
 * serviço. A moeda "4" fica à direita, na altura dos botões de servidor.
 *
 * Montado em FLUXO e não em coordenada: o título é escrito pelo admin e pode
 * virar duas linhas. Numa grade absoluta isso passaria por cima das abas; aqui
 * as abas descem junto. Os números (30px de vão para o logo, 25 até as abas,
 * 15 entre elas) são os do arquivo, medidos como diferença de coordenadas.
 */
export function GameIdentity({ page }: { page: GamePage }) {
  const { logo, heading, coin } = page.identity;

  return (
    <div className="relative flex items-start gap-[30px]">
      <GameLogo logo={logo} name={page.name} />

      <div className="flex-1 pt-[8px]">
        <h1 className="font-helvetica text-[30px] leading-none font-bold tracking-[0.3px] text-white">
          {heading}
        </h1>

        <nav className="mt-[25px] flex flex-wrap gap-[15px]">
          {page.tabs.map((tab) => (
            <TabLink key={tab.id} tab={tab} active={tab.id === page.activeTabId} />
          ))}
        </nav>
      </div>

      {coin ? (
        // Fora do fluxo porque no arquivo ela sangra 16px para além da faixa de
        // conteúdo e desce até a altura dos botões de servidor. Entrar no
        // `flex` empurraria as abas.
        <Link
          href={coin.href ?? "/fidelidade"}
          className="absolute top-[150px] -right-[16px] block size-[179px]"
          aria-label="Programa de fidelidade"
        >
          <Image
            src={coin.src}
            alt=""
            width={coin.width}
            height={coin.height}
            aria-hidden
            className="size-full"
          />
        </Link>
      ) : null}
    </div>
  );
}

/** A caixa do logo no arquivo. A arte entra DENTRO dela, nunca a estica. */
const LOGO_BOX = { width: 199.435, height: 163.82 };

/**
 * O logo tem uma cópia borrada atrás fazendo o halo — mesmo tratamento que os
 * cards do hero da home.
 *
 * A arte vem do painel e NÃO tem proporção conhecida: antes as medidas de cada
 * um dos cinco jogos estavam escritas no conteúdo semente, e o primeiro jogo
 * cadastrado pelo admin sairia esticado. Agora a caixa é fixa e a imagem se
 * encaixa por `object-contain`, que funciona para qualquer arte.
 *
 * `fill` em vez de `width`/`height` pelo mesmo motivo: sem dimensão de origem,
 * é a caixa que reserva o espaço. O `sizes` declara a largura real para o
 * otimizador não servir uma variante grande demais.
 *
 * Sem arte, a caixa some. Reservar 199px de vazio ao lado do título deixaria um
 * buraco que ninguém entende — e o cadastro permite criar o jogo antes de a
 * arte existir.
 */
function GameLogo({ logo, name }: { logo?: { src: string; alt?: string }; name: string }) {
  if (!logo) return null;

  return (
    <div className="relative shrink-0" style={LOGO_BOX}>
      {[true, false].map((blurred) => (
        <Image
          key={String(blurred)}
          src={logo.src}
          // A cópia borrada é decoração: só a de cima descreve o jogo, e
          // duplicar o texto alternativo faria o leitor de tela repetir.
          alt={blurred ? "" : (logo.alt || name)}
          fill
          sizes="200px"
          // Acima da dobra em TODA página de jogo, e é a arte que identifica a
          // página. Com o `lazy` padrão a caixa fica vazia até o carregamento
          // preguiçoso disparar — medido no navegador: `naturalWidth` era 0 na
          // primeira leitura, e o topo da página aparecia sem o logo.
          priority
          aria-hidden={blurred || undefined}
          className="object-contain"
          style={{ filter: blurred ? "blur(5.92px)" : undefined }}
        />
      ))}
    </div>
  );
}

/**
 * Aba de serviço. 130×99 no arquivo, com o ícone de 50px em cima e o rótulo
 * embaixo; a ativa troca o vidro pelo degradê laranja.
 *
 * `min-w` em vez de largura fixa porque o rótulo é editável — no próprio
 * arquivo "VENDA PRA NÓS" já é 13px mais larga que as outras.
 */
function TabLink({ tab, active }: { tab: GameTab; active: boolean }) {
  return (
    <Link
      href={tab.href}
      aria-current={active ? "page" : undefined}
      className={`relative flex h-[99px] min-w-[130px] flex-col items-center justify-start rounded-[8px] border-2 border-white/10 px-[10px] pt-[11px] backdrop-blur-[100px] transition-opacity hover:opacity-90 ${
        active
          ? "bg-[image:var(--brand-orange-gradient)] text-white"
          : "bg-[image:var(--brand-surface-fill)] text-white/80"
      }`}
    >
      <TabIcon tab={tab} />
      <span className="mt-[5px] font-poppins text-[15px] leading-none font-bold tracking-[0.15px]">
        {tab.label}
      </span>
    </Link>
  );
}

/**
 * O SVG do ícone é maior que a caixa de 50px — ele sangra para baixo e para os
 * lados, que é onde mora o brilho do desenho. Os valores são os que o arquivo
 * declara; recortar em 50×50 cortaria o brilho fora.
 */
const ICON_BLEED = "0 -14.81% -29.63% -14.81%";

function TabIcon({ tab }: { tab: GameTab }) {
  return (
    <span className="relative block size-[50px]">
      <span className="absolute" style={{ inset: ICON_BLEED }}>
        <Image
          src={tab.icon.src}
          alt=""
          width={65}
          height={65}
          aria-hidden
          className="size-full"
        />
      </span>
    </span>
  );
}
