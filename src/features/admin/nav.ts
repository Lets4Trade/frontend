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
};

export const ADMIN_NAV: readonly AdminNavItem[] = [
  { label: "Vendas e pedidos", href: null },
  {
    // Aponta para a LISTAGEM, não para o cadastro: é dali que se vê o que
    // existe, e os dois botões de cadastrar ("Cadastrar Produto" e "Cadastrar
    // Game") estão no topo dela. Entrar direto num formulário em branco seria
    // começar pelo meio.
    label: "Produtos",
    href: "/admin/produtos",
    match: ["/admin/produtos", "/admin/jogos"],
  },
  { label: "Edição de sessões", href: null },
  { label: "Usuários", href: "/admin/usuarios", match: ["/admin/usuarios"] },
  { label: "Builder de Page", href: null },
  // NÃO está no arquivo do Figma: as cinco abas desenhadas não incluem logs. A
  // tela foi pedida depois, e sem item de menu ela seria inalcançável.
  { label: "Logs", href: "/admin/logs", match: ["/admin/logs"] },
];
