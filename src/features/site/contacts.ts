import { formatCnpj as maskCnpj, formatPhone } from "@/lib/masks";
import { getLayoutContent } from "./layoutContent";

/**
 * Os canais de atendimento OFICIAIS da loja — WhatsApp e Discord.
 *
 * ── Um lugar só ────────────────────────────────────────────────────────────
 * Até 2026-09-14 cada tela tinha o seu: "Venda pra nós" mostrava o placeholder
 * `+55 11 90000-0000` e o botão "fechar pelo WhatsApp" do checkout apontava
 * para `#`. O valor agora vem da sessão `layout:contatos`, editada em
 * "Cabeçalho e rodapé → Contato e atendimento", e toda tela que precisa de um
 * canal pergunta AQUI.
 *
 * ── Leitura cacheada ───────────────────────────────────────────────────────
 * Reusa `getLayoutContent`, que o cabeçalho e o rodapé já fazem em toda página
 * — as duas leituras compartilham a mesma resposta em cache, então contato
 * não custa ida extra ao backend.
 *
 * ── O link é MONTADO, nunca copiado do campo ──────────────────────────────
 * O admin digita o número como quer ("+55 (11) 91234-5678"); o link do
 * WhatsApp é `wa.me/` + só os dígitos. Nunca pomos o texto do campo num
 * `href`: um `javascript:` digitado ali viraria script no clique de todo
 * cliente. O Discord só vira link quando é um convite do PRÓPRIO Discord.
 */

export type ContactChannel = {
  /** O que a tela mostra (e o que o botão de copiar copia). */
  value: string;
  /** Link seguro, quando dá para montar um. */
  href?: string;
};

export type Contacts = {
  whatsapp?: ContactChannel;
  discord?: ContactChannel;
};

/**
 * Número de telefone internacional tem de 10 a 15 dígitos (E.164). Fora disso
 * o campo tem erro de digitação, e um link `wa.me` quebrado é pior que nenhum:
 * o cliente clica, cai numa tela de "número inválido" e desiste da compra.
 */
const PHONE_DIGITS = /^\d{10,15}$/;

/** Convite do Discord — o único formato que vira link. */
const DISCORD_INVITE =
  /^https:\/\/(?:www\.)?(?:discord\.gg|discord\.com\/invite)\/[A-Za-z0-9-]{2,32}\/?$/;

export function parseWhatsApp(raw: string): ContactChannel | undefined {
  const value = raw.trim();
  if (!value) return undefined;

  // Número válido é EXIBIDO com a máscara do site (dado antigo pode estar só em
  // dígitos); inválido aparece como foi digitado, para o erro ficar visível.
  const digits = value.replace(/\D/g, "");
  return PHONE_DIGITS.test(digits)
    ? { value: formatPhone(value), href: `https://wa.me/${digits}` }
    : { value };
}

export function parseDiscord(raw: string): ContactChannel | undefined {
  const value = raw.trim();
  if (!value) return undefined;

  return DISCORD_INVITE.test(value) ? { value, href: value } : { value };
}

/**
 * Telefone da empresa → `tel:+dígitos`. Mesma regra do WhatsApp: o link é
 * montado só com os dígitos, e número fora de 10–15 dígitos aparece sem link.
 */
export function parsePhone(raw: string): ContactChannel | undefined {
  const value = raw.trim();
  if (!value) return undefined;

  const digits = value.replace(/\D/g, "");
  return PHONE_DIGITS.test(digits)
    ? { value: formatPhone(value), href: `tel:+${digits}` }
    : { value };
}

/**
 * Formato de e-mail aceito para virar `mailto:`. Estreito de propósito: sem
 * espaço, sem `?`/`&` (que injetariam assunto, cópia ou corpo no `mailto`),
 * sem `%` (que o cliente de e-mail decodificaria em `?`), sem `<>`/aspas. Fora disso o texto aparece, mas não vira link.
 */
const EMAIL = /^[A-Za-z0-9._+-]{1,64}@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/;

export function parseEmail(raw: string): ContactChannel | undefined {
  const value = raw.trim();
  if (!value) return undefined;

  return EMAIL.test(value) && value.length <= 254
    ? { value, href: `mailto:${value}` }
    : { value };
}

/**
 * CNPJ para exibição: com as 14 posições completas (numérico ou o novo
 * alfanumérico) ganha a máscara oficial; qualquer outra coisa aparece como veio
 * — reescrever um valor incompleto seria adivinhar.
 */
export function formatCnpj(raw: string): string {
  const value = raw.trim();
  const chars = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!/^[A-Z0-9]{12}\d{2}$/.test(chars) || !/^[A-Za-z0-9.\/\s-]+$/.test(value)) {
    return value;
  }
  return maskCnpj(chars);
}

/** `{ano}` no copyright vira o ano corrente. */
export function resolveCopyright(raw: string, year: number): string {
  return raw.trim().replaceAll("{ano}", String(year));
}

export async function getContacts(): Promise<Contacts> {
  const { text } = await getLayoutContent();
  const section = text("contatos");

  return {
    whatsapp: parseWhatsApp(section.title),
    discord: parseDiscord(section.subtitle),
  };
}
