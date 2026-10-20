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
export function CheckoutSidePanel({
  children,
  mobileFirst = false,
}: {
  children: ReactNode;
  /** No celular, o painel vem ANTES da coluna principal (resumo antes do formulário). */
  mobileFirst?: boolean;
}) {
  return (
    <aside
      className={`relative z-10 w-full shrink-0 border-white/20 bg-[#070707] px-[16px] pt-[28px] pb-[36px] lg:w-[841px] lg:border-l lg:px-[100px] lg:pt-[49px] lg:pb-[60px] ${
        mobileFirst ? "order-first border-b lg:order-none lg:border-b-0" : "border-t lg:border-t-0"
      }`}
    >
      {children}
    </aside>
  );
}

/** Fileira do topo do painel: botão de referências + selo (o selo só no desktop). */
export function PanelReferencesRow({ referencesHref }: { referencesHref?: string | null }) {
  return (
    <div className="flex items-center justify-between gap-[25px]">
      <ReferencesButton href={referencesHref} />
      <span className="hidden lg:flex">
        <ReferencesBadge />
      </span>
    </div>
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

const REFERENCES_CLASS =
  "brand-ring flex h-[50px] w-full items-center justify-center gap-[10px] rounded-full bg-[image:var(--brand-surface-fill)] px-[12px] text-center font-poppins text-[13px] font-bold tracking-[0.16px] text-white transition-opacity hover:opacity-90 lg:w-[431px] lg:px-0 lg:text-[16px]";

/**
 * Botão "CONFIRA NOSSAS REFERÊNCIAS AQUI" — 431×50 no topo do painel.
 *
 * Leva ao vídeo de referências no YouTube (2026-10-20, pedido do usuário), o
 * mesmo do botão da home — `getReferencesVideoHref`, já montado no servidor.
 * Abre em OUTRA aba: no meio do checkout, sair da página jogaria fora o que a
 * pessoa preencheu. Sem link no painel, cai nas reviews da home.
 */
export function ReferencesButton({ href }: { href?: string | null }) {
  const content = (
    <>
      <Image
        src="/icons/checkout/crown.svg"
        alt=""
        width={22}
        height={22}
        aria-hidden
        className="size-[22px]"
      />
      CONFIRA NOSSAS REFERÊNCIAS AQUI
    </>
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={REFERENCES_CLASS}>
        {content}
      </a>
    );
  }
  return (
    <Link href="/#reviews" className={REFERENCES_CLASS}>
      {content}
    </Link>
  );
}
