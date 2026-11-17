/**
 * Quebra de linha do título no card (2026-11-17, pedido do usuário: "às vezes
 * o texto fica muito grande, eu mesmo escolho onde quebrar").
 *
 * O banco guarda o NOME numa linha só e, à parte, `nameBreak`: o índice do
 * ESPAÇO onde o card passa para a 2ª linha. Assim carrinho, pedidos, e-mails e
 * busca continuam recebendo o nome inteiro, sem "\n" no meio. O backend aplica
 * a mesma regra (`validNameBreak`); aqui ela se repete porque a resposta da API
 * é dado externo e o formulário precisa montar o mesmo valor.
 */

/** As duas linhas do título, ou `null` quando não há quebra válida. */
export function splitName(name: string, at: number | null | undefined): [string, string] | null {
  if (typeof at !== "number" || !Number.isInteger(at)) return null;
  if (at < 1 || at >= name.length - 1 || name[at] !== " ") return null;
  return [name.slice(0, at), name.slice(at + 1)];
}

/** Nome + quebra → texto do campo do painel (a quebra vira uma linha nova). */
export function nameToText(name: string, at: number | null | undefined): string {
  const lines = splitName(name, at);
  return lines ? `${lines[0]}\n${lines[1]}` : name;
}

/**
 * Texto do campo do painel → nome numa linha + posição da quebra. Só a 1ª
 * linha nova conta (o campo não deixa digitar outra, mas colar pode trazer);
 * as demais viram espaço. Espaços em volta da quebra somem.
 */
export function textToName(text: string): { name: string; nameBreak: number | null } {
  const clean = text.replace(/\r/g, "");
  const index = clean.indexOf("\n");
  if (index === -1) return { name: clean.trim(), nameBreak: null };

  const first = clean.slice(0, index).replace(/\s+/g, " ").trim();
  const second = clean.slice(index + 1).replace(/\s+/g, " ").trim();
  if (!first || !second) return { name: `${first}${second}`, nameBreak: null };
  return { name: `${first} ${second}`, nameBreak: first.length };
}

/** O título do card: com quebra, duas linhas (cada uma corta com "…" se não couber). */
export function CardTitleLines({ name, nameBreak }: { name: string; nameBreak?: number | null }) {
  const lines = splitName(name, nameBreak);
  if (!lines) return name;
  return (
    <>
      <span className="block truncate">{lines[0]}</span>
      <span className="block truncate">{lines[1]}</span>
    </>
  );
}
