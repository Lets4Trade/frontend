import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Peças do painel da direita, compartilhadas pelo checkout (Figma 2568:1505) e
 * pela tela do pedido (2569:1682).
 *
 * SEPARADAS DO `CheckoutShell` de propósito: o shell renderiza o `SiteHeader`,
 * que lê a sessão com `next/headers` e portanto só existe no servidor. Estas
 * peças são usadas por dentro do `CheckoutClient`, que é client component — no
 * mesmo arquivo, o import do cabeçalho arrastava `next/headers` para o grafo do
 * cliente e o build quebrava.
 */

/**
 * Painel da direita: 841px encostados na borda, o mesmo nas duas telas.
 *
 * `relative z-10` para ficar POR CIMA do cabeçalho reduzido, que é absoluto e
 * ocupa os 1077px da esquerda. No arquivo os dois somam 1920 e nunca se tocam;
 * na nossa moldura elástica eles se sobrepõem, e quem tem que ganhar a faixa é o
 * painel. Sem o `relative`, o `z-10` não vale nada — z-index só existe em
 * elemento posicionado.
 */
export function CheckoutSidePanel({ children }: { children: ReactNode }) {
  return (
    <aside className="relative z-10 w-[841px] shrink-0 border-l border-white/20 bg-[#070707] px-[100px] pt-[49px] pb-[60px]">
      {children}
    </aside>
  );
}

/** Selo "+1000 REFERÊNCIAS", o mesmo do cabeçalho do site. */
export function ReferencesBadge() {
  return (
    <div className="flex shrink-0 flex-col items-center leading-none">
      <div className="flex items-center gap-2">
        <span className="bg-gradient-to-b from-brand-orange to-brand-orange-deep bg-clip-text font-korataki text-[20px] font-bold tracking-[0.2px] text-transparent">
          +1000
        </span>
        <Image src="/icons/youtube-color.svg" alt="" width={19} height={19} aria-hidden />
      </div>
      <span className="mt-1 font-korataki text-[13px] tracking-[0.13px] text-white">
        REFERÊNCIAS
      </span>
    </div>
  );
}

/** Botão "CONFERIRA NOSSAS REFERÊNCIAS AQUI" — 431×50 no topo do painel. */
export function ReferencesButton() {
  return (
    <Link
      href="/#reviews"
      className="brand-ring flex h-[50px] w-[431px] items-center justify-center gap-[10px] rounded-full bg-[image:var(--brand-surface-fill)] font-poppins text-[16px] font-bold tracking-[0.16px] text-white transition-opacity hover:opacity-90"
    >
      <Image
        src="/icons/checkout/crown.svg"
        alt=""
        width={22}
        height={22}
        aria-hidden
        className="size-[22px]"
      />
      CONFERIRA NOSSAS REFERÊNCIAS AQUI
    </Link>
  );
}
