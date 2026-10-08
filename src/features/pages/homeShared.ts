/**
 * SEÇÕES DA HOME que outras páginas podem usar PRONTAS (2026-10-08, pedido do
 * usuário: "puxar o bloco inteiro pronto"; o exemplo foi as reviews da home na
 * Fidelidade).
 *
 * Não são cópias: entram como bloco `secao` com uma destas chaves, e o conteúdo
 * é LIDO da home na hora de desenhar (`homeSharedNodes`). Editou na home, muda
 * em toda página que a usa. Por isso o painel do bloco só leva até a home.
 *
 * A página de jogo tem as suas (`homeVideo`/`homeReviews` em `game/sections`),
 * desenhadas na moldura fixa dela; estas são para as páginas de largura fluida.
 *
 * Espelha `HOME_SHARED_SECTION_KEYS` do backend (`pages/blocks.schema.ts`).
 */
export const HOME_SHARED = {
  homeVideo: { source: "video", label: "Vídeo (da home)" },
  homeReviews: { source: "reviews", label: "Reviews (da home)" },
  homeEquipe: { source: "equipe", label: "Equipe (da home)" },
  homeGuias: { source: "guias", label: "Guias (da home)" },
  homeFaq: { source: "faq", label: "Dúvidas (da home)" },
} as const;

export type HomeSharedKey = keyof typeof HOME_SHARED;

export const HOME_SHARED_KEYS = Object.keys(HOME_SHARED) as HomeSharedKey[];

export const HOME_SHARED_LABELS: Record<string, string> = Object.fromEntries(
  HOME_SHARED_KEYS.map((key) => [key, HOME_SHARED[key].label]),
);

export function isHomeSharedKey(key: string): key is HomeSharedKey {
  return Object.prototype.hasOwnProperty.call(HOME_SHARED, key);
}

/** A página publicada usa alguma? Só então vale ler o conteúdo da home. */
export function usesHomeShared(blocks: readonly { type: string; props?: unknown }[]): boolean {
  return blocks.some(
    (block) =>
      block.type === "secao" &&
      typeof (block.props as { key?: unknown })?.key === "string" &&
      isHomeSharedKey((block.props as { key: string }).key),
  );
}
