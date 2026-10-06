import type { Block, BlockPropsMap, BlockType } from "./types";

/**
 * O CATÁLOGO de blocos: como cada tipo se chama, o que ele pede e como nasce.
 *
 * É daqui que o editor monta o formulário de um bloco (`fields`) e a biblioteca
 * de "adicionar bloco". Um tipo novo = uma entrada aqui + o componente que o
 * desenha em `blocks/` + o schema no backend. Nenhuma tela nova.
 *
 * Os campos são DECLARADOS, não desenhados à mão por bloco: é o que mantém a
 * experiência igual entre blocos e impede que um tipo novo nasça com um
 * formulário diferente de todos os outros.
 */

export type FieldSpec =
  | { kind: "text"; name: string; label: string; max: number; required?: boolean; placeholder?: string }
  | { kind: "textarea"; name: string; label: string; max: number; required?: boolean; rows?: number; hint?: string }
  | { kind: "select"; name: string; label: string; options: readonly { value: string; label: string }[] }
  | { kind: "image"; name: string; label: string; hint?: string }
  | { kind: "cta"; name: string; label: string }
  | { kind: "games"; name: string; label: string; hint?: string }
  | { kind: "game"; name: string; label: string }
  | { kind: "tab"; name: string; label: string; gameField: string }
  | { kind: "category"; name: string; label: string; gameField: string }
  | { kind: "number"; name: string; label: string; min: number; max: number }
  | { kind: "link"; name: string; label: string }
  | { kind: "video"; name: string; label: string }
  | {
      /**
       * LISTA de itens com sub-campos (perguntas, contadores, depoimentos).
       * Um só editor para todas as listas: adicionar, mover, remover — e o
       * item novo nasce de `newItem`, sempre com id próprio.
       */
      kind: "items";
      name: string;
      label: string;
      itemLabel: string;
      min: number;
      max: number;
      fields: SubFieldSpec[];
      newItem: () => Record<string, unknown> & { id: string };
    };

/** Campo DENTRO de um item de lista. */
export type SubFieldSpec =
  | { kind: "text"; name: string; label: string; max: number; required?: boolean }
  | { kind: "textarea"; name: string; label: string; max: number; required?: boolean; rows?: number }
  | { kind: "rating"; name: string; label: string }
  | { kind: "image"; name: string; label: string; hint?: string };

export type BlockDefinition<T extends BlockType = BlockType> = {
  type: T;
  label: string;
  description: string;
  fields: FieldSpec[];
  defaults: () => BlockPropsMap[T];
};

/** Nome de cada sessão ATUAL da home, como o cliente a reconhece. */
export const LEGACY_LABELS: Record<string, string> = {
  hero: "Hero (carrossel de jogos)",
  navegacao: "Contadores e atalhos",
  video: "Vídeo",
  reviews: "Reviews",
  equipe: "Equipe",
  guias: "Guias",
  faq: "Dúvidas",
};

