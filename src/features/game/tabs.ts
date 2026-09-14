/**
 * As abas de serviço da página de jogo (Figma 1524:401) — a definição ÚNICA.
 *
 * Elas apareciam escritas em dois lugares: `features/game/seed.ts` (vitrine) e
 * `features/admin/products/catalog.ts` (painel). Eram a mesma lista com dois
 * formatos, e o dia em que uma aba nova entrasse num só dos dois é o dia em que
 * o admin cadastra um tipo que a loja não sabe desenhar.
 *
 * ── O que liga a aba ao banco ──────────────────────────────────────────────
 * `productType` é o valor do enum `GameProductType` do backend; `id` é o que
 * viaja na URL pública (`?aba=moedas`). São dois campos e não um porque servem
 * a públicos diferentes: o enum é contrato de API e o id é endereço que uma
 * pessoa lê e compartilha. Converter um no outro com `toLowerCase()` funcionaria
 * hoje e amarraria o endereço público ao nome de uma constante de banco.
 *
 * A lista é FECHADA por causa da arte: cada aba precisa do seu ícone, e o
 * backend documenta a mesma restrição no enum ("não inventamos tipo sem arte,
 * porque a aba apareceria sem ícone na vitrine").
 */
export type ProductTabDef = {
  /** O que vai na URL da vitrine. */
  id: string;
  /** O valor do enum `GameProductType` no backend. */
  productType: string;
  label: string;
  icon: string;
  /**
   * Camada extra sobre o ícone. O arquivo compõe o ícone de ITENS com dois
   * desenhos sobrepostos; nenhuma outra aba precisa disso.
   */
  overlay?: { src: string; inset: string; flip?: boolean };
};

/** A ordem é a do arquivo. */
export const PRODUCT_TABS: ProductTabDef[] = [
  {
    id: "moedas",
    productType: "MOEDAS",
    label: "MOEDAS",
    icon: "/icons/game/tab-moedas.svg",
  },
  {
    id: "itens",
    productType: "ITENS",
    label: "ITENS",
    icon: "/icons/game/tab-itens-base.svg",
    overlay: {
      src: "/icons/game/tab-itens-mark.svg",
      inset: "21.21% 41.49% 48.48% 40.77%",
      flip: true,
    },
  },
  { id: "gold", productType: "GOLD", label: "GOLD", icon: "/icons/game/tab-gold.svg" },
  {
    id: "builds",
    productType: "BUILDS",
    label: "BUILDS",
    icon: "/icons/game/tab-builds.svg",
  },
  {
    id: "boosting",
    productType: "BOOSTING",
    label: "BOOSTING",
    icon: "/icons/game/tab-boosting.svg",
  },
  {
    id: "carry",
    productType: "CARRY",
    label: "CARRY",
    icon: "/icons/game/tab-carry.svg",
  },
  {
    id: "mentoria",
    productType: "MENTORIA",
    label: "MENTORIA",
    icon: "/icons/game/tab-mentoria.svg",
  },
];

const BY_ID = new Map(PRODUCT_TABS.map((tab) => [tab.id, tab]));
const BY_TYPE = new Map(PRODUCT_TABS.map((tab) => [tab.productType, tab]));

/** Aba pelo id da URL. `undefined` para um `?aba=` inventado. */
export function tabById(id: string): ProductTabDef | undefined {
  return BY_ID.get(id);
}

/** Aba pelo tipo do backend. `undefined` para um enum que a arte não cobre. */
export function tabByProductType(type: string): ProductTabDef | undefined {
  return BY_TYPE.get(type);
}

/**
 * As duas abas do arquivo que NÃO são tipo de produto.
 *
 * "VENDA PRA NÓS" e "FIDELIDADE" desenham iguais às outras e ficam na mesma
 * fileira, mas levam para outra página em vez de filtrar o catálogo. Ficam
 * separadas justamente por isso: como filtro de produto elas nunca casariam com
 * nada, e no painel elas não existem.
 */
export const LINK_TABS = [
  {
    id: "venda",
    label: "VENDA PRA NÓS",
    icon: "/icons/game/tab-venda.svg",
    href: "/venda",
  },
  {
    id: "fidelidade",
    label: "FIDELIDADE",
    icon: "/icons/game/tab-fidelidade.svg",
    href: "/fidelidade",
  },
] as const;

