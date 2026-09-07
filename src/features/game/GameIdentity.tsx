import Image from "next/image";
import Link from "next/link";
import type { GamePage, GameTab, ImageRef } from "./types";

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
      <GameLogo logo={logo} />

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

/**
 * O logo tem uma cópia borrada atrás fazendo o halo — mesmo tratamento que os
 * cards do hero da home.
 */
function GameLogo({ logo }: { logo: ImageRef }) {
  return (
    <div
      className="relative shrink-0"
      style={{ width: 199.435, height: 163.82 }}
    >
      {[true, false].map((blurred) => (
        <Image
          key={String(blurred)}
          src={logo.src}
          alt={blurred ? "" : (logo.alt ?? "")}
          width={Math.round(logo.width)}
          height={Math.round(logo.height)}
          aria-hidden={blurred || undefined}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 object-contain"
          style={{
            width: logo.width,
            height: logo.height,
            filter: blurred ? "blur(5.92px)" : undefined,
          }}
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

      {tab.iconOverlay ? (
        <span
          className="absolute"
          style={{ inset: tab.iconOverlay.inset }}
          aria-hidden
        >
          <Image
            src={tab.iconOverlay.src}
            alt=""
            width={32}
            height={32}
            className={`size-full ${tab.iconOverlay.flip ? "-scale-x-100 rotate-180" : ""}`}
          />
        </span>
      ) : null}
    </span>
  );
}
