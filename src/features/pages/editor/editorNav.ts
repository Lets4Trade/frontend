/**
 * Navegação dos editores de página — PURA, sem "use client": a página do
 * desenho (servidor) e os editores (cliente) chamam as duas funções. Ficavam
 * em `EditorHeader.tsx` e o servidor não pode chamar função de arquivo client.
 */
export type EditorTab = { label: string; href: string; active: boolean };

/** As abas de modo de uma página. Só a Home tem edição no desenho. */
export function editorTabs(slug: string, mode: "desenho" | "organizar"): EditorTab[] | undefined {
  if (slug !== "home") return undefined;
  return [
    { label: "Textos e imagens", href: "/admin/paginas/desenho?pagina=home", active: mode === "desenho" },
    { label: "Organizar seções", href: "/admin/paginas?pagina=home", active: mode === "organizar" },
  ];
}

/** Para onde o "voltar" leva: página de jogo volta ao jogo; o resto, à lista. */
export function editorBack(slug: string): { href: string; label: string } {
  if (slug.startsWith("jogo-")) return { href: `/admin/jogos/${encodeURIComponent(slug.slice(5))}`, label: "Voltar ao jogo" };
  return { href: "/admin/paginas", label: "Páginas" };
}
