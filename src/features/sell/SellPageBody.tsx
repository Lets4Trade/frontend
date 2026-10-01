import Image from "next/image";
// Import ESTÁTICO do mascote (e não a string "/images/..."): a URL leva hash
// do conteúdo, então trocar a arte invalida o cache sozinho. Ver o histórico
// em `app/venda/page.tsx`.
import mascote from "../../../public/images/venda-mascote.png";
import { CopyRow } from "@/components/ui/CopyRow";
import { getContacts } from "@/features/site/contacts";
import { getSectionItemsFor, getSectionsFor } from "@/features/site/content";
import { SellForm } from "./SellForm";

const SECTION_HEADING =
  "font-helvetica text-[30px] leading-[26px] font-bold tracking-[0.3px] text-white";

/**
 * O MIOLO da tela "Venda pra nós" (Figma 2030:995): título, formulário e o
 * card de contato. Saiu de `app/venda/page.tsx` em 2026-09-25 para ser uma
 * "seção do desenho" no construtor de páginas — a mesma peça aparece na página
 * real e na prévia do editor, e blocos novos podem entrar antes ou depois dela.
 *
 * Desde 2026-09-30 também é o layout SELL de uma aba de jogo (Figma 1798:772):
 * com `game`, o formulário nasce com o jogo da página escolhido e o título
 * "VENDA PRA NÓS" + divisor saem — a página do jogo já tem o próprio título e
 * as abas logo acima.
 */
export async function SellPageBody({ game }: { game?: { slug: string; name: string } } = {}) {
  // O título vem da tela "Edição de sessões"; vazio devolve o do arquivo.
  const [section, items, contacts] = await Promise.all([
    getSectionsFor("venda"),
    getSectionItemsFor("venda"),
    getContacts(),
  ]);

  /**
   * Os canais do card "Contato Rápido" vêm de "Cabeçalho e rodapé → Contato e
   * atendimento". Eram uma constante com o placeholder `+55 11 90000-0000` —
   * número inventado no ar, na tela de quem quer vender para a loja. Canal não
   * preenchido não aparece.
   */
  const channels = [
    contacts.whatsapp && {
      icon: "/icons/social/whatsapp.svg",
      label: "WhatsApp",
      value: contacts.whatsapp.value,
    },
    contacts.discord && {
      icon: "/icons/social/discord.svg",
      label: "Discord",
      value: contacts.discord.value,
    },
  ].filter((channel) => Boolean(channel)) as {
    icon: string;
    label: string;
    value: string;
  }[];

  /**
   * Os dois subtítulos das colunas, editados como LISTA em "Edição de sessões".
   *
   * Lista e não dois campos fixos porque são o mesmo tipo de texto repetido — e
   * porque uma terceira coluna, se aparecer, não exige coluna nova no banco.
   * A posição na lista é a coluna: o primeiro item titula o formulário, o
   * segundo o contato.
   */
  const blocos = items("blocos");
  const tituloFormulario = blocos[0]?.title || "Suas Informações";
  const tituloContato = blocos[1]?.title || "Contato Rápido";

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

      {/* 63px até os títulos de seção — medido no design (divisor em 101,
          títulos em 165). É o único vão da tela que foge dos 25px. Dentro do
          jogo não há divisor: o vão é o da página. `minmax(0, …)` para as
          colunas encolherem em vez de estourar a faixa. Dentro do jogo o par fica
          CENTRALIZADO na faixa de 1715 (Figma 1798:772: formulário em x=363). */}
      <div
        className={`${game ? "lg:justify-center " : "mt-[63px] "}grid items-stretch gap-[50px] lg:grid-cols-[minmax(0,780px)_minmax(0,365px)]`}
      >
        <section className="flex flex-col">
          <h2 className={SECTION_HEADING}>{tituloFormulario}</h2>

          <div className="mt-[25px] flex-1 rounded-[30px] border border-white/10 bg-brand-surface p-[25px] sm:p-[50px]">
            <SellForm game={game} />
          </div>
        </section>

        <section className="flex flex-col">
          <h2 className={SECTION_HEADING}>{tituloContato}</h2>

          <div className="relative mt-[25px] flex-1 overflow-hidden rounded-[30px] border border-white/10 bg-brand-surface px-[25px] pt-[50px] pb-[303px]">
            <div className="flex flex-col gap-[25px]">
              {channels.map((channel) => (
                <CopyRow
                  key={channel.label}
                  icon={channel.icon}
                  iconSize={20}
                  label={channel.label}
                  value={channel.value}
                />
              ))}

              {/* Sem canal cadastrado o card diz isso, em vez de ficar vazio
                  sob o título "Contato Rápido". */}
              {channels.length === 0 ? (
                <p className="font-poppins text-[14px] leading-[22px] text-brand-fg-subtle">
                  Nossos canais de atendimento aparecem aqui em breve.
                  Enquanto isso, envie o formulário ao lado que entramos em
                  contato.
                </p>
              ) : null}
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
    </>
  );
}
