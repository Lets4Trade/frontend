import type { NavTabOverride } from "@/features/game/tabs";
import { backendAsset } from "@/lib/publicApi";
import { apiGet } from "@/lib/serverApi";

/**
 * Leitura das personalizações de "Edição de sessões", a partir do SERVIDOR.
 *
 * SÓ a leitura do PAINEL. A leitura pública das abas vive em `navTabs.ts`,
 * porque este arquivo importa `serverApi` — que importa `next/headers` — e a
 * vitrine chega às abas por um caminho que passa por client component. Misturar
 * as duas quebrou o build uma vez; ver o comentário em `navTabs.ts`.
 *
 * Os caminhos de arte viram URL absoluta AQUI, na fronteira: o backend guarda
 * `/uploads/…` e servi-lo pelo Next daria 404.
 */

export type SectionContent = {
  key: string;
  title?: string | null;
  /** As duas linhas curtas extras e o texto longo. Ver `SiteSectionContent`. */
  subtitle?: string | null;
  footnote?: string | null;
  body?: string | null;
  imageUrl?: string | null;
};

/** Um item de lista de sessão, como o painel o edita. */
export type SectionItem = {
  id: string;
  title?: string | null;
  body?: string | null;
  imageUrl?: string | null;
  secondaryImageUrl?: string | null;
  href?: string | null;
  isActive: boolean;
};

export type SectionsSnapshot = {
  sections: SectionContent[];
  tabs: NavTabOverride[];
};

/** As duas listas que a tela do painel edita. */
export async function getSectionsAdmin(): Promise<SectionsSnapshot> {
  const result = await apiGet<SectionsSnapshot>("/admin/sections");
  if (!result.ok) return { sections: [], tabs: [] };

  return {
    sections: (result.data.sections ?? []).map((section) => ({
      ...section,
      imageUrl: backendAsset(section.imageUrl),
    })),
    tabs: (result.data.tabs ?? []).map(withAbsoluteIcon),
  };
}

function withAbsoluteIcon(tab: NavTabOverride): NavTabOverride {
  return { ...tab, iconUrl: backendAsset(tab.iconUrl) };
}
