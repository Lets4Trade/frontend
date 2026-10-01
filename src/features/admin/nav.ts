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
  /** Quem vê o item. Ausente = só ADMIN (padrão fechado para item novo). */
  roles?: readonly ("ADMIN" | "EDITOR")[];
};

export const ADMIN_NAV: readonly AdminNavItem[] = [
  {
    label: "Vendas e pedidos",
    href: "/admin/pedidos",
    match: ["/admin/pedidos"],
  },
  {
    // Aponta para a LISTAGEM, não para o cadastro: é dali que se vê o que
    // existe, e os dois botões de cadastrar ("Cadastrar Produto" e "Cadastrar
    // Game") estão no topo dela. Entrar direto num formulário em branco seria
    // começar pelo meio.
    label: "Produtos",
    href: "/admin/produtos",
    match: ["/admin/produtos"],
  },
  // NÃO está no arquivo do Figma: o CRUD de jogos ganhou tela própria em
  // 2026-09-28 (antes o cadastro ficava sob "Produtos" e editar/excluir, só no
  // Builder). Só ADMIN — o EDITOR mexe na página do jogo, não no catálogo.
  //
  // Desde 2026-09-30 (admin-games-ux.md, Etapa 1) é também a porta do Builder
  // de cada jogo para o ADMIN — por isso acende em `/admin/builder`.
  { label: "Jogos", href: "/admin/jogos", match: ["/admin/jogos", "/admin/builder"] },
  // NÃO está no arquivo do Figma: o atendimento (popup de contato + Discord) foi
  // pedido em 2026-09-15. Ao lado de pedidos porque é o mesmo trabalho.
  { label: "Chats", href: "/admin/chats", match: ["/admin/chats"] },
  {
    // Desde 2026-09-15 a edição é NA PRÓPRIA PÁGINA (`/admin/paginas`). O
    // formulário antigo (`/admin/sessoes`) foi aposentado em 2026-10-01 — a rota
    // só redireciona, e por isso ainda acende este item.
    label: "Páginas",
    href: "/admin/paginas",
    match: ["/admin/paginas", "/admin/sessoes"],
    roles: ["ADMIN", "EDITOR"],
  },
  // NÃO está no arquivo do Figma: o blog (contrato blog.md, 2026-09-28). É
  // conteúdo, então o EDITOR também vê — ao lado de "Páginas".
  {
    label: "Notícias",
    href: "/admin/noticias",
    match: ["/admin/noticias"],
    roles: ["ADMIN", "EDITOR"],
  },
  // NÃO está no Figma (2026-10-01): WhatsApp, logo, CNPJ e redes estavam
  // escondidos como "sessões" de Páginas → Cabeçalho e rodapé. Mesmos cargos de
  // antes (o EDITOR já editava esses campos lá).
  {
    label: "Configurações",
    href: "/admin/configuracoes",
    match: ["/admin/configuracoes"],
    roles: ["ADMIN", "EDITOR"],
  },
  { label: "Usuários", href: "/admin/usuarios", match: ["/admin/usuarios"] },
  // Só o EDITOR vê (2026-09-30, admin-games-ux.md): para o ADMIN o item
  // duplicava a lista de Jogos — lixeira inclusive —, e `/admin/builder`
  // redireciona para lá. O EDITOR não enxerga "Jogos" (é catálogo, só ADMIN),
  // então para ele esta continua sendo a única porta do Builder.
  {
    label: "Builder de Page",
    href: "/admin/builder",
    match: ["/admin/builder"],
    roles: ["EDITOR"],
  },
  // NÃO está no arquivo do Figma: as cinco abas desenhadas não incluem logs. A
  // tela foi pedida depois, e sem item de menu ela seria inalcançável.
  { label: "Logs", href: "/admin/logs", match: ["/admin/logs"] },
];