export const BLOCKS: { [K in BlockType]: BlockDefinition<K> } = {
  secao: {
    type: "secao",
    label: "Seção existente",
    description: "Uma das seções atuais da home, com o desenho original.",
    fields: [],
    defaults: () => ({ key: "hero" }),
  },
  hero: {
    type: "hero",
    label: "Destaque",
    description: "Título grande, texto, imagem e botão.",
    fields: [
      { kind: "text", name: "eyebrow", label: "Chamada acima do título", max: 60, placeholder: "NOVIDADE" },
      { kind: "text", name: "title", label: "Título", max: 120, required: true },
      { kind: "textarea", name: "subtitle", label: "Texto", max: 300, rows: 3 },
      { kind: "image", name: "image", label: "Imagem", hint: "1200×900 (4:3), PNG ou JPG até 5 MB. Aparece à direita no computador." },
      { kind: "cta", name: "cta", label: "Botão" },
      {
        kind: "select",
        name: "align",
        label: "Alinhamento do texto",
        options: [
          { value: "left", label: "À esquerda" },
          { value: "center", label: "Centralizado" },
        ],
      },
    ],
    defaults: () => ({
      title: "Sua loja de gamecoins",
      subtitle: "Entrega rápida, pagamento seguro e atendimento de verdade.",
      align: "left",
    }),
  },
  textImage: {
    type: "textImage",
    label: "Texto e imagem",
    description: "Um bloco de texto com imagem ao lado.",
    fields: [
      { kind: "text", name: "title", label: "Título", max: 120, required: true },
      {
        kind: "textarea",
        name: "body",
        label: "Texto",
        max: 4000,
        required: true,
        rows: 6,
        hint: "Deixe uma linha em branco para começar outro parágrafo.",
      },
      { kind: "image", name: "image", label: "Imagem", hint: "1200×900 (4:3), PNG ou JPG até 5 MB." },
      {
        kind: "select",
        name: "imageSide",
        label: "Lado da imagem",
        options: [
          { value: "right", label: "Direita" },
          { value: "left", label: "Esquerda" },
        ],
      },
      { kind: "cta", name: "cta", label: "Botão" },
    ],
    defaults: () => ({
      title: "Por que comprar com a gente",
      body: "Escreva aqui o que torna a sua loja diferente.",
      imageSide: "right",
    }),
  },
  gameGrid: {
    type: "gameGrid",
    label: "Grade de jogos",
    description: "Cards dos jogos cadastrados, com link para cada página.",
    fields: [
      { kind: "text", name: "title", label: "Título", max: 120 },
      {
        kind: "games",
        name: "gameIds",
        label: "Jogos",
        hint: "Nenhum marcado = todos os jogos ativos, em ordem alfabética.",
      },
      {
        kind: "select",
        name: "columns",
        label: "Colunas no computador",
        options: [
          { value: "3", label: "3" },
          { value: "4", label: "4" },
          { value: "5", label: "5" },
          { value: "6", label: "6" },
        ],
      },
    ],
    defaults: () => ({ title: "Jogos", gameIds: [], columns: 5 }),
  },
  productGrid: {
    type: "productGrid",
    label: "Produtos",
    description: "Produtos de um jogo, filtrados por aba ou categoria.",
    fields: [
      { kind: "text", name: "title", label: "Título", max: 120 },
      { kind: "game", name: "gameId", label: "Jogo" },
      // Só abas CATALOG do jogo (serviço tem configurador próprio; LINK não tem produto).
      { kind: "tab", name: "tabSlug", label: "Aba", gameField: "gameId" },
      { kind: "category", name: "categoryId", label: "Categoria", gameField: "gameId" },
      { kind: "number", name: "limit", label: "Quantidade de produtos", min: 4, max: 24 },
      {
        kind: "select",
        name: "sort",
        label: "Ordem",
        options: [
          { value: "destaque", label: "Destaque (ordem da vitrine)" },
          { value: "preco-asc", label: "Menor preço" },
          { value: "preco-desc", label: "Maior preço" },
        ],
      },
    ],
    defaults: () => ({ title: "Mais vendidos", gameId: "", limit: 8, sort: "destaque" }),
  },
  faq: {
    type: "faq",
    label: "Perguntas",
    description: "Perguntas frequentes que abrem e fecham.",
    fields: [
      { kind: "text", name: "title", label: "Título", max: 120 },
      {
        kind: "items",
        name: "items",
        label: "Perguntas",
        itemLabel: "Pergunta",
        min: 1,
        max: 40,
        fields: [
          { kind: "text", name: "question", label: "Pergunta", max: 200, required: true },
          { kind: "textarea", name: "answer", label: "Resposta", max: 2000, required: true, rows: 3 },
        ],
        newItem: () => ({ id: newBlockId(), question: "Nova pergunta", answer: "Resposta" }),
      },
    ],
    defaults: () => ({
      title: "Dúvidas frequentes",
      items: [
        {
          id: newBlockId(),
          question: "Quanto tempo leva a entrega?",
          answer: "A maioria dos pedidos é entregue em poucos minutos.",
        },
      ],
    }),
  },
  // ── Fase 2 (2026-09-25) ──────────────────────────────────────────────────
  banner: {
    type: "banner",
    label: "Banner",
    description: "Uma imagem larga e clicável: campanha, promoção.",
    fields: [
      { kind: "image", name: "image", label: "Imagem (computador)", hint: "Larga, ex.: 1820×500." },
      { kind: "image", name: "mobileImage", label: "Imagem no celular (opcional)", hint: "Mais alta, ex.: 800×800. Sem ela, usa a do computador." },
      { kind: "text", name: "alt", label: "Descrição da imagem", max: 120, required: true, placeholder: "Promoção de Diablo IV" },
      { kind: "link", name: "link", label: "Ao clicar, leva para" },
    ],
    // Sem imagem o banner não desenha — o backend exige a arte. O admin sobe
    // logo depois de adicionar; até lá o rascunho mostra o aviso do servidor.
    defaults: () => ({ image: "", alt: "Banner" }),
  },
  video: {
    type: "video",
    label: "Vídeo",
    description: "Um vídeo do YouTube com título e legenda.",
    fields: [
      { kind: "text", name: "title", label: "Título", max: 120 },
      { kind: "video", name: "videoId", label: "Link do vídeo no YouTube" },
      { kind: "textarea", name: "caption", label: "Legenda", max: 300, rows: 2 },
    ],
    defaults: () => ({ title: "Conheça a loja", videoId: "" }),
  },
  stats: {
    type: "stats",
    label: "Contadores",
    description: "Números em destaque: clientes, anos, pedidos.",
    fields: [
      {
        kind: "items",
        name: "items",
        label: "Contadores",
        itemLabel: "Contador",
        min: 2,
        max: 6,
        fields: [
          { kind: "text", name: "value", label: "Número (ex.: +4000)", max: 12, required: true },
          { kind: "text", name: "label", label: "Legenda", max: 40, required: true },
        ],
        newItem: () => ({ id: newBlockId(), value: "+100", label: "Novo número" }),
      },
    ],
    defaults: () => ({
      items: [
        { id: newBlockId(), value: "+4000", label: "Clientes atendidos" },
        { id: newBlockId(), value: "+5", label: "Anos de experiência" },
        { id: newBlockId(), value: "24h", label: "Atendimento" },
      ],
    }),
  },
  reviews: {
    type: "reviews",
    label: "Depoimentos",
    description: "O que os clientes dizem, com nota em estrelas.",
    fields: [
      { kind: "text", name: "title", label: "Título", max: 120 },
      {
        kind: "items",
        name: "items",
        label: "Depoimentos",
        itemLabel: "Depoimento",
        min: 1,
        max: 12,
        fields: [
          { kind: "text", name: "name", label: "Nome", max: 60, required: true },
          { kind: "textarea", name: "text", label: "Depoimento", max: 600, required: true, rows: 3 },
          { kind: "rating", name: "rating", label: "Nota" },
          { kind: "image", name: "avatar", label: "Foto (opcional)", hint: "Quadrada, 80×80." },
        ],
        newItem: () => ({ id: newBlockId(), name: "Cliente", text: "Excelente atendimento!", rating: 5 }),
      },
    ],
    defaults: () => ({
      title: "O que dizem nossos clientes",
      items: [{ id: newBlockId(), name: "Cliente", text: "Entrega muito rápida, recomendo!", rating: 5 }],
    }),
  },
  richText: {
    type: "richText",
    label: "Texto formatado",
    description: "Texto longo com títulos, negrito, listas e links.",
    fields: [
      { kind: "text", name: "title", label: "Título", max: 120 },
      {
        kind: "textarea",
        name: "body",
        label: "Texto",
        max: 8000,
        required: true,
        rows: 10,
        hint: "## Título · ### Subtítulo · **negrito** · *itálico* · - item de lista · 1. lista numerada · [texto do link](/venda ou https://…)",
      },
    ],
    defaults: () => ({
      title: "Como funciona",
      body: "## Compre em 3 passos\n\n1. Escolha o jogo e o produto\n2. Pague com **PIX ou cartão**\n3. Receba no jogo\n\nDúvidas? Veja a página de [fidelidade](/fidelidade).",
    }),
  },
  cta: {
    type: "cta",
    label: "Chamada",
    description: "Faixa com título, texto e um botão em destaque.",
    fields: [
      { kind: "text", name: "title", label: "Título", max: 120, required: true },
      { kind: "textarea", name: "text", label: "Texto", max: 300, rows: 2 },
      { kind: "cta", name: "cta", label: "Botão" },
      {
        kind: "select",
        name: "tone",
        label: "Cor",
        options: [
          { value: "orange", label: "Laranja (destaque)" },
          { value: "dark", label: "Escura" },
        ],
      },
    ],
    defaults: () => ({
      title: "Pronto para subir de nível?",
      text: "Veja as ofertas da semana.",
      cta: { label: "Ver ofertas", link: { kind: "path", path: "/venda" } },
      tone: "orange",
    }),
  },
};

