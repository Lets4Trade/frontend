import { newBlockId } from "./catalog";
import { LEGACY_SECTION_KEYS, type Block } from "./types";

/**
 * O PRIMEIRO rascunho de uma página: a página de hoje, seção por seção, como
 * blocos "Seção existente" — na ordem e com a visibilidade que ela já tinha.
 * Assim o cliente abre o construtor e vê a própria loja, não uma página em
 * branco, e publicar sem mexer em nada não muda o que está no ar.
 *
 * `known` = as seções que a página tem (registro); `visible`/`hidden` = o que o
 * desenho atual mostra e esconde. Seção que nenhum dos dois cita (nova no
 * código) entra no fim, visível.
 */
export function defaultBlocksFor(
  known: readonly string[],
  layout: { visible: readonly string[]; hidden?: readonly string[] },
): Block[] {
  const isKnown = (key: string) => known.includes(key);
  const visible = layout.visible.filter(isKnown);
  const hidden = (layout.hidden ?? []).filter(isKnown).filter((key) => !visible.includes(key));
  const rest = known.filter((key) => !visible.includes(key) && !hidden.includes(key));

  return [
    ...[...visible, ...rest].map((key) => legacyBlock(key, false)),
    ...hidden.map((key) => legacyBlock(key, true)),
  ];
}

/** A home: ordem e visibilidade que `/admin/paginas` já guardava (`getSectionLayout`). */
export function defaultHomeBlocks(layout: { visible: string[]; hidden: string[] }): Block[] {
  return defaultBlocksFor(LEGACY_SECTION_KEYS, layout);
}

function legacyBlock(key: string, hidden: boolean): Block {
  return { id: newBlockId(), type: "secao", props: { key }, ...(hidden ? { hidden: true } : {}) };
}