/**
 * A personalização de uma aba, vinda da tela "Edição de sessões".
 *
 * Todo campo é opcional porque a linha no banco só guarda o que foi MUDADO:
 * ausente significa "como o arquivo do Figma desenhou". É a mesma convenção do
 * Builder de Páginas.
 */
export type NavTabOverride = {
  key: string;
  label?: string | null;
  /** Já ABSOLUTA quando chega aqui — a conversão é da fronteira de dados. */
  iconUrl?: string | null;
  position?: number | null;
  isActive: boolean;
};

/**
 * As abas como a loja deve desenhá-las: as do código, com as personalizações
 * aplicadas.
 *
 * ── Por que o código continua mandando em QUAIS abas existem ───────────────
 * Uma aba de produto filtra um `GameProductType`, e tipo de produto é coluna de
 * `Product` — criar uma aba de verdade é acrescentar valor a um enum, o que é
 * migration e não formulário. O que a tela permite é trocar ícone, renomear,
 * reordenar e esconder; e é exatamente isso que esta função aplica.
 *
 * Aba escondida (`isActive: false`) SOME da lista. Override de chave
 * desconhecida é ignorado — uma aba removida do código não pode ressuscitar por
 * causa de uma linha esquecida no banco.
 */
export function resolveProductTabs(
  overrides: readonly NavTabOverride[] = [],
): ProductTabDef[] {
  const byKey = new Map(overrides.map((item) => [item.key, item]));

  return PRODUCT_TABS.filter((tab) => byKey.get(tab.id)?.isActive !== false)
    .map((tab) => {
      const override = byKey.get(tab.id);
      return {
        ...tab,
        label: override?.label?.trim() || tab.label,
        icon: override?.iconUrl || tab.icon,
        // O ícone personalizado é UMA imagem; a sobreposição de dois desenhos
        // só faz sentido na arte original de ITENS. Trocar o ícone descarta a
        // camada extra, senão o desenho novo sairia com uma marca por cima.
        overlay: override?.iconUrl ? undefined : tab.overlay,
      };
    })
    .sort(byPosition(byKey));
}

/** As duas abas de LINK, com a mesma personalização. */
export function resolveLinkTabs(overrides: readonly NavTabOverride[] = []) {
  const byKey = new Map(overrides.map((item) => [item.key, item]));

  return LINK_TABS.filter((tab) => byKey.get(tab.id)?.isActive !== false)
    .map((tab) => {
      const override = byKey.get(tab.id);
      return {
        ...tab,
        label: override?.label?.trim() || tab.label,
        icon: override?.iconUrl || tab.icon,
      };
    })
    .sort(byPosition(byKey));
}

/**
 * Ordena pela posição escolhida, mantendo a do arquivo para quem não tem uma.
 *
 * Quem não foi reordenado recebe um número ALTO em vez de zero: assim as abas
 * personalizadas sobem para as primeiras posições (que é o que "posição 0"
 * significa para quem arrastou) e as intocadas ficam atrás, na ordem original.
 */
function byPosition(byKey: Map<string, NavTabOverride>) {
  return (a: { id: string }, b: { id: string }) => {
    const pa = byKey.get(a.id)?.position ?? Number.MAX_SAFE_INTEGER;
    const pb = byKey.get(b.id)?.position ?? Number.MAX_SAFE_INTEGER;
    return pa - pb;
  };
}

/**
 * O rótulo de uma aba: o personalizado, o do código, ou a chave crua.
 *
 * A última reserva quase nunca acontece — só se o banco guardar uma aba que o
 * código não conhece mais. Existe para a lista de escondidas não mostrar
 * "undefined" nesse caso.
 */
const LABEL_BY_ID = new Map<string, string>([
  ...PRODUCT_TABS.map((tab) => [tab.id, tab.label] as const),
  ...LINK_TABS.map((tab) => [tab.id, tab.label] as const),
]);

export function tabLabel(key: string, override?: string | null): string {
  return override?.trim() || LABEL_BY_ID.get(key) || key;
}
