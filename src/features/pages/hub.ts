import type { HubGroup } from "./PagesHub";

const page = (slug: string) => `/admin/paginas?pagina=${encodeURIComponent(slug)}`;

/**
 * As linhas de "Páginas" (2026-10-01, versão "clean" aprovada pelo usuário):
 * uma linha por página, cada uma abrindo UM editor.
 *
 * O que saiu, de propósito:
 *   - o segundo cartão da Home ("editar no desenho"): a Home abre direto em
 *     "Textos e imagens" e tem a aba "Organizar seções" — um lugar só;
 *   - uma linha por JOGO: a página de cada jogo se edita em Jogos (Central);
 *   - Configurações da loja: já está no menu.
 */
export function hubGroups(): HubGroup[] {
  return [
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
}
