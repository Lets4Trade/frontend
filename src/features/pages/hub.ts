import type { HubGroup } from "./PagesHub";

const page = (slug: string) => `/admin/paginas?pagina=${encodeURIComponent(slug)}`;

/**
 * As linhas de "Páginas" (2026-10-01, versão "clean" aprovada pelo usuário):
 * uma linha por página, cada uma abrindo UM editor.
 *
 * O que saiu, de propósito:
 *   - o segundo cartão da Home ("editar no desenho"): a Home abre direto em
 *     "Textos e imagens" e tem a aba "Organizar seções" — um lugar só;
 *   - Configurações da loja: já está no menu.
 *
 * As linhas por JOGO VOLTARAM em 2026-10-09 (relato do usuário): o painel
 * manda "editar a página do jogo em Páginas" (Builder → Ordem, Central →
 * "Blocos e ordem") e aqui não havia jogo nenhum. Cada linha abre o mesmo
 * Construtor que a Central abre; logo, abas e produtos continuam na Central.
 */
export function hubGroups(games: readonly { id: string; name: string }[] = []): HubGroup[] {
  const groups: HubGroup[] = [
    {
      title: "Loja",
      cards: [
        {
          href: "/admin/paginas/desenho?pagina=home",
          title: "Home",
          description: "Banner, contadores, vídeo, reviews, equipe, guias e dúvidas.",
        },
        { href: page("venda"), title: "Venda pra nós", description: "Título e textos do formulário de venda." },
        { href: page("fidelidade"), title: "Fidelidade", description: "Textos da página de níveis e benefícios." },
      ],
    },
    {
      title: "Em todas as páginas",
      cards: [
        { href: page("cabecalho"), title: "Cabeçalho", description: "Botões do topo, texto da busca e selo “+1000 referências”." },
        { href: page("rodape"), title: "Rodapé", description: "Colunas de links e o texto sobre a loja." },
      ],
    },
    {
      title: "Outros",
      cards: [
        {
          href: page("jogos-compartilhado"),
          title: "Textos comuns dos jogos",
          description: "Referências, notícias e dúvidas que aparecem em todos os jogos.",
        },
        { href: page("legal"), title: "Termos e privacidade", description: "Termos de Uso e Política de Privacidade." },
      ],
    },
  ];

  if (games.length > 0) {
    groups.splice(2, 0, {
      title: "Páginas dos jogos",
      cards: games.map((game) => ({
        href: page(`jogo-${game.id}`),
        title: game.name,
        description: "Ordem dos blocos e blocos extras (banner, vídeo, destaques). Logo, abas e produtos: em Jogos.",
      })),
    });
  }
  return groups;
}
