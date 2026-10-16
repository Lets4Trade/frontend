import { mobileAlignOf, type MobileAlign } from "@/features/site/mobileAlign";

/**
 * Configuração do BOTÃO do chat flutuante (2026-10-09, pedido do usuário):
 * foto do ícone, título em negrito + texto DENTRO do botão (pílula, desde
 * 2026-10-12 — antes era um balão ao lado), lado da tela e o pontinho de
 * atendimento online/offline — tudo editável em Configurações da
 * loja → Atendimento (sessão `layout:chat`).
 *
 * Os textos da sessão: `title` = título do botão, `subtitle` = texto do botão.
 * As escolhas moram nos textos EXTRAS (o backend já os guarda e valida):
 * `lado`, `status`, `balao` e `offline`.
 *
 * ONLINE/OFFLINE É MANUAL: o admin liga e desliga. Detectar sozinho (alguém
 * com `/admin/chats` aberto) exigiria presença compartilhada entre instâncias
 * (Redis) — fica para quando fizer falta.
 */
export const CHAT_EXTRA = {
  side: "lado",
  status: "status",
  balloon: "balao",
  offline: "offline",
} as const;

export const CHAT_DEFAULTS = {
  title: "Precisa de ajuda?",
  text: "Fale com a nossa equipe. Respondemos rapidinho!",
  offline: "Estamos offline agora. Deixe sua mensagem que respondemos assim que voltarmos.",
} as const;

/** De que lado do TEXTO a bolinha fica. O botão fica sempre no canto direito. */
export type ChatSide = "left" | "right";

export type ChatConfig = {
  /** Foto do ícone enviada no painel; ausente = o ícone padrão de balão. */
  iconUrl?: string;
  title: string;
  text: string;
  side: ChatSide;
  online: boolean;
  showBalloon: boolean;
  offlineText: string;
  /**
   * CELULAR (2026-10-15): "center" põe o botão no meio da parte de baixo da
   * tela e centraliza o texto dele (padrão); "left" = canto direito, texto à
   * esquerda, como no desktop.
   */
  mobileTextAlign: MobileAlign;
};

/**
 * Resolve a configuração a partir da sessão. Valor desconhecido no banco cai
 * no padrão (direita, online, balão visível) — nunca num estado quebrado.
 */
export function chatConfig(section: {
  title: string;
  subtitle: string;
  imageUrl?: string;
  extra: (name: string, fallback: string) => string;
}): ChatConfig {
  return {
    iconUrl: section.imageUrl || undefined,
    title: section.title || CHAT_DEFAULTS.title,
    text: section.subtitle || CHAT_DEFAULTS.text,
    side: section.extra(CHAT_EXTRA.side, "direita") === "esquerda" ? "left" : "right",
    online: section.extra(CHAT_EXTRA.status, "online") !== "offline",
    showBalloon: section.extra(CHAT_EXTRA.balloon, "mostrar") !== "esconder",
    offlineText: section.extra(CHAT_EXTRA.offline, CHAT_DEFAULTS.offline),
    mobileTextAlign: mobileAlignOf(section.extra),
  };
}
