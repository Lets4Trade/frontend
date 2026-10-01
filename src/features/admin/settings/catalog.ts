import { parseEmail, parsePhone, parseWhatsApp } from "@/features/site/contacts";
import type { SectionContent } from "@/features/site/list";
import { sectionKey } from "@/features/site/sections";

/**
 * "Configurações da loja" (2026-10-01) — os dados da LOJA que estavam
 * disfarçados de sessões da página "Cabeçalho e rodapé": WhatsApp, Discord,
 * logo, ícone, dados da empresa e redes sociais.
 *
 * Não são conteúdo de página — são configuração que várias telas leem (o
 * WhatsApp sozinho alimenta o chat, o checkout e "Venda pra nós"). Por isso
 * ganharam tela própria, a 1 clique do menu, com todos os grupos à vista.
 *
 * Os dados continuam nas MESMAS sessões `layout:*` (sem migração, sem
 * backend novo): esta lista só diz quais sessões cada cartão mostra.
 */

export type SettingsGroup = {
  /** Âncora do cartão (`/admin/configuracoes#atendimento`). */
  id: string;
  title: string;
  description: string;
  /** Sufixos das sessões da página `layout` do catálogo. */
  sections: readonly string[];
  /** Palavras que a busca do painel (Ctrl+K) casa com este cartão. */
  keywords: readonly string[];
};

export const SETTINGS_PAGE = "layout";

export const SETTINGS_GROUPS: readonly SettingsGroup[] = [
  {
    id: "atendimento",
    title: "Atendimento",
    description: "Canais oficiais. Aparecem no chat do site, no checkout e em “Venda pra nós”.",
    sections: ["contatos"],
    keywords: ["whatsapp", "zap", "discord", "contato", "chat", "suporte", "telefone"],
  },
  {
    id: "marca",
    title: "Marca",
    description: "Logo usada no site inteiro e o ícone da aba do navegador.",
    sections: ["marca", "icone"],
    keywords: ["logo", "logotipo", "icone", "favicon", "marca", "imagem"],
  },
  {
    id: "empresa",
    title: "Dados da empresa",
    description: "CNPJ, telefone, e-mail e copyright, no pé do rodapé.",
    sections: ["footer-empresa"],
    keywords: ["cnpj", "empresa", "email", "e-mail", "telefone", "copyright", "direitos"],
  },
  {
    id: "redes",
    title: "Redes sociais",
    description: "Os ícones com link para os perfis, no rodapé.",
    sections: ["footer-redes"],
    keywords: ["redes", "instagram", "youtube", "tiktok", "twitter", "x", "facebook", "linkedin", "discord"],
  },
];

/** Sessões `layout:*` que moram em Configurações — e não em Cabeçalho/Rodapé. */
export const SETTINGS_SECTION_KEYS: ReadonlySet<string> = new Set(
  SETTINGS_GROUPS.flatMap((group) => group.sections),
);

/** Onde uma sessão `layout:<sufixo>` de configuração é editada. */
export function settingsHref(suffix: string): string | null {
  const group = SETTINGS_GROUPS.find((item) => item.sections.includes(suffix));
  return group ? `/admin/configuracoes#${group.id}` : null;
}

export type SettingsNotice = {
  /** `warn` = algo do site está escondido por causa disto; `info` = opcional vazio. */
  level: "warn" | "info";
  text: string;
};

/**
 * O que falta em cada cartão — dito em termos do EFEITO no site, não do campo.
 *
 * Nasceu do caso do WhatsApp (2026-10-01): o campo nunca tinha sido preenchido
 * em produção e o botão sumia do chat sem ninguém saber por quê.
 */
export function settingsNotices(sections: readonly SectionContent[]): Record<string, SettingsNotice[]> {
  const get = (suffix: string) => sections.find((item) => item.key === sectionKey(SETTINGS_PAGE, suffix));
  const value = (raw: string | null | undefined) => (raw ?? "").trim();

  const contacts = get("contatos");
  const whatsappRaw = value(contacts?.title);
  const whatsapp = parseWhatsApp(whatsappRaw);
  const atendimento: SettingsNotice[] = [];
  if (!whatsappRaw) {
    atendimento.push({
      level: "warn",
      text: "WhatsApp vazio: o botão “Falar no WhatsApp” não aparece no chat, no checkout nem em “Venda pra nós”.",
    });
  } else if (!whatsapp?.href) {
    atendimento.push({
      level: "warn",
      text: "WhatsApp inválido (use DDI + DDD + número, ex.: +55 19 99999-9999): o botão não aparece.",
    });
  }
  if (!value(contacts?.subtitle)) {
    atendimento.push({ level: "info", text: "Discord vazio: o canal não aparece." });
  }

  const marca: SettingsNotice[] = [];
  if (!get("marca")?.imageUrl) marca.push({ level: "info", text: "Usando a logo padrão do site." });
  if (!get("icone")?.imageUrl) marca.push({ level: "info", text: "Usando o ícone padrão na aba do navegador." });

  const company = get("footer-empresa");
  const empresa: SettingsNotice[] = [];
  const missing: string[] = [];
  if (!value(company?.title)) missing.push("CNPJ");
  const phone = value(company?.subtitle);
  if (!phone) missing.push("telefone");
  const email = value(company?.footnote);
  if (!email) missing.push("e-mail");
  if (missing.length > 0) {
    empresa.push({ level: "info", text: `Sem ${joinPt(missing)}: ${missing.length > 1 ? "não aparecem" : "não aparece"} no rodapé.` });
  }
  if (phone && !parsePhone(phone)?.href) {
    empresa.push({ level: "warn", text: "Telefone inválido: aparece sem link no rodapé." });
  }
  if (email && !parseEmail(email)?.href) {
    empresa.push({ level: "warn", text: "E-mail inválido: aparece sem link no rodapé." });
  }

  return { atendimento, marca, empresa, redes: [] };
}

function joinPt(parts: string[]): string {
  return parts.length <= 1 ? (parts[0] ?? "") : `${parts.slice(0, -1).join(", ")} e ${parts.at(-1)}`;
}
