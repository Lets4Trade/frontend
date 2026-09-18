import type { MaskKind } from "@/lib/masks";

/**
 * O catálogo de PÁGINAS e SESSÕES do site — a tela "Edição de sessões"
 * (Figma 3806:7081).
 *
 * ── Por que o catálogo vive no CÓDIGO ──────────────────────────────────────
 * Cada sessão corresponde a um bloco que EXISTE: o hero da home é
 * `features/home/HeroSection.tsx`, a seção de guias é `GuidesSection.tsx`. Não
 * dá para inventar "Home - Banner 7" num formulário sem alguém escrever o
 * componente que a desenha — e um select oferecendo sessões que não renderizam
 * em lugar nenhum é pior que um select curto.
 *
 * O banco guarda só o que o admin PERSONALIZOU (título e arte), numa linha por
 * sessão. Ausente significa "como o código declarou". É a mesma convenção do
 * Builder de Páginas, e foi o que dispensou migrar dado das páginas existentes.
 *
 * ── O que NÃO está aqui ────────────────────────────────────────────────────
 * As páginas de JOGO (`/games/[slug]`). Elas têm o Builder de Páginas, com
 * model próprio e nove etapas — decidido com o usuário que os escopos são
 * separados. Repetir banner e título aqui seria duas telas gravando no mesmo
 * lugar, discordando na primeira divergência.
 */

/**
 * Como uma seção com LISTA chama seus campos.
 *
 * O banco guarda os itens em colunas genéricas (`title`, `body`, `imageUrl`,
 * `secondaryImageUrl`, `href`) porque as cinco listas têm a mesma forma — ver o
 * model `SiteSectionItem`. O que muda é o NOME de cada campo em cada seção:
 * "nome" e "depoimento" no review, "pergunta" e "resposta" na dúvida.
 *
 * Esse nome vive aqui, junto do resto do que a seção declara, e é o que o
 * formulário do painel usa como rótulo. Campo com rótulo `undefined` não aparece
 * no formulário — é assim que "Equipe" mostra só nome e foto, sem um "corpo"
 * vazio que nada desenha.
 */
export type SiteListDef = {
  /** Como um item se chama, no singular ("review", "membro"). */
  itemLabel: string;
  /** Rótulo do texto curto. Ausente = a seção não usa. */
  title?: string;
  /** Rótulo do texto longo. */
  body?: string;
  /** Rótulo da arte principal, com a medida esperada. */
  image?: string;
  /** Rótulo da segunda arte. */
  secondaryImage?: string;
  /** Rótulo do link. */
  href?: string;
};

