/**
 * O CAMINHO de um item na loja (2026-10-23, pedido do usuário): "Path of Exile
 * 2 / Moedas / Forbidden Rites / Orbes / Raras" = Jogo / Aba / Servidor /
 * Categoria / Subcategoria. Vai embaixo do "6x Fracturing Orb" nas telas do
 * pedido (cliente, pagamento, chat do painel e "Informações de compra").
 *
 * Tudo congelado na compra. Pedido antigo (de antes de 2026-10-23) não tem aba
 * nem categoria — sai "Jogo / Servidor". Peças vazias somem, e o servidor que
 * é só o nome do jogo (produto sem servidor) não repete.
 *
 * Módulo PURO (servidor e cliente).
 */
export type ItemPathParts = {
  gameName?: string | null;
  tabLabel?: string | null;
  platform?: string | null;
  categoryLabel?: string | null;
  subcategoryLabel?: string | null;
};

export function itemPath(item: ItemPathParts): string {
  const clean = (value: string | null | undefined) => (typeof value === "string" ? value.trim() : "");
  const game = clean(item.gameName);
  const server = clean(item.platform);
  const parts = [
    game,
    toTitle(clean(item.tabLabel)),
    server === game ? "" : server,
    clean(item.categoryLabel),
    clean(item.subcategoryLabel),
  ].filter(Boolean);
  return parts.join(" / ");
}

/**
 * As abas são cadastradas em CAIXA ALTA ("MOEDAS") porque é assim que aparecem
 * nos botões da página do jogo; no caminho, junto de nomes normais, vira
 * "Moedas". Aba com caixa mista fica como foi escrita.
 */
function toTitle(label: string): string {
  if (!label || label !== label.toUpperCase()) return label;
  return label
    .toLocaleLowerCase("pt-BR")
    .replace(/(^|\s)(\p{L})/gu, (_, space: string, letter: string) => `${space}${letter.toLocaleUpperCase("pt-BR")}`);
}
