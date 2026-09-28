import type { Block, PageRefs } from "../types";

/**
 * Mensagens entre o editor (`/admin/paginas`) e a prévia no iframe
 * (`/previa/[slug]`). Os dois lados conferem a ORIGEM (a mesma do site) e o
 * `source` antes de ler qualquer coisa — mensagem de outra janela é ignorada.
 */

export type EditorToPreview = {
  source: "l4t-editor";
  type: "render";
  blocks: Block[];
  refs: PageRefs;
  selectedId: string | null;
};

export type PreviewToEditor =
  | { source: "l4t-preview"; type: "ready" }
  | { source: "l4t-preview"; type: "select"; id: string };

export function isEditorMessage(data: unknown): data is EditorToPreview {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as { source?: unknown }).source === "l4t-editor" &&
    (data as { type?: unknown }).type === "render" &&
    Array.isArray((data as { blocks?: unknown }).blocks)
  );
}

export function isPreviewMessage(data: unknown): data is PreviewToEditor {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as { source?: unknown }).source === "l4t-preview"
  );
}
