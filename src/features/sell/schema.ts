import { z } from "zod";

/**
 * "Outros" no FIM do select de jogo (pedido em 2026-10-01): o cliente que
 * vende algo fora da lista não pode ficar travado no formulário. O que ele é
 * de fato vai na descrição, que é obrigatória.
 */
export const OUTROS = { value: "outros", label: "Outros" } as const;

/**
 * Plataforma, servidor e tipo de produto viraram TEXTO LIVRE em 2026-10-28
 * (pedido do usuário). As listas abaixo ficam só como RÓTULOS das propostas
 * antigas, gravadas com o código (`steam` → "Steam") — ver
 * `admin/sellRequests/types.ts`.
 */
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
/** Teto de plataforma, servidor e tipo — o mesmo do backend (`SELL_TEXT_MAX`). */
export const SELL_TEXT_MAX = 60;

const textoLivre = (vazio: string) =>
  z.string().trim().min(1, vazio).max(SELL_TEXT_MAX, `Máximo de ${SELL_TEXT_MAX} caracteres.`);

const CONTATO_FALTANDO = "Informe o Discord ou o WhatsApp.";

export function createSellSchema(games: readonly Option[] = [OUTROS]) {
  return z
    .object({
      jogo: opcaoDe(games, "Selecione o jogo."),
      plataforma: textoLivre("Informe a plataforma."),
      servidor: textoLivre("Informe o servidor."),
      tipoProduto: textoLivre("Informe o tipo de produto."),
      // Discord OU WhatsApp (2026-10-28): cada um é opcional, mas o que vier
      // tem que ser válido; "pelo menos um" é o `superRefine` abaixo.
      discord: z
        .string()
        .trim()
        .refine((value) => value === "" || value.length >= 2, { message: "Discord muito curto." })
        .refine((value) => value.length <= 64, { message: "Discord muito longo." }),
      whatsapp: z
        .string()
        .trim()
        .refine(
          (value) => {
            if (value === "") return true;
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
    })
    .superRefine((values, ctx) => {
      if (values.discord !== "" || values.whatsapp !== "") return;
      // O aviso nos DOIS campos: qualquer um deles resolve.
      ctx.addIssue({ code: "custom", path: ["discord"], message: CONTATO_FALTANDO });
      ctx.addIssue({ code: "custom", path: ["whatsapp"], message: CONTATO_FALTANDO });
    });
}

export const sellSchema = createSellSchema();

export type SellFormValues = z.infer<typeof sellSchema>;
