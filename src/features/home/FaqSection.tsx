import Image from "next/image";
import { editItem } from "@/features/site/editing/attrs";
import type { SectionItemView } from "@/features/site/content";

export function FaqSection({
  title = "DÚVIDAS SOBRE A EMPRESA",
  items = [],
}: {
  title?: string;
  items?: SectionItemView[];
}) {
  return (
    <section
      aria-labelledby="faq-title"
      className="relative min-h-[800px] w-[1820px] overflow-hidden rounded-[30px] border border-white/20 bg-black/10 backdrop-blur-[100px]"
    >
      {/* Arte à direita (Figma 617:830 → "Image Container" 617:838) e o render
          que a sobrepõe (852:109). A ordem importa: o render vem depois para
          ficar por cima. */}
      <Image
        src="/images/home/faq-arte.webp"
        alt=""
        width={708}
        height={428}
        aria-hidden
        className="faq-art pointer-events-none absolute top-[184.34px] left-[1005.63px] h-[428.1px] w-[707.81px] object-cover"
      />
      {/* No arquivo o render é RECORTADO pela sua caixa: a imagem é maior que
          ela e sobe 19,51%, cortando a parte de baixo. `object-contain` numa
          caixa do tamanho da moldura mostraria a arte inteira, encolhida. */}
      <span
        aria-hidden
        /**
         * Ancorada no RODAPÉ, não no topo.
         *
         * No arquivo ela está em y=594 de uma moldura de 800 e mede 254 — ou
         * seja, sangra 48px para fora da borda de baixo, que o `overflow-hidden`
         * recorta. Presa ao topo, ela flutuava no MEIO da moldura assim que uma
         * resposta longa fazia a seção crescer.
         *
         * `-bottom-[48px]` reproduz o mesmo recorte em qualquer altura.
         */
        className="pointer-events-none absolute -bottom-[48px] left-[893px] block h-[254px] w-[206.17px] overflow-hidden"
      >
        <Image
          src="/images/home/faq-personagens.webp"
          alt=""
          width={214}
          height={321}
          className="absolute top-[-19.51%] left-[-1.62%] h-[126.44%] w-[103.85%] max-w-none"
        />
      </span>

      {/*
        ── A COLUNA DE CONTEÚDO EMPURRA A ALTURA ──────────────────────────────
        Título e perguntas ficavam em posição absoluta (y=51 e y=168), copiada do
        arquivo. Com as dúvidas vindo do banco isso quebrava: elemento absoluto
        não ocupa espaço no fluxo, então a moldura ficava presa nos 800px e o
        `overflow-hidden` CORTAVA a resposta longa.

        Agora os dois fluem dentro desta coluna, e a moldura cresce com eles. Os
        recuos são os mesmos do arquivo: 100px de lado, 51 até o título, e o vão
        até a primeira pergunta que fecha os 168 originais (51 de recuo + a
        altura do título + 18 = 168, medido na tela, não estimado).

        As ARTES seguem absolutas — elas são decorativas e o arquivo as ancora na
        moldura, não no texto.
      */}
      <div className="relative px-[100px] pt-[51px] pb-[60px]">
        {/* No arquivo o título é UMA linha ocupando os 894px da caixa; com a
            Poppins SemiBold real ele mede 885 e cabe. */}
        <h2
          id="faq-title"

          data-edit-field="home:faq:title"
          className="w-[894px] text-center font-poppins text-[65px] leading-[normal] font-semibold tracking-[0.325px] whitespace-nowrap text-white"
        >
          {title}
        </h2>

        {/*
        ── As perguntas deixaram de ter y fixo ────────────────────────────────
        No arquivo cada pergunta tem a própria coordenada (168, 352, 482, 619) —
        o vão varia porque a altura da resposta varia, e cada uma foi posta à
        mão. Com as dúvidas vindo do banco isso não se sustenta: a quinta não
        teria coordenada, e editar uma resposta mudaria a altura dela sem mudar
        a posição da seguinte — elas se sobreporiam.

        Agora empilham, com o vão médio do arquivo (45px entre pergunta e
        resposta, 40px entre blocos). A moldura começa onde a primeira começava.

        Decidido com o usuário em 2026-09-10: CRUD completo vale a perda das
        posições.
      */}
        <dl className="mt-[18px] w-[796px]">
          {items.map((item, index) => (
            <div key={item.id} className={index > 0 ? "mt-[27px]" : undefined}>
              <dt
                {...editItem("home:faq", item.id, "title")}
                className="w-[601px] font-helvetica text-[20px] leading-[normal] font-bold tracking-[0.2px] text-white"
              >
                {item.title}
              </dt>
              <dd
                {...editItem("home:faq", item.id, "body")}
                className="mt-[25px] font-helvetica text-[18px] leading-[normal] tracking-[0.18px] text-brand-placeholder"
              >
                {/* Linha em branco separa parágrafos — é como a resposta foi
                  importada e como o campo do painel a mostra. */}
                {item.body.split(/\n\s*\n/).map((paragraph, i) => (
                  <p
                    key={paragraph.slice(0, 32)}
                    className={i > 0 ? "mt-[9px]" : undefined}
                  >
                    {paragraph}
                  </p>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
