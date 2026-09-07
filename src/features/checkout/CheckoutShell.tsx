import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/layout/SiteFooter";

/**
 * Moldura das telas de compra: checkout (Figma 2568:1505) e acompanhamento do
 * pedido (2569:1682).
 *
 * As duas são a MESMA página fora o miolo — mesmo cabeçalho, mesmo brilho, mesma
 * faixa de 1920 e mesmo rodapé. Extraída quando a segunda chegou: duplicar o
 * cabeçalho é como as duas telas começam a divergir.
 *
 * CABEÇALHO REDUZIDO, e é o arquivo que pede: 1077px (só a faixa da esquerda) e
 * só o logo — sem busca, menu ou carrinho. É o padrão de checkout, e existe para
 * não oferecer saídas no meio do pagamento.
 *
 * ELE FICA POR BAIXO DO PAINEL DA DIREITA, e isso é o que resolve a emenda que
 * aparecia antes. No arquivo, cabeçalho (1077) e painel (841) somam os 1920
 * exatos e nunca se tocam. A nossa moldura é elástica — encolhe até 1600 —,
 * então em qualquer largura menor que 1918 os dois se sobrepõem. Com o
 * cabeçalho por baixo, quem ganha a faixa é o painel, que é o que o desenho
 * mostra; com ele por cima, sobrava um retângulo escuro atravessando o painel.
 */
export function CheckoutShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-brand-bg">
      <main className="flex-1 overflow-x-auto">
        <div className="relative mx-auto w-full max-w-[1920px] min-w-[1600px]">
          {/* Brilho do arquivo (2568:1508): sangra para fora à esquerda, o que
              aparece é a borda dele.

              GRADIENTE RADIAL, e não `filter: blur()`. É a mesma regra que a
              home já seguia: desfoque de raio grande é refeito pelo compositor a
              cada repaint, e num raio de 120px sobre uma área desse tamanho ele
              trava o renderizador. Um gradiente é desenhado uma vez. */}
          <div
            aria-hidden
            className="pointer-events-none absolute top-[200px] -left-[360px] h-[600px] w-[600px]"
            style={{
              background:
                "radial-gradient(circle, rgba(91,46,166,0.55) 0%, rgba(91,46,166,0.22) 45%, rgba(0,0,0,0) 70%)",
            }}
          />

          {/* `z-0` explícito, e não a ausência de z-index: sem ele o cabeçalho
              é o único elemento POSICIONADO da camada e pintaria por cima do
              painel, que é um bloco comum. O painel declara `z-10` do outro
              lado (ver `CheckoutSidePanel`). */}
          <header className="absolute top-0 left-0 z-0 flex h-[83px] w-[1077px] items-center bg-black/50 px-[50px] backdrop-blur-[9px]">
            <Link href="/" aria-label="Lets4Trade — início">
              <Image
                src="/images/lets4trade-logo.png"
                alt=""
                width={138}
                height={65}
                priority
                aria-hidden
                className="h-[65px] w-[138px] object-contain"
              />
            </Link>
          </header>

          {children}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
