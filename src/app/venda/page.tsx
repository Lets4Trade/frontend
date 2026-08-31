import type { Metadata } from "next";
import Image from "next/image";
// Import ESTÁTICO do mascote (e não a string "/images/..."). O Next passa a
// servir o arquivo por uma URL com hash do conteúdo, então TROCAR a arte
// invalida o cache sozinho. Com a string literal a URL nunca muda e o
// `minimumCacheTTL` de 31 dias do next.config.ts mantém a versão velha viva
// no navegador — foi exatamente o que aconteceu aqui.
import mascote from "../../../public/images/venda-mascote.png";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { CopyRow } from "@/components/ui/CopyRow";
import { SellForm } from "@/features/sell/SellForm";

export const metadata: Metadata = {
  title: "Venda pra nós | Lets4Trade",
  description:
    "Venda suas gamecoins, contas e itens para a Lets4Trade. Envie seus dados e entramos em contato.",
};

/** Contatos do card lateral. Trocar pelos canais reais quando definidos. */
const CONTATOS = [
  {
    icon: "/icons/social/whatsapp.svg",
    iconSize: 20,
    label: "WhatsApp",
    value: "+55 11 90000-0000",
  },
  {
    icon: "/icons/social/discord.svg",
    iconSize: 20,
    label: "Discord",
    value: "lets4trade",
  },
] as const;

const SECTION_HEADING =
  "font-helvetica text-[30px] leading-[26px] font-bold tracking-[0.3px] text-white";

/**
 * Tela "Venda pra nós" — Figma nó 2030:995.
 *
 * O nó é um frame de 1295×995 com o conteúdo já enquadrado; header e footer não
 * fazem parte dele, então reuso os do site para a página ficar consistente com
 * /login e /criar-conta. O fundo do frame (Rectangle 17) é um retângulo com
 * backdrop-blur sem fill visível — sobre o preto da página ele não muda nada,
 * por isso não virou asset. O "Efeito 15" também ficou de fora: no design ele
 * está inteiramente fora da área visível (x de -610 a -111) e é recortado pelo
 * `overflow-clip` do frame.
 *
 * Diferença de borda em relação aos cards de autenticação: aqui é branco a
 * **10%**, lá é 15%.
 */
export default function VendaPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-brand-bg">
      <SiteHeader />

      <main className="flex-1">
        <div className="mx-auto max-w-[1295px] px-4 py-[50px] lg:px-[50px]">
          <h1 className={SECTION_HEADING}>VENDA PRA NÓS</h1>

          <hr className="mt-[25px] border-0 border-t border-brand-hairline" />

          {/* 63px até os títulos de seção — medido no design (divisor em 101,
              títulos em 165). É o único vão da tela que foge dos 25px. */}
          <div className="mt-[63px] grid items-stretch gap-[50px] lg:grid-cols-[780px_365px]">
            <section className="flex flex-col">
              <h2 className={SECTION_HEADING}>Suas Informações</h2>

              <div className="mt-[25px] flex-1 rounded-[30px] border border-white/10 bg-brand-surface p-[25px] sm:p-[50px]">
                <SellForm />
              </div>
            </section>

            <section className="flex flex-col">
              <h2 className={SECTION_HEADING}>Contato Rápido</h2>

              <div className="relative mt-[25px] flex-1 overflow-hidden rounded-[30px] border border-white/10 bg-brand-surface px-[25px] pt-[50px] pb-[303px]">
                <div className="flex flex-col gap-[25px]">
                  {CONTATOS.map((contato) => (
                    <CopyRow
                      key={contato.label}
                      icon={contato.icon}
                      iconSize={contato.iconSize}
                      label={contato.label}
                      value={contato.value}
                    />
                  ))}
                </div>

                {/* Mascote ancorado no rodapé do card. `pb-[303px]` acima
                    reserva a altura dele para o conteúdo nunca passar por baixo.

                    `object-contain`: a caixa do design tem proporção 1.158 e a
                    arte enviada tem 1.045 — com o `fill` padrão do CSS a imagem
                    esticava ~11% na horizontal.

                    `drop-shadow` e não `box-shadow`: no Figma a sombra segue o
                    ALFA da imagem, enquanto o `box-shadow` do CSS desenha sempre
                    no retângulo do elemento — o que deixaria uma moldura visível
                    em volta de um PNG recortado. O raio vira ~metade do blur do
                    Figma (36.1 → 18): as duas ferramentas medem desfoque de
                    formas diferentes. */}
                <Image
                  src={mascote}
                  alt=""
                  aria-hidden
                  className="pointer-events-none absolute bottom-0 left-[11px] h-[303px] w-[351px] object-contain object-bottom"
                  style={{
                    filter: "drop-shadow(0 -9px 18px rgba(255,255,255,0.19))",
                  }}
                />
              </div>
            </section>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
