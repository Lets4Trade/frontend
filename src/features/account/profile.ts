import type { ProfileSummary } from "./ProfileCard";

/**
 * Perfil MOCK usado pelas duas abas do painel. Sai quando existir o
 * `GET /me` — ver .claude/context/open-questions.md.
 */
export const MOCK_PROFILE: ProfileSummary & {
  email: string;
  discord: string;
  whatsapp: string;
} = {
  name: "VICENT MULLER",
  avatar: "/images/avatar-placeholder.png",
  rank: 4,
  coins: 750,
  points: 99,
  email: "nome@gmail.com",
  discord: "",
  whatsapp: "",
};
