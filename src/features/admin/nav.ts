import type { PanelArea } from "./permissions";

/**
 * Abas do cabeçalho administrativo (Figma 4468:1879).
 *
 * `href` nulo = seção desenhada no arquivo mas que ainda NÃO existe. Elas
 * aparecem porque o cabeçalho do design as tem, mas não navegam e não fingem
 * ser link: um item que devolve 404 ensina a pessoa a desconfiar do menu
 * inteiro. Quando a seção existir, é só preencher o `href` aqui.
 */
export type AdminNavItem = {
  label: string;
  href: string | null;
  /**
   * Prefixos de rota que acendem o item. São vários porque uma seção do
   * cabeçalho cobre mais de uma tela: "Produtos" é onde vivem tanto o cadastro
   * de jogo quanto o de produto, e o arquivo desenha as duas com a mesma aba
   * acesa.
   */
  match?: readonly string[];
  /** Área do painel do item (`permissions.ts`): quem não tem a área não vê o item. */
  area: PanelArea;
};

export const ADMIN_NAV: readonly AdminNavItem[] = [
  {
    label: "Vendas e pedidos",
    href: "/admin/pedidos",
    match: ["/admin/pedidos"],
    area: "orders",
  },
  {
    // Aponta para a LISTAGEM, não para o cadastro: é dali que se vê o que
    // existe, e os dois botões de cadastrar ("Cadastrar Produto" e "Cadastrar
    // Game") estão no topo dela. Entrar direto num formulário em branco seria
    // começar pelo meio.
    label: "Produtos",
    href: "/admin/produtos",
    match: ["/admin/produtos"],
    area: "catalog",
  },
  // NÃO está no Figma (2026-10-23): o que chega pelo formulário "Venda pra
  // nós". ADMIN e ATENDENTE (área de pedidos) — é contato com cliente.
  { label: "Propostas", href: "/admin/propostas", match: ["/admin/propostas"], area: "orders" },
  // NÃO está no Figma (2026-10-12): cupons de desconto. Só ADMIN — cupom é
  // dinheiro que a loja deixa de receber.
  { label: "Cupons", href: "/admin/cupons", match: ["/admin/cupons"], area: "promotions" },
  // NÃO está no arquivo do Figma: o CRUD de jogos ganhou tela própria em
  // 2026-09-28 (antes o cadastro ficava sob "Produtos" e editar/excluir, só no
  // Builder). ADMIN e EDITOR — o catálogo é do EDITOR também desde 2026-10-16.
  //
  // Desde 2026-09-30 (admin-games-ux.md, Etapa 1) é também a porta do Builder
  // de cada jogo para o ADMIN — por isso acende em `/admin/builder`.
  { label: "Jogos", href: "/admin/jogos", match: ["/admin/jogos", "/admin/builder"], area: "catalog" },
  // NÃO está no arquivo do Figma: o atendimento (popup de contato + Discord) foi
  // pedido em 2026-09-15. Ao lado de pedidos porque é o mesmo trabalho.
  { label: "Chats", href: "/admin/chats", match: ["/admin/chats"], area: "support" },
  {
    // Desde 2026-09-15 a edição é NA PRÓPRIA PÁGINA (`/admin/paginas`). O
    // formulário antigo (`/admin/sessoes`) foi aposentado em 2026-10-01 — a rota
    // só redireciona, e por isso ainda acende este item.
    label: "Páginas",
    href: "/admin/paginas",
    match: ["/admin/paginas", "/admin/sessoes"],
    area: "content",
  },
  // NÃO está no arquivo do Figma: o blog (contrato blog.md, 2026-09-28). É
  // conteúdo, então o EDITOR também vê — ao lado de "Páginas".
  {
    label: "Blog",
    href: "/admin/blog",
    match: ["/admin/blog"],
    area: "content",
  },
  // NÃO está no Figma (2026-10-01): WhatsApp, logo, CNPJ e redes estavam
  // escondidos como "sessões" de Páginas → Cabeçalho e rodapé. Mesmos cargos de
  // antes (o EDITOR já editava esses campos lá).
  {
    label: "Configurações",
    href: "/admin/configuracoes",
    match: ["/admin/configuracoes"],
    area: "content",
  },
  { label: "Usuários", href: "/admin/usuarios", match: ["/admin/usuarios"], area: "users" },
  // "Builder de Page" (só do EDITOR desde 2026-09-30) saiu em 2026-10-16: o
  // EDITOR passou a ter a lista de Jogos, que já leva ao Builder de cada jogo.
  // NÃO está no arquivo do Figma: as cinco abas desenhadas não incluem logs. A
  // tela foi pedida depois, e sem item de menu ela seria inalcançável.
  { label: "Logs", href: "/admin/logs", match: ["/admin/logs"], area: "logs" },
];
