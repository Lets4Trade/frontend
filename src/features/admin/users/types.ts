import { formatPhone } from "@/lib/masks";

/**
 * Tipos puros da área de usuários do painel.
 *
 * Arquivo separado de `list.ts` porque o modal é client component e importa
 * `AdminUserDetail`: puxar o módulo que fala com a rede arrastaria o
 * `next/headers` para o bundle do navegador — a mesma armadilha do card de
 * produto.
 */

/** Espelha o enum `UserRole` do backend. */
export type AdminUserRole = "ADMIN" | "USER";

/**
 * Derivado no backend de `isActive`/`deletedAt`. NÃO existe banimento no model:
 * "BANIDA" hoje quer dizer "conta inativa ou excluída".
 */
export type AdminUserStatus = "FUNCIONAL" | "BANIDA";

/**
 * ⚠️ CAMPOS ANULÁVEIS CHEGAM AUSENTES, não nulos.
 *
 * O `ResponseCompressionInterceptor` do backend é global e remove de TODA
 * resposta os campos `null`, `undefined` e `""` (só `createdAt`/`updatedAt`
 * escapam). Então `deletedAt: null` não vira `null` aqui — o campo simplesmente
 * não existe no JSON.
 *
 * Por isso os tipos abaixo marcam esses campos como opcionais E anuláveis, e o
 * código testa por valor FALSY (`!user.deletedAt`) em vez de `=== null`. Um
 * `!== null` num campo ausente é sempre verdadeiro — foi o que fez o botão de
 * excluir aparecer como "CONTA EXCLUÍDA" para contas que não estavam excluídas.
 */

/** O que a LISTAGEM devolve — sete campos, de propósito. */
export type AdminUser = {
  id: string;
  name: string;
  whatsapp?: string | null;
  role: AdminUserRole;
  status: AdminUserStatus;
  orderCount: number;
  createdAt: string;
};

/**
 * O que o MODAL recebe, buscado por id. Mais amplo que a listagem porque abrir
 * a ficha de uma pessoa é uma ação deliberada; paginar não é.
 *
 * Continua sem `password`, sem os identificadores do Google (só o booleano
 * `hasGoogle`) e sem `passwordChangedAt`.
 */
export type AdminUserDetail = {
  id: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  username?: string | null;
  whatsapp?: string | null;
  discordId?: string | null;
  avatarUrl?: string | null;
  emailVerified: boolean;
  acceptedTerms: boolean;
  role: AdminUserRole;
  language: string;
  isActive: boolean;
  status: AdminUserStatus;
  mfaEnabled: boolean;
  hasGoogle: boolean;
  tier: string;
  letsCoins: number;
  points: number;
  /** Dinheiro sempre em CENTAVOS inteiros na API. */
  totalSpentCents: number;
  totalSavedCents: number;
  orderCount: number;
  lastLoginAt?: string | null;
  createdAt: string;
  deletedAt?: string | null;
};

export type AdminUserPage = {
  items: AdminUser[];
  total: number;
  page: number;
  limit: number;
  pageCount: number;
};

/** Rótulos do select "Cargo atual" e da pílula da tabela. */
export const ROLE_OPTIONS = [
  { value: "ADMIN", label: "Admin" },
  { value: "USER", label: "Cliente" },
] as const;

export function roleLabel(role: AdminUserRole): string {
  return ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role;
}

/**
 * ISO → "17/04/26 05:34", o formato do arquivo.
 *
 * Fuso de São Paulo FIXO, e não o do servidor: em produção o Node roda em UTC,
 * e sem isto a data apareceria três horas atrasada para quem administra a loja
 * daqui.
 */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(date)
    .replace(",", "");
}

/**
 * Telefone como o arquivo mostra: os dígitos crus.
 *
 * NÃO formatamos em "(11) 99231-1561" porque o campo é livre no cadastro e
 * mascarar um número fora do padrão brasileiro produziria lixo com cara de
 * telefone válido. Mostrar o que está guardado é o que deixa o admin perceber
 * que o dado está errado.
 */
export function phoneOrDash(whatsapp: string | null | undefined): string {
  // Cadastros anteriores à máscara estão só em dígitos: exibe formatado.
  return whatsapp && whatsapp.trim() !== "" ? formatPhone(whatsapp) : "—";
}

/** Centavos → "R$ 1.234,56". Inteiros: dividir dinheiro em float erra centavo. */
export function formatCents(cents: number): string {
  const whole = Math.trunc(Math.abs(cents) / 100);
  const remainder = Math.abs(cents) % 100;
  const sign = cents < 0 ? "-" : "";
  return `${sign}R$ ${whole.toLocaleString("pt-BR")},${String(remainder).padStart(2, "0")}`;
}
