import type { NavTabOverride } from "@/features/game/tabs";
import { backendAsset, publicApiGet } from "@/lib/publicApi";

/**
 * A personalização das abas, para a LOJA.
 *
 * ── Por que num arquivo separado de `list.ts` ──────────────────────────────
 * `list.ts` importa `serverApi`, que importa `next/headers`. A vitrine chega
 * aqui por `features/game/content.ts`, e `content.ts` é importado por
 * `ProductCard.tsx` — que é CLIENT component. O Next então tenta levar
 * `next/headers` para o bundle do navegador e o build quebra com "You're
 * importing a component that needs next/headers".
 *
 * É a mesma armadilha que já separou `admin/products/catalog.ts` de `list.ts`,
 * e que voltou a morder aqui. A regra: leitura PÚBLICA (sem cookie) nunca mora
 * no mesmo arquivo que leitura autenticada.
 *
 * Lista vazia em qualquer imprevisto — e vazio aqui significa exatamente "usa
 * tudo do código", que é o estado normal de uma loja que nunca abriu a tela de
 * edição de sessões. Fail secure sem tratamento especial.
 */
export async function getNavTabs(): Promise<NavTabOverride[]> {
  const data = await publicApiGet<NavTabOverride[]>("/nav-tabs");
  if (!Array.isArray(data)) return [];
  return data.map((tab) => ({ ...tab, iconUrl: backendAsset(tab.iconUrl) }));
}
