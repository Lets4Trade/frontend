import { z } from "zod";

/**
 * Opções dos selects. Plataforma, servidor e tipo ainda são PLACEHOLDER (o
 * design mostra um valor por campo: "Steam", "Gold"); o JOGO vem da loja desde
 * 2026-10-23 (`sellGameOptions`). Ver .claude/context/open-questions.md.
 */
/**
 * "Outros" no FIM de todo select (pedido em 2026-10-01): o cliente que vende
 * algo fora da lista não pode ficar travado no formulário. É um valor FIXO
 * (`outros`), não texto livre — o schema continua recusando o resto; o que
 * ele é de fato vai na descrição, que é obrigatória.
 */
export const OUTROS = { value: "outros", label: "Outros" } as const;

export const PLATAFORMAS = [
  { value: "steam", label: "Steam" },
  { value: "epic", label: "Epic Games" },
  { value: "battlenet", label: "Battle.net" },
  OUTROS,
] as const;

export const SERVIDORES = [
  { value: "sa", label: "América do Sul" },
  { value: "na", label: "América do Norte" },
  { value: "eu", label: "Europa" },
  OUTROS,
] as const;

export const TIPOS_PRODUTO = [
  { value: "gold", label: "Gold" },
  { value: "conta", label: "Conta" },
  { value: "item", label: "Item" },
  OUTROS,
] as const;

const opcaoDe = (opcoes: readonly { value: string }[], mensagem: string) =>
  z.string().refine((v) => opcoes.some((o) => o.value === v), { message: mensagem });

type Option = { value: string; label: string; image?: string | null };

/** Jogo da loja como o formulário recebe (o mesmo do menu de jogos). */
export type SellGame = { slug: string; name: string; image: string | null };

/**
 * As opções de "Jogo": os jogos ATIVOS da loja (a mesma leitura cacheada do
 * menu de jogos do cabeçalho, com o logo) e "Outros" no fim. Até 2026-10-23
 * era uma lista fixa de placeholder (Path Of Exile 2, WoW, LoL) que não batia
 * com a loja e não tinha arte.
 *
 * `pageGame`: o formulário DENTRO da página de um jogo (aba SELL) nasce com ele
 * escolhido. Ele está na lista (é um jogo ativo); se por algum motivo não
 * estiver (cache do menu ainda sem o jogo novo), entra no topo — nunca um valor
 * livre: a opção existe na lista validada pelo schema abaixo.
 */
export function sellGameOptions(
  games: readonly SellGame[],
  pageGame?: { slug: string; name: string },
): { options: readonly Option[]; defaultValue?: string } {
  const options: Option[] = games.map((game) => ({ value: game.slug, label: game.name, image: game.image }));
  if (pageGame && !options.some((option) => option.value === pageGame.slug)) {
    options.unshift({ value: pageGame.slug, label: pageGame.name, image: null });
  }
  return {
    options: [...options, { ...OUTROS, image: null }],
    ...(pageGame ? { defaultValue: pageGame.slug } : {}),
  };
}

/**
 * Formulário de "Venda pra nós". Como sempre: validação de UX, o servidor
 * revalida. Aqui isso importa mais que no login — os selects definem o que
 * será negociado, e um cliente adulterado pode mandar qualquer `value`.
 *
 * `games`: as opções de "Jogo" daquela tela (`sellGameOptions`). O padrão (só
 * "Outros") existe para o tipo `SellFormValues`; as telas sempre passam a lista.
 */
export function createSellSchema(games: readonly Option[] = [OUTROS]) {
  return z.object({
  jogo: opcaoDe(games, "Selecione o jogo."),
  plataforma: opcaoDe(PLATAFORMAS, "Selecione a plataforma."),
  servidor: opcaoDe(SERVIDORES, "Selecione o servidor."),
  tipoProduto: opcaoDe(TIPOS_PRODUTO, "Selecione o tipo de produto."),
  discord: z
    .string()
    .trim()
    .min(2, "Informe seu Discord.")
    .max(64, "Discord muito longo."),
  whatsapp: z
    .string()
    .trim()
    .min(1, "Informe seu WhatsApp.")
    .refine(
      (value) => {
        const digits = value.replace(/\D/g, "");
        return digits.length >= 10 && digits.length <= 15;
      },
      { message: "Número inválido. Inclua DDD." },
    ),
  descricao: z
    .string()
    .trim()
    .min(10, "Descreva o produto com ao menos 10 caracteres.")
    .max(1000, "Máximo de 1000 caracteres."),
  });
}

export const sellSchema = createSellSchema();

export type SellFormValues = z.infer<typeof sellSchema>;
