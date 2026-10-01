import { z } from "zod";

/**
 * Opções dos selects. O design mostra um valor por campo ("Path Of Exile 2",
 * "Steam", "Gold"), então estas listas são PLACEHOLDER até o catálogo real
 * existir — provavelmente vindo da API, já que jogos e servidores mudam sem
 * deploy. Ver .claude/context/open-questions.md.
 */
export const JOGOS = [
  { value: "poe2", label: "Path Of Exile 2" },
  { value: "wow", label: "World of Warcraft" },
  { value: "lol", label: "League of Legends" },
] as const;

export const PLATAFORMAS = [
  { value: "steam", label: "Steam" },
  { value: "epic", label: "Epic Games" },
  { value: "battlenet", label: "Battle.net" },
] as const;

export const SERVIDORES = [
  { value: "sa", label: "América do Sul" },
  { value: "na", label: "América do Norte" },
  { value: "eu", label: "Europa" },
] as const;

export const TIPOS_PRODUTO = [
  { value: "gold", label: "Gold" },
  { value: "conta", label: "Conta" },
  { value: "item", label: "Item" },
] as const;

const opcaoDe = (opcoes: readonly { value: string }[], mensagem: string) =>
  z.string().refine((v) => opcoes.some((o) => o.value === v), { message: mensagem });

type Option = { value: string; label: string };

/**
 * As opções de "Jogo" quando o formulário está DENTRO da página de um jogo
 * (aba SELL, contrato game-tabs-v2) — e qual já vem escolhida.
 *
 * Se o jogo da página já está na lista (pelo `value` ou pelo nome, sem caixa),
 * vale a opção da lista: é o valor que o formulário de `/venda` também manda.
 * Se não está (a lista ainda é placeholder; jogo cadastrado pelo painel não
 * entra nela), o jogo da página entra no TOPO, com o slug como valor. Nunca
 * um valor livre: a opção existe na lista validada pelo schema abaixo.
 */
export function sellGameOptions(game?: { slug: string; name: string }): {
  options: readonly Option[];
  defaultValue?: string;
} {
  if (!game) return { options: JOGOS };
  const name = game.name.trim().toLocaleLowerCase("pt-BR");
  const match = JOGOS.find(
    (option) => option.value === game.slug || option.label.toLocaleLowerCase("pt-BR") === name,
  );
  if (match) return { options: JOGOS, defaultValue: match.value };
  return {
    options: [{ value: game.slug, label: game.name }, ...JOGOS],
    defaultValue: game.slug,
  };
}

/**
 * Formulário de "Venda pra nós". Como sempre: validação de UX, o servidor
 * revalida. Aqui isso importa mais que no login — os selects definem o que
 * será negociado, e um cliente adulterado pode mandar qualquer `value`.
 *
 * `games`: as opções de "Jogo" daquela tela (`sellGameOptions`). O padrão é a
 * lista de `/venda`.
 */
export function createSellSchema(games: readonly Option[] = JOGOS) {
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