/** Tipos que o cliente pode ADICIONAR pela biblioteca (o legado entra à parte). */
export const LIBRARY_TYPES: Exclude<BlockType, "secao">[] = [
  "hero",
  "banner",
  "textImage",
  "richText",
  "gameGrid",
  "productGrid",
  "stats",
  "reviews",
  "video",
  "cta",
  "faq",
];

/**
 * Id de bloco/item: aleatório, curto e no formato que o backend aceita
 * (`/^[A-Za-z0-9_-]{6,40}$/`). Gerado no navegador para o editor poder
 * referenciar o bloco antes de ele ser salvo.
 */
export function newBlockId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}

export function createBlock<T extends BlockType>(type: T, props?: BlockPropsMap[T]): Block<T> {
  return {
    id: newBlockId(),
    type,
    props: props ?? BLOCKS[type].defaults(),
  } as Block<T>;
}

/** Rótulo curto do bloco na lista do editor. */
export function blockTitle(block: Block, legacyLabels: Record<string, string> = LEGACY_LABELS): string {
  if (block.type === "secao") return legacyLabels[block.props.key] ?? block.props.key;
  const def = BLOCKS[block.type];
  const title = "title" in block.props ? block.props.title?.trim() : "";
  return title ? `${def.label}: ${title}` : def.label;
}

/** Vão acima do bloco, em pixels, por opção de espaçamento. */
export const SPACING_PX = { sm: 40, md: 80, lg: 140 } as const;
