import { siteSection } from "@/features/site/sections";

/**
 * A dimensão recomendada de uma imagem editável no modo "Textos e imagens"
 * (2026-10-06): no editor, clicar na imagem abre direto o seletor de arquivo,
 * então a dica aparece ao PASSAR o mouse (atributo `title`).
 *
 * Os textos vêm do MESMO catálogo de `sections.ts` que os formulários usam
 * (`imageHint`, `list.image`, `list.secondaryImage`) — uma fonte só, para a
 * dica do desenho e a do formulário nunca discordarem. Só o que não é seção do
 * catálogo (as artes do banner do hero, a foto do CEO) tem texto próprio aqui.
 */
const EXTRA_HINTS: Record<string, string> = {
  "home:hero-banner": "Arte do banner (859×643, termina acima das barrinhas).",
  "home:video|secondary": "Foto do CEO (quadrada, 120×120).",
};

/** Lê os atributos `data-edit-*` de um elemento e devolve a dica, ou `null`. */
export function imageHintFor(dataset: DOMStringMap): string | null {
  if (dataset.editImage) {
    const key = dataset.editImage;
    if (dataset.editSlot === "secondary") return EXTRA_HINTS[`${key}|secondary`] ?? null;
    return siteSection(key)?.section.imageHint ?? null;
  }

  if (dataset.editItem) {
    const [sectionKey, , field] = dataset.editItem.split("|");
    if (field !== "image" && field !== "secondaryImage") return null;
    if (EXTRA_HINTS[sectionKey] && field === "image") return EXTRA_HINTS[sectionKey];
    const list = siteSection(sectionKey)?.section.list;
    return (field === "image" ? list?.image : list?.secondaryImage) ?? null;
  }

  if (dataset.editAdd) {
    const [sectionKey] = dataset.editAdd.split("|");
    return EXTRA_HINTS[sectionKey] ?? null;
  }

  return null;
}