export type SiteSectionDef = {
  /** Sufixo da chave. A chave cheia é `${pageKey}:${key}`. */
  key: string;
  /** Como a sessão se chama no select. */
  label: string;
  /**
   * Se a sessão tem um TÍTULO editável. Ausente = tem (é o caso da maioria).
   *
   * Existe para as sessões cujo conteúdo é só uma lista ou só um parágrafo: o
   * campo de título aparecia em TODAS, e nelas ele gravava um valor que nenhum
   * componente lia. É o mesmo defeito que o usuário apontou em "Home - Hero" —
   * campo que salva e não faz efeito é pior que campo ausente.
   */
  hasTitle?: boolean;
  /** O título padrão, quando o bloco tem um. */
  defaultTitle?: string;
  /**
   * Como a sessão chama seus três textos curtos e o longo.
   *
   * O formulário do painel rotula "Alterar título da sessão", "Subtítulo" e
   * "Legenda", que servem enquanto a sessão tem UM título e variações dele. Não
   * servem quando os três textos são coisas diferentes — nos botões do
   * cabeçalho, título/subtítulo/legenda são GAMES, CRIAR CONTA e ACESSAR CONTA,
   * e quem edita não teria como adivinhar qual é qual.
   *
   * É a mesma ideia do `SiteListDef`, que já nomeia os campos de cada lista.
   */
  titleLabel?: string;
  subtitleLabel?: string;
  footnoteLabel?: string;
  /**
   * Máscara de entrada de cada texto curto no painel (ver `lib/masks.ts`) —
   * telefone e CNPJ digitados já formatados, como no resto do site.
   */
  titleMask?: MaskKind;
  subtitleMask?: MaskKind;
  bodyLabel?: string;
  /**
   * As duas linhas curtas extras, quando o bloco as tem — subtítulo e uma
   * legenda menor. Declarar aqui é o que faz o campo APARECER no formulário:
   * seção sem subtítulo não ganha um campo vazio que nada desenha.
   */
  defaultSubtitle?: string;
  defaultFootnote?: string;
  /**
   * O texto LONGO padrão. Declarar aqui faz o campo aparecer no formulário.
   *
   * Só a "Equipe" tem um hoje — e por isso ele mora em `TeamSection`, não aqui:
   * são quase mil caracteres, e o catálogo guarda rótulos. O que fica aqui é a
   * DECLARAÇÃO de que a seção tem esse campo.
   */
  hasBody?: boolean;
  defaultBody?: string;
  /**
   * Se a sessão aceita ARTE.
   *
   * Nem toda aceita, e o critério é estreito de propósito: só entra aqui a
   * seção cuja imagem principal é grande o bastante para alguém querer trocá-la
   * por outra. "Equipe" e "Guias" têm renders decorativos de 86 e 157 pixels —
   * oferecer "Imagem do Banner" ali faria alguém subir uma arte de 1715×490 que
   * apareceria como um selo minúsculo no canto.
   *
   * Campo que promete um efeito que não acontece é pior que campo ausente.
   */
  hasImage: boolean;
  /**
   * O que a arte substitui, e em que medida. Aparece sob o campo — o rótulo do
   * arquivo diz só "Imagem do Banner", e cada seção tem uma proporção própria.
   */
  imageHint?: string;
  /**
   * A seção tem uma LISTA de itens que o admin adiciona, remove e reordena.
   *
   * Ausente = seção de conteúdo fixo, com título e talvez arte. Presente, o
   * painel mostra o editor de itens abaixo do formulário da seção.
   */
  list?: SiteListDef;
  /**
   * A sessão É a fileira de ABAS da loja, e não um bloco de conteúdo.
   *
   * As abas (GOLD, MOEDAS, MENTORIA…) moram numa tabela própria (`NavTab`),
   * gravam no CLIQUE e aparecem em toda página de jogo. Até 2026-09-14 a
   * fileira ficava fixa na tela, fora de qualquer sessão — como o Figma
   * 3806:7081 desenha —, e aparecia com "Home - Reviews" ou "Cabeçalho ·
   * Botões" escolhidos, sugerindo que fazia parte deles e que o SALVAR logo
   * abaixo a gravava. Nenhuma das duas coisas era verdade.
   *
   * Marcada assim, a sessão não mostra título, banner nem SALVAR: só a fileira.
   */
  navTabs?: boolean;
};

export type SitePageDef = {
  key: string;
  label: string;
  /** A rota, para o link de "ver a página". */
  href: string;
  sections: SiteSectionDef[];
};

/**
 * As páginas fixas da loja e os blocos de cada uma.
 *
 * Saiu do que os arquivos realmente montam hoje (`app/page.tsx`,
 * `app/venda/page.tsx`, `app/fidelidade/page.tsx`) — não de uma lista desejada.
 * Bloco novo no código entra aqui junto; é o único jeito de a tela continuar
 * dizendo a verdade.
 */
