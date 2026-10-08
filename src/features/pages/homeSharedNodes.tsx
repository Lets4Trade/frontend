import { buildHomeBlocks } from "@/features/home/homeBlocks";
import { buildMobileHomeBlocks } from "@/features/home/mobile/MobileHome";
import { getSectionItemsFor, getSectionsFor } from "@/features/site/content";
import type { LegacyNodes } from "./compose";
import { FitWidth } from "./FitWidth";
import { HOME_SHARED, HOME_SHARED_KEYS } from "./homeShared";

/** Largura do desenho de desktop da home (a faixa de conteúdo dela). */
const HOME_WIDTH = 1820;
/** Vão antes de uma seção da home numa página que não é a home. */
const SHARED_GAP = 60;

/**
 * As SEÇÕES DA HOME prontas para outra página (ver `homeShared.ts`), com os
 * dados de verdade da home: as mesmas leituras e os mesmos componentes que a
 * própria home usa (`buildHomeBlocks` / `buildMobileHomeBlocks`).
 *
 * Cada nó leva as DUAS versões e o CSS escolhe, como na home: a de celular
 * abaixo de 1024px e a de desktop acima, reduzida pelo `FitWidth` para caber
 * na coluna da página (a da home tem 1820px fixos).
 */
export async function homeSharedNodes(): Promise<LegacyNodes> {
  const [section, items] = await Promise.all([getSectionsFor("home"), getSectionItemsFor("home")]);
  const desktop = new Map(buildHomeBlocks(section, items).map((block) => [block.key, block.node]));
  const mobile = new Map(buildMobileHomeBlocks(section, items).map((block) => [block.key, block.node]));

  const nodes: LegacyNodes = {};
  for (const key of HOME_SHARED_KEYS) {
    const source = HOME_SHARED[key].source;
    const wide = desktop.get(source);
    if (!wide) continue;
    nodes[key] = {
      gap: SHARED_GAP,
      node: (
        <>
          <div className="lg:hidden">{mobile.get(source) ?? null}</div>
          <div className="hidden lg:block">
            <FitWidth width={HOME_WIDTH}>{wide}</FitWidth>
          </div>
        </>
      ),
    };
  }
  return nodes;
}
