import { getGamePage } from "@/features/game/content";
import { getSectionLayout } from "@/features/site/content";
import { apiGet } from "@/lib/serverApi";
import { defaultBlocksFor, defaultHomeBlocks } from "./defaults";
import { normalizeBlocks } from "./legacy";
import type { BlocksPageDef } from "./registry";
import type { AdminPage } from "./types";

/**
 * O rascunho da página para o editor e para a prévia.
 *
 * Página que nunca foi salva volta do backend com `blocks: []` — aí o
 * rascunho inicial é a página de HOJE convertida em blocos:
 *  - home: ordem e visibilidade que o editor antigo guardava;
 *  - jogo: a ordem do Builder do jogo (etapa 10);
 *  - as outras: a ordem do desenho.
 * `null` = backend fora do ar / sem permissão: quem chama decide o que mostrar.
 */
export async function getAdminPage(page: BlocksPageDef): Promise<AdminPage | null> {
  const result = await apiGet<AdminPage>(`/admin/pages/${encodeURIComponent(page.slug)}`);
  if (!result.ok) return null;

  const data = result.data;
  // `productType` → `tabSlug` no bloco de produtos antigo (ver `legacy.ts`).
  if (Array.isArray(data.blocks) && data.blocks.length > 0) return { ...data, blocks: normalizeBlocks(data.blocks) };

  if (page.slug === "home") {
    return { ...data, blocks: defaultHomeBlocks(await getSectionLayout("home")) };
  }

  if (page.frame === "game") {
    // O `href` do registro é `/games/<slug>`: é por ele que a vitrine é lida.
    const game = await getGamePage(page.href.replace(/^\/games\//, ""));
    const visible = game?.sections ?? page.legacyKeys;
    return { ...data, blocks: defaultBlocksFor(page.legacyKeys, { visible }) };
  }

  return { ...data, blocks: defaultBlocksFor(page.legacyKeys, { visible: page.legacyKeys }) };
}
