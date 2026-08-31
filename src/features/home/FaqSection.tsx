import Image from "next/image";

/**
 * Bloco "DÚVIDAS SOBRE A EMPRESA" (Figma 590:751 — "Frame 21", 1820×800).
 *
 * É um painel único de raio 30 com fundo preto a 10%, contorno branco a 20% e
 * desfoque de fundo (valores do "Rectangle 17", 590:743, lidos no inspector) —
 * repare que o contorno aqui é o DOBRO do usado nos cards das outras seções.
 *
 * As perguntas não têm espaçamento regular entre si (168, 352, 482, 619): o vão
 * depende do tamanho da resposta anterior. Por isso cada bloco carrega o seu
 * `top` do arquivo em vez de sair de um `space-y`.
 */
const FAQ = [
  {
    question: "Há quanto tempo vocês atuam no Mercado de Games?",
    questionTop: 168,
    answerTop: 213,
    paragraphs: [
      "Atuamos no mercado há 5 anos. O que começou como uma atividade paralela se profissionalizou rapidamente devido ao sucesso e à confiança dos clientes.",
      "Hoje, a Lets 4 Trade é minha dedicação exclusiva. Desde 2023, somos uma empresa formalmente constituída, com CNPJ ativo e operando em total conformidade com a legislação vigente.",
    ],
  },
  {
    question: "Qual a Missão da Empresa?",
    questionTop: 352,
    answerTop: 397,
    paragraphs: [
      "A Missão da Lets 4 Trade é otimizar a experiência de jogo dos nossos clientes. Queremos simplificar a rotina de games para pessoas com tempo limitado, garantindo que o momento de lazer seja leve, tranquilo e que elas consigam aproveitar o máximo que cada jogo tem a oferecer.",
    ],
  },
  {
    question: "Qual a Visão da Empresa?",
    questionTop: 482,
    answerTop: 527,
    paragraphs: [
      "A Visão da Lets 4 Trade é ser reconhecida como a maior e mais confiável referência do Brasil no segmento de moedas virtuais e serviços de Boosting (ou Booster), ditando o padrão de excelência na experiência do usuário.",
    ],
  },
  {
    question: "Quais os Valores da Empresa?",
    questionTop: 619,
    answerTop: 664,
    paragraphs: [
      "A Lets 4 Trade se baseia na Transparência e na Sinceridade total com o cliente, buscando criar um ambiente onde ele se sinta à vontade (“em casa”) para conversar, tirar dúvidas e realizar suas compras. Entendemos que os jogos são um meio de lazer essencial para aliviar a pesada rotina do dia a dia, e o nosso maior valor é simplificar e potencializar ainda mais essa atividade prazerosa para todos os gamers.",
    ],
  },
];

export function FaqSection() {
  return (
    <section
      aria-labelledby="faq-title"
      className="relative h-[800px] w-[1820px] overflow-hidden rounded-[30px] border border-white/20 bg-black/10 backdrop-blur-[40px]"
    >
      {/* Arte à direita (Figma 617:830, "Big Image") e o render que a sobrepõe
          (852:109). A ordem importa: o render vem depois para ficar por cima. */}
      <Image
        src="/images/home/faq-arte.png"
        alt=""
        width={717}
        height={439}
        aria-hidden
        className="faq-art pointer-events-none absolute top-[180.4px] left-[1003px] h-[438.6px] w-[717px] rounded-[30px] object-cover"
      />
      <Image
        src="/images/home/faq-personagens.png"
        alt=""
        width={206}
        height={254}
        aria-hidden
        className="pointer-events-none absolute top-[594px] left-[893px] h-[254px] w-[206.17px] object-contain"
      />

      {/* `whitespace-nowrap`: no arquivo o título é UMA linha ocupando os 894px
          da caixa. A Poppins do navegador renderiza alguns pixels mais larga e
          quebrava em duas, jogando a segunda linha por cima da primeira
          pergunta (que tem posição fixa em y=168). */}
      <h2
        id="faq-title"
        className="absolute top-[51px] left-[100px] w-[894px] font-poppins text-[65px] leading-[normal] font-semibold tracking-[0.325px] whitespace-nowrap text-white"
      >
        DÚVIDAS SOBRE A EMPRESA
      </h2>

      <dl className="contents">
        {FAQ.map((item) => (
          <div key={item.question} className="contents">
            <dt
              className="absolute left-[100px] w-[601px] font-helvetica text-[20px] leading-[normal] font-bold tracking-[0.2px] text-white"
              style={{ top: item.questionTop }}
            >
              {item.question}
            </dt>
            <dd
              className="absolute left-[100px] w-[796px] font-helvetica text-[18px] leading-[normal] tracking-[0.18px] text-brand-placeholder"
              style={{ top: item.answerTop }}
            >
              {item.paragraphs.map((paragraph, index) => (
                <p key={paragraph.slice(0, 32)} className={index > 0 ? "mt-[9px]" : undefined}>
                  {paragraph}
                </p>
              ))}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
