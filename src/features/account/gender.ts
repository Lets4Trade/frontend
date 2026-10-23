/**
 * Gênero da conta e o avatar padrão que ele escolhe (2026-10-23).
 *
 * Módulo PURO: o cabeçalho (servidor), "Minha conta" e o cadastro (navegador)
 * leem daqui. O gênero só serve para isto — escolher a arte de quem não subiu
 * foto. Sem gênero (contas antigas, Google/Discord) ou "Prefiro não informar":
 * o avatar neutro, de capuz com interrogação.
 */

export type Gender = "MALE" | "FEMALE" | "UNDISCLOSED";

export const GENDER_OPTIONS: ReadonlyArray<{ value: Gender; label: string }> = [
  { value: "MALE", label: "Masculino" },
  { value: "FEMALE", label: "Feminino" },
  { value: "UNDISCLOSED", label: "Prefiro não informar" },
];

const DEFAULT_AVATARS: Record<Gender, string> = {
  MALE: "/images/avatar-male.png",
  FEMALE: "/images/avatar-female.png",
  UNDISCLOSED: "/images/avatar-unknown.png",
};

export function parseGender(raw: unknown): Gender | null {
  return raw === "MALE" || raw === "FEMALE" || raw === "UNDISCLOSED" ? raw : null;
}

export function defaultAvatar(gender: unknown): string {
  return DEFAULT_AVATARS[parseGender(gender) ?? "UNDISCLOSED"];
}

/**
 * Foto da conta, ou o avatar padrão do gênero.
 *
 * `next/image` só carrega host declarado em `remotePatterns` (next.config.ts):
 * uma URL de host não autorizado derrubaria a renderização inteira, então uma
 * foto que não dá para exibir vira o avatar padrão — degradação silenciosa é
 * melhor que página quebrada por causa de um retrato.
 */
export function accountAvatar(avatarUrl: unknown, gender: unknown): string {
  const fallback = defaultAvatar(gender);
  if (typeof avatarUrl !== "string" || avatarUrl === "") return fallback;
  if (avatarUrl.startsWith("/")) return avatarUrl;
  try {
    const { protocol } = new URL(avatarUrl);
    return protocol === "https:" || protocol === "http:" ? avatarUrl : fallback;
  } catch {
    return fallback;
  }
}
