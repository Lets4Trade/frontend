import type { ReactNode } from "react";
import { GlowBar } from "@/components/layout/GlowBar";
import { cn } from "@/lib/cn";

/**
 * Moldura das telas de cadastro do painel — "CADASTRO DE JOGO" (Figma
 * 4468:1792) e "CADASTRO DE PRODUTO" (Figma 3806:6735).
 *
 * As duas são o MESMO card fora o título e os campos: 1510×606 em x=213, y=267
 * (184px abaixo do cabeçalho de 83px), raio 30, preenchimento #0A0A0A a 10%,
 * traço branco a 20% e a faixa de brilho no topo. Extraído quando a segunda
 * chegou, pelo mesmo motivo do `CheckoutShell`: duplicar a moldura é como as
 * duas começam a divergir num pixel que ninguém percebe.
 *
 * O `backdrop-filter: blur(200px)` que o arquivo põe no retângulo NÃO é
 * reproduzido, e é decisão: atrás dele só existe preto chapado, então o
 * desfoque não muda um pixel — mas desfoque de raio grande é refeito pelo
 * compositor a cada repaint. Foi o que travou o renderizador na primeira versão
 * do checkout.
 *
 * `overflow-x-auto` com o conteúdo em `w-max`: o card tem largura fixa e não
 * encolhe (são quatro colunas de 315px medidas), então em tela menor quem cede
 * é a rolagem deste bloco — nunca a página inteira, que voltaria a ter a barra
 * horizontal que a home levou uma sessão para perder.
 * `auto-fit` com `minmax(0,315px)` em vez de quatro colunas fixas: em
 * 1920 dá exatamente as quatro colunas de 315px do arquivo, e abaixo disso
 * ele passa a três, duas e uma — em vez de estourar a moldura.
 */
export function AdminFormCard({
  title,
  headingId,
  children,
}: {
  title: string;
  /** Liga o `<h1>` ao `aria-labelledby` da seção. */
  headingId: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[1920px] px-[50px] pt-[184px] pb-[207px]">
      <section
        aria-labelledby={headingId}
        className="relative mx-auto w-full max-w-[1510px] rounded-[30px] border border-white/20 bg-[#0a0a0a]/10 py-[50px]"
      >
          <GlowBar className="-top-[2px]" />

          <h1
            id={headingId}
            className="px-[50px] font-helvetica text-[30px] leading-[26px] font-bold tracking-[0.3px] text-white"
          >
            {title}
          </h1>

          {/* No arquivo esta linha vai de x=35 a x=1458 — 35px de recuo à
              esquerda e 52 à direita. A assimetria é do desenho; aqui ela é
              simétrica em 35, porque 17px numa linha de 1px não se veem e uma
              medida torta se propagaria para quem copiasse este bloco. */}
          <hr className="mx-[35px] mt-[25px] border-0 border-t border-white/10" />

        {children}
      </section>
    </div>
  );
}

/**
 * A grade de campos das duas telas: quatro colunas de 315px com 50px de vão,
 * começando a 50px da borda do card — exatamente os x = 50, 415, 780 e 1145 do
 * arquivo. O vão vertical de 49px é a distância entre a base de um campo e a
 * label do de baixo.
 *
 * FLUXO e não posição absoluta, apesar de o arquivo ser absoluto: nas duas
 * telas sobra área visivelmente reservada para campos que ainda virão. Em
 * fluxo, um campo novo entra e o card cresce; em coordenada fixa, cada campo
 * novo é um recálculo de todas as medidas abaixo dele.
 */
export function AdminFieldGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(0,315px))] gap-x-[50px] gap-y-[49px]">
      {children}
    </div>
  );
}

/**
 * Rodapé do formulário: o botão de 315px e as mensagens de erro e de sucesso.
 *
 * Os 156px até o botão são a medida do arquivo nas duas telas. O vão não é
 * sobra de layout — é o espaço reservado para os campos que ainda vão entrar.
 */
export function AdminFormActions({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mt-[156px] flex w-[315px] flex-col gap-3", className)}>
      {children}
    </div>
  );
}