export const SITE_PAGES: readonly SitePageDef[] = [
  {
    key: "home",
    label: "Home",
    href: "/",
    sections: [
      {
        key: "hero",
        label: "Hero",
        // A legenda sob o banner ("Sua Loja de Gamecoins"). O bloco NÃO tinha
        // título editável: o campo salvava e nada o desenhava — o defeito que o
        // usuário apontou. Agora é esta legenda.
        defaultTitle: "Sua Loja de Gamecoins",
        hasImage: true,
        imageHint: "Arte do topo da home — 859×758.",
        list: {
          itemLabel: "slide",
          title: "Nome do jogo",
          image: "Personagem (recorte, ~336×758)",
          secondaryImage: "Logo do jogo",
          href: "Link do slide",
        },
      },
      {
        // Os DOIS contadores da faixa ("+4000 CLIENTES ATENDIDOS", "+5 ANOS DE
        // EXPERIÊNCIA"). Eram fixos no código — inclusive com "EXPÊRIENCIA"
        // escrito errado no ar, que agora dá para corrigir sem deploy.
        key: "navegacao",
        label: "Contadores",
        // Nada lê o título desta seção: ela é só a lista dos dois contadores.
        hasTitle: false,
        hasImage: false,
        list: {
          itemLabel: "contador",
          title: "Número (ex.: +4000)",
          body: "Legenda (ex.: CLIENTES ATENDIDOS)",
        },
      },
      {
        key: "video",
        label: "Vídeo",
        // O título do arquivo quebra em duas linhas ("CLIENTES 100% /
        // SATISFEITOS"). Aqui ele é uma string só — a quebra vira uma quebra de
        // linha de verdade no campo, e o componente a respeita.
        defaultTitle: "CLIENTES 100%\nSATISFEITOS",
        hasImage: true,
        imageHint: "Capa do vídeo — 1146×609.",
        // O LINK do vídeo mora na legenda (`footnote`), com rótulo próprio. O
        // botão de play existia e não fazia nada: não havia vídeo nenhum. Vazio,
        // a capa aparece sem o botão — play que não toca é promessa falsa.
        // Só YouTube é aceito; ver `features/home/youtube.ts`.
        defaultFootnote: "",
        footnoteLabel: "Link do vídeo (YouTube)",
      },
      {
        key: "reviews",
        label: "Reviews",
        defaultTitle: "NOSSAS REVIEWS",
        defaultSubtitle: "O que nossos clientes falam de nós?",
        // O contador acima do carrossel. É uma AFIRMAÇÃO de marketing (515), não
        // o número de cards — por isso é texto editável e não `items.length`.
        defaultFootnote: "515 Reviews",
        hasImage: false,
        list: {
          itemLabel: "review",
          title: "Nome de quem avaliou",
          body: "Depoimento",
          image: "Avatar (quadrado)",
        },
      },
      // O render da equipe tem 86×86 — é ornamento, não banner. Ver `hasImage`.
      {
        key: "equipe",
        label: "Equipe",
        defaultTitle: "EQUIPE LETS 4 TRADE",
        defaultSubtitle:
          "Especialistas no que há de melhor no mercado relacionado a ARPGs",
        // O parágrafo de apresentação. O texto padrão vive em `TeamSection` —
        // são quase mil caracteres.
        hasBody: true,
        hasImage: false,
        list: {
          itemLabel: "membro",
          title: "Nome",
          image: "Foto (recorte vertical, ~261×316)",
        },
      },
      // Mesmo caso da equipe: o render tem 157×171.
      {
        key: "guias",
        label: "Guias",
        defaultTitle: "GUIAS POPULARES",
        hasImage: false,
        list: {
          itemLabel: "guia",
          title: "Título do guia",
          body: "Texto",
          image: "Arte de fundo",
          secondaryImage: "Logo do jogo",
          href: "Link do guia",
        },
      },
      {
        key: "faq",
        label: "Dúvidas",
        defaultTitle: "DÚVIDAS SOBRE A EMPRESA",
        hasImage: false,
        list: {
          itemLabel: "pergunta",
          title: "Pergunta",
          // Linha em branco separa parágrafos — é como a resposta foi importada
          // e como o componente a divide de volta.
          body: "Resposta (linha em branco separa parágrafos)",
        },
      },
    ],
  },
  {
    key: "venda",
    label: "Venda pra nós",
    href: "/venda",
    sections: [
      {
        key: "formulario",
        label: "Título da página",
        defaultTitle: "VENDA PRA NÓS",
        hasImage: false,
      },
      {
        // Os subtítulos das duas colunas do formulário ("Suas Informações" e
        // "Contato Rápido"), que estavam fixos no código.
        key: "blocos",
        label: "Subtítulos do formulário",
        // Idem: a seção é a lista dos dois subtítulos, sem título próprio.
        hasTitle: false,
        hasImage: false,
        list: {
          itemLabel: "subtítulo",
          title: "Texto do subtítulo",
        },
      },
    ],
  },
  {
    key: "fidelidade",
    label: "Fidelidade",
    href: "/fidelidade",
    sections: [
      {
        // A legenda sob o nome do nível ("Ganhe mais benefícios"). O resto do
        // painel é DADO do cliente (saldo, cashback, progresso) e não se edita
        // — a seção existia sem nada editável, e salvar não fazia efeito nenhum.
        key: "resumo",
        label: "Resumo da conta",
        defaultTitle: "Ganhe mais benefícios",
        hasImage: false,
      },
      {
        key: "niveis",
        label: "Níveis",
        defaultTitle: "Todos os Níveis",
        hasImage: false,
      },
    ],
  },
  {
    /**
     * Os blocos COMPARTILHADOS da página de jogo.
     *
     * ── Por que eles estão aqui e não no Builder ───────────────────────────
     * Porque não são de nenhum jogo em particular: referências, notícias e
     * dúvidas são o mesmo conteúdo em `/games/diablo` e em
     * `/games/path-of-exile-2`. Foi o que `features/game/seed.ts` já dizia
     * ("quase nada aqui é específico de um jogo").
     *
     * O Builder cuida do que é de CADA jogo — arte, título, abas, servidores,
     * categorias, descrição e a ORDEM em que estes blocos aparecem. Esta tela
     * cuida do que eles DIZEM. Os dois escopos continuam sem se sobrepor.
     */
    key: "games",
    label: "Página de jogo (todos)",
    href: "/games",
    sections: [
      {
        // Primeira da lista porque é a primeira coisa da página de jogo, logo
        // abaixo do banner. Nada é gravado em `SiteSectionContent` com esta
        // chave — as abas têm tabela e rota próprias.
        key: "abas",
        label: "Abas da loja",
        hasTitle: false,
        hasImage: false,
        navTabs: true,
      },
      {
        key: "referencias",
        label: "Referências",
        defaultTitle: "REFERÊNCIAS",
        hasImage: false,
        list: {
          itemLabel: "referência",
          title: "Nome de quem avaliou",
          body: "Depoimento",
          image: "Avatar (quadrado)",
        },
      },
      {
        key: "noticias",
        label: "Notícias",
        defaultTitle: "NOTÍCIAS",
        hasImage: false,
        list: {
          itemLabel: "notícia",
          title: "Manchete",
          body: "Resumo",
          image: "Arte da notícia",
          href: "Link da notícia",
        },
      },
      // As perguntas saíram de `features/game/seed.ts`, onde só o TÍTULO do
      // primeiro grupo era editável — e, nos jogos de Path of Exile, o primeiro
      // grupo era o de Orbs, então o campo "Dúvidas" renomeava o grupo errado.
      // Agora cada grupo é uma seção, com título e perguntas próprios.
      {
        key: "duvidas-orbs",
        label: "Dúvidas sobre Orbs",
        // Aparece só nos jogos de Path of Exile (`ORBS_GAMES` em
        // `features/game/content.ts`), ACIMA do grupo geral.
        defaultTitle: "Dúvidas sobre Orbs",
        hasImage: false,
        list: { itemLabel: "pergunta", title: "Pergunta", body: "Resposta" },
      },
      {
        key: "duvidas",
        label: "Dúvidas frequentes",
        defaultTitle: "Dúvidas frequentes",
        hasImage: false,
        list: { itemLabel: "pergunta", title: "Pergunta", body: "Resposta" },
      },
    ],
  },
  {
    /**
     * O CABEÇALHO e o RODAPÉ — a moldura que envolve todas as páginas.
     *
     * ── Por que é uma "página" no select ──────────────────────────────────
     * Porque o select é o único eixo que a tela do arquivo oferece, e estes
     * blocos não pertencem a página nenhuma: aparecem na home, na venda, na
     * vitrine, no login e no painel. Chamá-los de "Home - Rodapé" seria mentir
     * em nove telas para acertar em uma.
     *
     * ── Por que isto era urgente ──────────────────────────────────────────
     * O rodapé estava NO AR com o placeholder do Figma: três colunas de
     * "CATEGORIA" / "NOME DA PAGE 1" apontando para `#`, as seis redes sociais
     * sem link e um parágrafo de Lorem Ipsum. Trocar qualquer um deles exigia
     * deploy.
     *
     * ── O custo, e como ele é pago ────────────────────────────────────────
     * Diferente das outras páginas, estes blocos renderizam em TODA requisição
     * do site. A leitura é cacheada com invalidação por TAG (ver
     * `layoutContent.ts`): o backend é consultado uma vez por hora, e a
     * escrita do painel derruba o cache na hora.
     */
    key: "layout",
    label: "Cabeçalho e rodapé",
    href: "/",
    sections: [
      {
        key: "marca",
        label: "Logo da marca",
        // Uma seção só para os dois lugares: é o MESMO arquivo hoje
        // (`/images/lets4trade-logo.png`), desenhado em 138×65 no cabeçalho e
        // 174×82 no rodapé. Duas seções obrigariam a subir a mesma arte duas
        // vezes para não deixar os dois lados discordando.
        hasTitle: false,
        hasImage: true,
        imageHint:
          "Cabeçalho (138×65) e rodapé (174×82). O arquivo atual é quadrado com margens transparentes, que a caixa recorta.",
      },
      {
        // Os canais de atendimento OFICIAIS, num lugar só. Antes o WhatsApp de
        // "Venda pra nós" era o placeholder `+55 11 90000-0000` e o botão
        // "fechar pelo WhatsApp" do checkout apontava para `#`: dois lugares,
        // dois erros. Quem lê: `/venda` (card "Contato Rápido") e `/checkout`.
        //
        // SEM valor padrão, de propósito: número inventado no ar é pior que
        // canal ausente. Vazio, o canal simplesmente não aparece.
        key: "contatos",
        label: "Contato e atendimento",
        defaultTitle: "",
        // Curto: a coluna do título tem 315px e o rótulo longo vazava do card.
        titleLabel: "WhatsApp (DDI + DDD)",
        titleMask: "phone",
        defaultSubtitle: "",
        subtitleLabel: "Discord (usuário ou link de convite)",
        hasImage: false,
      },
      {
        key: "header-selo",
        label: "Cabeçalho · Selo",
        // O "+1000 REFERÊNCIAS" centrado. O número usa o degradê laranja
        // recortado no texto; a legenda, branco. São dois textos e não um
        // porque o arquivo os desenha em tamanhos e cores diferentes.
        defaultTitle: "+1000",
        titleLabel: "Número do selo",
        defaultSubtitle: "REFERÊNCIAS",
        subtitleLabel: "Legenda do selo",
        hasImage: false,
      },
      {
        key: "header-busca",
        label: "Cabeçalho · Busca",
        defaultTitle: "O que você busca?",
        titleLabel: "Texto de exemplo do campo",
        hasImage: false,
      },
      {
        key: "header-acoes",
        label: "Cabeçalho · Botões",
        // Os três rótulos. Cada um tem nome próprio no formulário: "título",
        // "subtítulo" e "legenda" não diriam a ninguém qual botão é qual.
        defaultTitle: "GAMES",
        titleLabel: "Botão da esquerda",
        defaultSubtitle: "CRIAR CONTA",
        subtitleLabel: "Botão de cadastro",
        defaultFootnote: "ACESSAR CONTA",
        footnoteLabel: "Botão de login",
        hasImage: false,
      },
      {
        key: "footer-redes",
        label: "Rodapé · Redes sociais",
        hasTitle: false,
        hasImage: false,
        list: {
          itemLabel: "rede",
          title: "Nome da rede (lido por leitor de tela)",
          // O ícone é upload, e não uma escolha numa lista fixa, porque a
          // decisão foi poder ADICIONAR uma rede que ainda não existe aqui.
          // SVG não é aceito de propósito — ver `ImageStorageService`.
          image: "Ícone (PNG ou WebP com fundo transparente, ~96px)",
          href: "Link do perfil",
        },
      },
      // Três colunas, três seções. O model de item é PLANO (um item tem título,
      // texto, artes e link — não uma lista dentro dele), então uma seção só
      // não daria conta de "três colunas com três links cada". Três seções
      // também é o que permite dar um nome próprio a cada coluna.
      // Os títulos padrão NÃO são o "CATEGORIA" do arquivo: aquilo era
      // placeholder, e o próprio arquivo o marcava como tal. A semente enche as
      // duas primeiras colunas com as páginas que EXISTEM, e um cabeçalho
      // dizendo "CATEGORIA" sobre elas seria trocar um placeholder por outro.
      {
        key: "footer-coluna-1",
        label: "Rodapé · Coluna 1",
        defaultTitle: "LOJA",
        titleLabel: "Título da coluna",
        hasImage: false,
        list: { itemLabel: "link", title: "Rótulo", href: "Destino" },
      },
      {
        key: "footer-coluna-2",
        label: "Rodapé · Coluna 2",
        defaultTitle: "CONTA",
        titleLabel: "Título da coluna",
        hasImage: false,
        list: { itemLabel: "link", title: "Rótulo", href: "Destino" },
      },
      // A terceira nasce VAZIA — e coluna sem link nenhum não é desenhada. Não
      // há uma terceira família de páginas hoje (ajuda, termos, política não
      // existem); inventar links para elas seria devolver ao rodapé os destinos
      // mortos que esta mudança veio tirar.
      {
        key: "footer-coluna-3",
        label: "Rodapé · Coluna 3",
        defaultTitle: "AJUDA",
        titleLabel: "Título da coluna",
        hasImage: false,
        list: { itemLabel: "link", title: "Rótulo", href: "Destino" },
      },
      {
        // Identificação da empresa no pé do rodapé (pedido em 2026-09-17).
        // Quatro dados, os quatro textos da sessão — cada um com rótulo
        // próprio, como nos botões do cabeçalho.
        //
        // CNPJ, telefone e e-mail SEM padrão: dado de empresa inventado no ar é
        // pior que ausente (mesma regra de "Contato e atendimento"). Vazio, a
        // linha não aparece. O copyright tem padrão, com `{ano}` trocado pelo
        // ano corrente na renderização — ninguém precisa lembrar de editar em
        // janeiro.
        key: "footer-empresa",
        label: "Rodapé · Dados da empresa",
        defaultTitle: "",
        titleLabel: "CNPJ",
        titleMask: "cnpj",
        defaultSubtitle: "",
        subtitleLabel: "Telefone (DDI + DDD)",
        subtitleMask: "phone",
        defaultFootnote: "",
        footnoteLabel: "E-mail de contato",
        hasBody: true,
        defaultBody: "© {ano} Lets4Trade. Todos os direitos reservados.",
        bodyLabel: "Copyright (use {ano} para o ano atual)",
        hasImage: false,
      },
      {
        key: "footer-sobre",
        label: "Rodapé · Texto",
        // SEM texto padrão, de propósito: o que estava no código era Lorem
        // Ipsum, e manter um placeholder como "padrão" é garantir que ele volte
        // a aparecer toda vez que alguém limpar o campo. Vazio, o parágrafo
        // simplesmente não é desenhado.
        hasTitle: false,
        hasBody: true,
        bodyLabel: "Parágrafo do rodapé",
        hasImage: false,
      },
    ],
  },
  {
    /**
     * TERMOS DE USO e POLÍTICA DE PRIVACIDADE.
     *
     * O cadastro sempre disse "ao criar sua conta, você aceita os Termos de Uso
     * e a Política de Privacidade" e linkava para `/termos` e
     * `/politica-de-privacidade` — que não existiam. Aceite de documento que
     * não existe não vale nada, e na LGPD a política precisa estar acessível.
     *
     * ── Por que o documento é uma LISTA de cláusulas ──────────────────────
     * O texto longo de uma sessão tem teto de 4.000 caracteres, e um documento
     * jurídico passa disso com folga. Cada cláusula como item (título + texto
     * de até 2.000) cabe no model que já existe, sem migration, e ainda dá ao
     * documento os subtítulos que ele precisa ter para ser lido.
     *
     * ⚠️ O CONTEÚDO não vem de nós: é texto jurídico e tem que ser escrito ou
     * revisado por quem responde por ele. As páginas nascem sem cláusula e
     * dizem isso.
     */
    key: "legal",
    label: "Termos e privacidade",
    href: "/termos",
    sections: [
      {
        key: "termos",
        label: "Termos de Uso",
        defaultTitle: "Termos de Uso",
        titleLabel: "Título da página",
        // Documento legal precisa dizer de quando é. Texto livre e não data
        // automática: corrigir uma vírgula não é uma nova versão dos termos.
        defaultFootnote: "",
        footnoteLabel: "Última atualização (ex.: 14 de setembro de 2026)",
        hasImage: false,
        list: { itemLabel: "cláusula", title: "Título da cláusula", body: "Texto" },
      },
      {
        key: "privacidade",
        label: "Política de Privacidade",
        defaultTitle: "Política de Privacidade",
        titleLabel: "Título da página",
        defaultFootnote: "",
        footnoteLabel: "Última atualização (ex.: 14 de setembro de 2026)",
        hasImage: false,
        list: { itemLabel: "cláusula", title: "Título da cláusula", body: "Texto" },
      },
    ],
  },
];

/** Chave cheia de uma sessão. É o que vai para o banco. */
export function sectionKey(pageKey: string, key: string) {
  return `${pageKey}:${key}`;
}

const PAGES_BY_KEY = new Map(SITE_PAGES.map((page) => [page.key, page]));

export function sitePage(key: string): SitePageDef | undefined {
  return PAGES_BY_KEY.get(key);
}

/**
 * Encontra a definição de uma sessão pela chave cheia.
 *
 * `undefined` para chave desconhecida — uma linha de um bloco que saiu do
 * código não pode derrubar a tela, ela só deixa de aparecer.
 */
export function siteSection(full: string): { page: SitePageDef; section: SiteSectionDef } | undefined {
  const separator = full.indexOf(":");
  if (separator < 0) return undefined;

  const page = PAGES_BY_KEY.get(full.slice(0, separator));
  if (!page) return undefined;

  const suffix = full.slice(separator + 1);
  const section = page.sections.find((item) => item.key === suffix);
  return section ? { page, section } : undefined;
}

/** Todas as chaves válidas — o que o backend aceita gravar. */
export const ALL_SECTION_KEYS: readonly string[] = SITE_PAGES.flatMap((page) =>
  page.sections.map((section) => sectionKey(page.key, section.key)),
);
