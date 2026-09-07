/**
 * Opções dos dois selects do cadastro de jogo.
 *
 * ESTA LISTA ESPELHA OS ENUMS `GamePlatform` e `GameProductType` do backend
 * (backend/prisma/schema.prisma). O `value` é o nome do enum e vai cru para a
 * API; o `label` é só o que a pessoa lê. Se um valor sair de sincronia, o
 * backend responde 400 — a divergência aparece, não passa silenciosa.
 *
 * Por que duplicado e não buscado do servidor: são dois enums que mudam por
 * migration, ou seja, no ritmo de um deploy. Um endpoint só para listá-los
 * custaria um round-trip em toda abertura do formulário para entregar um dado
 * que só muda quando o código muda.
 */

export type SelectOption = { value: string; label: string };

export const PLATFORMS: readonly SelectOption[] = [
  { value: "STEAM", label: "Steam" },
  { value: "EPIC", label: "Epic Games" },
  { value: "BATTLE_NET", label: "Battle.net" },
  { value: "RIOT", label: "Riot Games" },
  { value: "GOG", label: "GOG" },
  { value: "XBOX", label: "Xbox" },
  { value: "PLAYSTATION", label: "PlayStation" },
  { value: "NINTENDO", label: "Nintendo" },
  { value: "MOBILE", label: "Mobile" },
  { value: "BROWSER", label: "Navegador" },
];

/**
 * Os rótulos são os das abas que a página de jogo já desenha — os ícones
 * correspondentes estão em `public/icons/game/tab-*.svg`. Tipo sem ícone
 * apareceria na vitrine como uma aba vazia, então a lista para onde a arte para.
 */
export const PRODUCT_TYPES: readonly SelectOption[] = [
  { value: "MOEDAS", label: "Moedas" },
  { value: "ITENS", label: "Itens" },
  { value: "GOLD", label: "Gold" },
  { value: "BOOSTING", label: "Boosting" },
  { value: "CARRY", label: "Carry" },
  { value: "BUILDS", label: "Builds" },
  { value: "MENTORIA", label: "Mentoria" },
];

/** Espelha `MAX_IMAGE_BYTES` do backend (common/storage/image-storage.service.ts). */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Espelha o `ACCEPTED_MIME` do backend. SVG fica de fora: é XSS armazenado. */
export const ACCEPTED_IMAGE_TYPES = "image/png,image/jpeg,image/webp,image/avif";

/**
 * Rótulo de um valor de enum, para quando ele vem do BANCO em vez de ser
 * escolhido numa lista local — é o caso do cadastro de produto, onde as
 * plataformas e os tipos disponíveis são os que o JOGO declarou.
 *
 * Valor desconhecido volta como veio, e não vazio: se o backend ganhar um enum
 * novo antes desta lista, a tela mostra "BATTLE_ROYALE" — feio, mas verdadeiro,
 * e visivelmente errado para quem estiver olhando. Uma opção em branco
 * esconderia a divergência.
 */
export function labelFor(
  options: readonly SelectOption[],
  value: string,
): string {
  return options.find((option) => option.value === value)?.label ?? value;
}
