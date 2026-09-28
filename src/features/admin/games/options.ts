import { TAB_TEMPLATES } from "@/features/game/tabs";

/**
 * Opções dos dois selects do cadastro de jogo.
 *
 * `PLATFORMS` ESPELHA o enum `GamePlatform` do backend
 * (backend/prisma/schema.prisma); `TAB_TEMPLATE_OPTIONS`, a constante de
 * MODELOS de aba (`backend/src/app/games/tabs/default-tabs.ts`). O `value` vai
 * cru para a API; o `label` é só o que a pessoa lê. Se um valor sair de
 * sincronia, o backend responde 400 — a divergência aparece, não passa
 * silenciosa.
 *
 * Por que duplicado e não buscado do servidor: as duas listas mudam no ritmo
 * de um deploy. Um endpoint só para listá-los
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
 * O MODELO da primeira aba de um jogo novo ("Moedas", "Boosting"…). Desde a
 * FASE 5 "tipo de produto" não existe no banco: a chave só diz ao backend qual
 * aba inicial criar (rótulo, ícone e layout do modelo) e não é gravada.
 * Derivada de `features/game/tabs.ts` para rótulo e ícone não divergirem.
 */
export const TAB_TEMPLATE_OPTIONS: readonly SelectOption[] = TAB_TEMPLATES.map((tab) => ({
  value: tab.key,
  label: tab.label.charAt(0) + tab.label.slice(1).toLocaleLowerCase("pt-BR"),
}));

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
