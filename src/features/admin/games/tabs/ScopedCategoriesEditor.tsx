"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toastError, toastOk } from "@/components/ui/Toasts";
import { CategoryTreePanel } from "@/features/admin/builder/BuilderPanels";
import { draftCategoriesToPayload } from "@/features/admin/builder/payload";
import type { BuilderCategory, BuilderListItem } from "@/features/admin/builder/types";
import { toCategoryTree } from "@/features/game/categoryTree";
import { ACTION_FAILED_MESSAGE, runAction } from "@/lib/safeAction";
import { saveTabCategoriesAction } from "./actions";
import type { ScopedCategoryRow } from "./types";

/**
 * Categorias de UM escopo — aba + servidor (ou "todos os servidores").
 *
 * Reaproveita o `CategoryTreePanel` do Builder: mesmos gestos, mesmos dois
 * níveis, mesma limpeza no envio. A diferença é o destino — aqui o `PUT
 * .../tabs/:tabId/categories`, troca COMPLETA daquele escopo, que nunca toca as
 * categorias globais do Builder nem as de outro escopo.
 *
 * A página remonta este editor por `key` a cada troca de escopo, então o
 * rascunho de um escopo nunca vaza para o outro.
 */
export function ScopedCategoriesEditor({
  gameId,
  tabId,
  serverId,
  initial,
}: {
  gameId: string;
  tabId: string;
  serverId: string | null;
  initial: ScopedCategoryRow[];
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(() => toDraft(initial));
  const [draft, setDraft] = useState(saved);
  const [pending, startTransition] = useTransition();

  const dirty =
    JSON.stringify(draftCategoriesToPayload(draft)) !== JSON.stringify(draftCategoriesToPayload(saved));

  function save() {
    startTransition(async () => {
      const result = await runAction(
        () => saveTabCategoriesAction(gameId, tabId, serverId, draftCategoriesToPayload(draft)),
        { ok: false, reason: "error", message: ACTION_FAILED_MESSAGE },
      );
      if (!result.ok) {
        toastError(result.message ?? "Não foi possível salvar as categorias.");
        return;
      }
      // Recarregado da resposta: as linhas novas ganham id, e sem ele o próximo
      // salvamento tentaria criá-las de novo.
      const fresh = toDraft(result.data);
      setSaved(fresh);
      setDraft(fresh);
      toastOk("Categorias salvas.");
      router.refresh();
    });
  }

  return (
    <div className="flex max-w-[900px] flex-col gap-[25px]">
      <CategoryTreePanel items={draft} onChange={setDraft} />
      <div className="flex flex-wrap items-center gap-[15px]">
        <button
          type="button"
          onClick={save}
          disabled={pending || !dirty}
          className="h-[50px] w-[315px] rounded-full bg-[image:var(--brand-orange-gradient)] font-poppins text-[14px] font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? "SALVANDO…" : "SALVAR CATEGORIAS"}
        </button>
        {dirty ? (
          <p className="font-poppins text-[13px] text-brand-orange">Alterações ainda não salvas.</p>
        ) : null}
      </div>
    </div>
  );
}

function toDraft(rows: ScopedCategoryRow[]): BuilderCategory[] {
  const toItem = (row: { id: string; label: string; slug: string }): BuilderListItem => ({
    id: row.id,
    label: row.label,
    slug: row.slug,
    key: row.id,
  });
  return toCategoryTree(rows).map((row) => ({ ...toItem(row), children: row.children.map(toItem) }));
}
