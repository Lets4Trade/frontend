/**
 * Plataforma do SERVIDOR (2026-11-22, pedido do usuário): o painel oferece
 * servidores prontos de PC, PlayStation e Xbox, e a loja mostra o ícone de
 * cada um ao lado do nome.
 *
 * Os ícones são MONOCROMÁTICOS de propósito ("não pode ser a logo colorida"):
 * `fill="currentColor"`, então seguem a cor do texto da pílula — branco na
 * normal, a mesma do texto na ativa.
 *
 * Origem dos desenhos:
 *   - PlayStation: Simple Icons (CC0).
 *   - Xbox: Font Awesome Free 6.7.2 — ícones sob CC BY 4.0
 *     (https://fontawesome.com/license/free), crédito mantido aqui.
 *   - PC: `Monitor` do lucide-react (ISC), que o projeto já usa.
 * Ficam no código (não em CDN): nada de requisição de terceiros na loja.
 */
export const SERVER_PLATFORMS = ["PC", "PLAYSTATION", "XBOX"] as const;
export type ServerPlatform = (typeof SERVER_PLATFORMS)[number];

export const SERVER_PLATFORM_LABEL: Record<ServerPlatform, string> = {
  PC: "PC",
  PLAYSTATION: "PlayStation",
  XBOX: "Xbox",
};

export function isServerPlatform(value: unknown): value is ServerPlatform {
  return typeof value === "string" && (SERVER_PLATFORMS as readonly string[]).includes(value);
}
