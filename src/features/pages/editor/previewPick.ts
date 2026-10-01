import { settingsHref } from "@/features/admin/settings/catalog";
import { siteSection } from "@/features/site/sections";
import { STATIC_PAGES, type ContentPageDef } from "../registry";

/**
 * Clicar na PRÉVIA abre o campo daquele pedaço (2026-10-01).
 *
 * O cabeçalho e o rodapé marcam seus pedaços com `data-admin-section` (a chave
 * cheia, ex. `layout:header-busca`). O editor injeta, no documento do iframe
 * (mesma origem — `/previa` é a única rota enquadrável), um contorno ao passar
 * o mouse e um clique que, em vez de navegar, escolhe a sessão.
 *
 * Na loja os atributos são inertes: nada os lê fora do painel.
 */

export const MARKER = "data-admin-section";

export type PickTarget = { kind: "select"; suffix: string } | { kind: "go"; href: string } | null;

/** Para onde leva um clique numa sessão marcada, a partir da página em edição. */
export function resolvePick(fullKey: string, current: ContentPageDef): PickTarget {
  const separator = fullKey.indexOf(":");
  if (separator < 0) return null;
  const catalogPage = fullKey.slice(0, separator);
  const suffix = fullKey.slice(separator + 1);

  if (catalogPage === current.catalogPage && (current.sectionKeys ?? []).includes(suffix)) {
    return { kind: "select", suffix };
  }
  const settings = catalogPage === "layout" ? settingsHref(suffix) : null;
  if (settings) return { kind: "go", href: settings };

  const owner = STATIC_PAGES.find(
    (page) => page.kind === "content" && page.catalogPage === catalogPage && page.sectionKeys?.includes(suffix),
  );
  if (owner) {
    const search = new URLSearchParams({ pagina: owner.slug, secao: suffix });
    return { kind: "go", href: `/admin/paginas?${search.toString()}` };
  }
  return null;
}

/** Nome do pedaço no contorno ("Texto da busca"). */
export function pickLabel(fullKey: string): string {
  const found = siteSection(fullKey);
  if (found) return found.section.label;
  return fullKey;
}

/** Caixa de um pedaço marcado — `display: contents` não tem caixa própria. */
export function markerRect(element: Element): DOMRect | null {
  const view = element.ownerDocument.defaultView;
  const own = element.getBoundingClientRect();
  const isContents = view?.getComputedStyle(element).display === "contents";
  if (!isContents && (own.width > 0 || own.height > 0)) return own;

  const rects = [...element.children].map((child) => child.getBoundingClientRect()).filter((r) => r.width > 0 || r.height > 0);
  if (rects.length === 0) return null;
  const left = Math.min(...rects.map((r) => r.left));
  const top = Math.min(...rects.map((r) => r.top));
  const right = Math.max(...rects.map((r) => r.right));
  const bottom = Math.max(...rects.map((r) => r.bottom));
  return new DOMRect(left, top, right - left, bottom - top);
}

const STYLE_ID = "admin-preview-pick";
const OVERLAY_ID = "admin-preview-pick-box";

/**
 * Liga o "clique para editar" num documento de prévia. Devolve a limpeza.
 *
 * - todo link da prévia deixa de navegar (sair da página no iframe só
 *   confunde quem edita);
 * - pedaço marcado: contorno no hover, `onPick(chave)` no clique;
 * - `selected` ganha contorno fixo.
 */
export function installPreviewPicker(
  doc: Document,
  { onPick, selected }: { onPick: (fullKey: string) => void; selected: string | null },
): () => void {
  if (!doc.getElementById(STYLE_ID)) {
    const style = doc.createElement("style");
    style.id = STYLE_ID;
    // O selo do cabeçalho é `pointer-events-none` na loja; aqui precisa ouvir clique.
    style.textContent = `
      [${MARKER}] { pointer-events: auto !important; cursor: pointer !important; }
      [data-admin-selected]:not(.contents), [data-admin-selected].contents > * {
        outline: 3px solid #ff7a00 !important; outline-offset: 6px; border-radius: 6px;
      }
      #${OVERLAY_ID} {
        position: fixed; z-index: 2147483647; pointer-events: none; display: none;
        border: 2px dashed #ff7a00; border-radius: 8px; background: rgba(255,122,0,.08);
      }
      #${OVERLAY_ID} span {
        position: absolute; left: -2px; top: -30px; white-space: nowrap;
        background: #ff7a00; color: #000; font: 700 14px/1 system-ui, sans-serif;
        padding: 7px 10px; border-radius: 6px;
      }
      #${OVERLAY_ID}[data-below] span { top: auto; bottom: -30px; }`;
    doc.head.appendChild(style);
  }

  let overlay = doc.getElementById(OVERLAY_ID);
  if (!overlay) {
    overlay = doc.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.appendChild(doc.createElement("span"));
    doc.body.appendChild(overlay);
  }
  const box = overlay;

  doc.querySelectorAll("[data-admin-selected]").forEach((element) => element.removeAttribute("data-admin-selected"));
  if (selected) {
    doc.querySelectorAll(`[${MARKER}="${CSS.escape(selected)}"]`).forEach((element) => element.setAttribute("data-admin-selected", ""));
  }

  const markerOf = (target: EventTarget | null) =>
    target instanceof doc.defaultView!.Element ? target.closest(`[${MARKER}]`) : null;

  const onMove = (event: MouseEvent) => {
    const marker = markerOf(event.target);
    const rect = marker ? markerRect(marker) : null;
    if (!marker || !rect) {
      box.style.display = "none";
      return;
    }
    Object.assign(box.style, {
      display: "block",
      left: `${rect.left - 6}px`,
      top: `${rect.top - 6}px`,
      width: `${rect.width + 12}px`,
      height: `${rect.height + 12}px`,
    });
    // Sem espaço acima (pedaço colado no topo), o rótulo vai para baixo.
    box.toggleAttribute("data-below", rect.top < 40);
    box.firstElementChild!.textContent = `Editar: ${pickLabel(marker.getAttribute(MARKER) ?? "")}`;
  };
  const hide = () => {
    box.style.display = "none";
  };
  const onClick = (event: MouseEvent) => {
    const marker = markerOf(event.target);
    const target = event.target instanceof doc.defaultView!.Element ? event.target : null;
    if (marker) {
      event.preventDefault();
      event.stopPropagation();
      onPick(marker.getAttribute(MARKER) ?? "");
      return;
    }
    if (target?.closest("a")) event.preventDefault();
  };

  doc.addEventListener("mousemove", onMove);
  doc.addEventListener("mouseleave", hide);
  doc.addEventListener("scroll", hide, true);
  doc.addEventListener("click", onClick, true);
  return () => {
    doc.removeEventListener("mousemove", onMove);
    doc.removeEventListener("mouseleave", hide);
    doc.removeEventListener("scroll", hide, true);
    doc.removeEventListener("click", onClick, true);
  };
}
