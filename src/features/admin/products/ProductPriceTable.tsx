"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";
import { ACTION_FAILED_MESSAGE, runAction } from "@/lib/safeAction";
import type { AdminGame } from "../catalog";
import { saveProductPricesAction } from "./actions";
import { categorySelectOptions } from "./categoryOptions";
import type { OrderableProduct } from "./ordering";
import {
  BIG_CHANGE_RATIO,
  NAME_MAX,
  NO_CATEGORY,
  applyPercent,
  buildRowChanges,
  categoriesInScope,
  categoryWithChildren,
  changeRatio,
  formatPriceInput,
  parseNameInput,
  parsePercent,
  parsePriceInput,
} from "./prices";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 4 });
const pct = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1, signDisplay: "always" });

type Server = { id: string; label: string };
type Category = AdminGame["categories"][number];
type Option = { value: string; label: string };
type Saved = { priceCents: number; name: string; categoryId: string | null };
/** Colunas de texto navegáveis por Enter / ↑ / ↓. */
type Column = "name" | "price";

/**
 * "Editar preços" (2026-10-01, fora do Figma): a aba inteira numa tabela tipo
 * planilha, para a rotina de atualizar dezenas de preços por dia. Desde
 * 2026-11-04 a linha também troca NOME e CATEGORIA, e há filtro por categoria
 * (inclui as subcategorias; vai na URL como `?categoria=`).
 *
 *  - Tudo é rascunho até "SALVAR": a linha alterada fica destacada com
 *    antigo → novo e a variação; variação ≥ 50% ganha aviso (zero a mais).
 *  - Enter / ↓ / ↑ andam entre os campos da mesma coluna, como numa planilha.
 *  - "Ajustar marcados em X%" aplica sobre o preço ATUAL (não acumula);
 *    "Mover para" põe os marcados numa categoria.
 *  - Filtros (servidor, categoria) e busca só recortam a VISTA: o que foi
 *    digitado fora dela continua no rascunho e vai junto no salvar. Filtram
 *    pelo valor GRAVADO — trocar a categoria de uma linha não a faz sumir
 *    enquanto se edita.
 *  - Categoria da linha: a PRINCIPAL, só as do servidor + aba do produto, mais
 *    as globais (a mesma regra do cadastro; o backend recusa o resto). As
 *    extras se editam no produto; o filtro as considera.
 *  - O salvar é tudo ou nada; se alguém mudou um produto enquanto a tela estava
 *    aberta, nada é gravado e a mensagem diz qual.
 */
export function ProductPriceTable({
  gameId,
  tabId,
  quoted,
  packages,
  servers,
  categories,
  initialServerId,
  initialCategoryId,
  initial,
}: {
  gameId: string;
  tabId: string;
  /** Aba cotada (serviço/quantidade/pacotes): o preço é a BASE da regra. */
  quoted: boolean;
  /** Aba de pacotes: o mesmo NOME em servidores diferentes é um pacote só. */
  packages: boolean;
  servers: Server[];
  /** Todas as categorias do jogo (lista plana com escopo). */
  categories: Category[];
  initialServerId: string;
  initialCategoryId: string;
  initial: OrderableProduct[];
}) {
  const router = useRouter();
  // O valor "atual" de cada linha: começa no lido e é atualizado após salvar,
  // sem esperar o refresh da página.
  const [current, setCurrent] = useState(
    () =>
      new Map<string, Saved>(
        initial.map((item) => [
          item.id,
          { priceCents: item.priceCents, name: item.name, categoryId: item.categoryId ?? null },
        ]),
      ),
  );
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [nameDrafts, setNameDrafts] = useState<Record<string, string>>({});
  const [categoryDrafts, setCategoryDrafts] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState<Set<string>>(() => new Set());
  const [serverId, setServerId] = useState(
    servers.some((server) => server.id === initialServerId) ? initialServerId : "",
  );
  const [categoryFilter, setCategoryFilter] = useState(() =>
    initialCategoryId === NO_CATEGORY || categories.some((category) => category.id === initialCategoryId)
      ? initialCategoryId
      : "",
  );
  const [search, setSearch] = useState("");
  const [percent, setPercent] = useState("");
  const [bulkCategory, setBulkCategory] = useState("");
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const inputs = useRef(new Map<string, HTMLInputElement>());
  const toolbar = useRef<HTMLDivElement>(null);

  /** "Categoria › Subcategoria" de cada id do jogo. */
  const categoryLabels = useMemo(
    () => new Map(categorySelectOptions(categories).map((option) => [option.value, option.label])),
    [categories],
  );
  // Opções do filtro e do "Mover para": as da aba, no servidor escolhido (ou
  // em qualquer um, com "Todos os servidores").
  const filterOptions = useMemo(
    () => categorySelectOptions(categoriesInScope(categories, tabId, serverId || null, !serverId)),
    [categories, tabId, serverId],
  );
  // Filtro que saiu do recorte (trocou de servidor) vale como "Todas".
  const activeCategoryFilter =
    categoryFilter === NO_CATEGORY || filterOptions.some((option) => option.value === categoryFilter)
      ? categoryFilter
      : "";
  const filterIds = useMemo(
    () =>
      activeCategoryFilter && activeCategoryFilter !== NO_CATEGORY
        ? categoryWithChildren(categories, activeCategoryFilter)
        : null,
    [categories, activeCategoryFilter],
  );
  /** Opções de categoria da linha: só as do escopo do servidor dela. */
  const optionsByServer = useMemo(() => {
    const map = new Map<string, Option[]>();
    for (const key of ["", ...servers.map((server) => server.id)]) {
      map.set(key, categorySelectOptions(categoriesInScope(categories, tabId, key || null)));
    }
    return map;
  }, [categories, tabId, servers]);
  const rowOptions = (rowServerId: string | null | undefined) => optionsByServer.get(rowServerId ?? "") ?? [];

  const rows = useMemo(
    () => initial.map((item) => ({ ...item, ...(current.get(item.id) ?? { categoryId: item.categoryId ?? null }) })),
    [initial, current],
  );
  const visible = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return rows.filter(
      (row) =>
        (!serverId || row.serverId === serverId) &&
        (!activeCategoryFilter ||
          (activeCategoryFilter === NO_CATEGORY
            ? !row.categoryId && !row.extraCategoryIds?.length
            : // Principal OU extra (2026-11-04), como na loja.
              (!!row.categoryId && !!filterIds?.has(row.categoryId)) ||
              !!row.extraCategoryIds?.some((id) => filterIds?.has(id)))) &&
        (!term || row.name.toLocaleLowerCase("pt-BR").includes(term)),
    );
  }, [rows, serverId, activeCategoryFilter, filterIds, search]);

  // Filtros na URL, sem navegar: recarregar ou mandar o link abre no mesmo
  // recorte. `replaceState` não cria uma entrada no histórico a cada clique.
  useEffect(() => {
    const url = new URL(window.location.href);
    for (const [param, value] of [
      ["servidor", serverId],
      ["categoria", activeCategoryFilter],
    ] as const) {
      if (value) url.searchParams.set(param, value);
      else url.searchParams.delete(param);
    }
    if (url.href !== window.location.href) window.history.replaceState(window.history.state, "", url);
  }, [serverId, activeCategoryFilter]);

  const { changes, invalid } = buildRowChanges(rows, {
    price: priceDrafts,
    name: nameDrafts,
    category: categoryDrafts,
  });
  const invalidSet = new Set(invalid);
  const dirty = changes.length > 0 || invalid.length > 0;
  const visibleChecked = visible.filter((row) => checked.has(row.id));
  const allVisibleChecked = visible.length > 0 && visibleChecked.length === visible.length;

  // Sair da tela com alteração não salva perde trabalho de vários minutos — o
  // navegador pergunta antes.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function setPriceDraft(id: string, value: string) {
    setPriceDrafts((prev) => ({ ...prev, [id]: value }));
    setMessage(null);
  }

  function setNameDraft(id: string, value: string) {
    setNameDrafts((prev) => ({ ...prev, [id]: value }));
    setMessage(null);
  }

  function setCategoryDraft(id: string, value: string) {
    setCategoryDrafts((prev) => ({ ...prev, [id]: value }));
    setMessage(null);
  }

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    setChecked((prev) => {
      const next = new Set(prev);
      for (const row of visible) {
        if (allVisibleChecked) next.delete(row.id);
        else next.add(row.id);
      }
      return next;
    });
  }

  function applyToChecked() {
    const value = parsePercent(percent);
    if (value === null) {
      setMessage({ tone: "error", text: "Percentual inválido. Use, por exemplo, 5 ou -2,5." });
      return;
    }
    // Só os marcados que estão NA VISTA: aplicar em linha escondida pelo filtro
    // seria mudar preço que a pessoa não está vendo.
    const targets = visibleChecked;
    if (targets.length === 0) {
      setMessage({ tone: "error", text: "Marque os produtos que devem receber o ajuste." });
      return;
    }
    const next: Record<string, string> = {};
    let skipped = 0;
    for (const row of targets) {
      const cents = applyPercent(row.priceCents, value);
      if (cents === null) skipped += 1;
      else next[row.id] = formatPriceInput(cents);
    }
    setPriceDrafts((prev) => ({ ...prev, ...next }));
    setMessage(
      skipped > 0
        ? { tone: "error", text: `${skipped} produto(s) ficariam fora da faixa permitida e não foram ajustados.` }
        : null,
    );
  }

  /**
   * "Mover para": os marcados NA VISTA vão para a categoria escolhida — só os
   * de servidor onde ela vale; os outros ficam como estão e a mensagem conta.
   */
  function moveChecked() {
    if (!bulkCategory) {
      setMessage({ tone: "error", text: "Escolha a categoria de destino." });
      return;
    }
    const targets = visibleChecked;
    if (targets.length === 0) {
      setMessage({ tone: "error", text: "Marque os produtos que devem mudar de categoria." });
      return;
    }
    const value = bulkCategory === NO_CATEGORY ? "" : bulkCategory;
    const next: Record<string, string> = {};
    let skipped = 0;
    for (const row of targets) {
      if (value && !rowOptions(row.serverId).some((option) => option.value === value)) skipped += 1;
      else next[row.id] = value;
    }
    setCategoryDrafts((prev) => ({ ...prev, ...next }));
    setMessage(
      skipped > 0
        ? {
            tone: "error",
            text: `${skipped} produto(s) são de um servidor onde essa categoria não vale e ficaram como estavam.`,
          }
        : null,
    );
  }

  function discard() {
    setPriceDrafts({});
    setNameDrafts({});
    setCategoryDrafts({});
    setMessage(null);
  }

  /** Enter / ↓ / ↑ andam entre os campos visíveis da MESMA coluna. */
  function onFieldKey(event: KeyboardEvent<HTMLInputElement>, index: number, column: Column) {
    const step = event.key === "Enter" || event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const target = visible[index + (event.shiftKey && event.key === "Enter" ? -1 : step)];
    const input = target ? inputs.current.get(`${column}:${target.id}`) : undefined;
    // O `onFocus` do campo cuida de rolar (e de selecionar o texto).
    input?.focus({ preventScroll: true });
  }

  /**
   * Mantém o campo em edição À VISTA: a barra fixa de cima é alta no celular,
   * e o "rolar até o campo" do navegador o deixaria atrás dela.
   */
  function keepVisible(input: HTMLInputElement) {
    const barBottom = toolbar.current?.getBoundingClientRect().bottom ?? 0;
    const box = input.getBoundingClientRect();
    const top = Math.max(barBottom, 0) + 12;
    const bottom = window.innerHeight - 12;
    if (box.top < top) window.scrollBy({ top: box.top - top });
    else if (box.bottom > bottom) window.scrollBy({ top: box.bottom - bottom });
  }

  function save() {
    if (invalid.length > 0) {
      setMessage({ tone: "error", text: `Corrija ${invalid.length} linha(s) inválida(s) antes de salvar.` });
      return;
    }
    if (changes.length === 0) return;
    startTransition(async () => {
      const result = await runAction(() => saveProductPricesAction(gameId, changes), {
        ok: false as const,
        message: ACTION_FAILED_MESSAGE,
      });
      if (!result.ok) {
        setMessage({ tone: "error", text: result.message });
        return;
      }
      setCurrent((prev) => {
        const next = new Map(prev);
        for (const change of changes) {
          const saved = prev.get(change.id);
          if (!saved) continue;
          next.set(change.id, {
            priceCents: change.priceCents ?? saved.priceCents,
            name: change.name ?? saved.name,
            categoryId: change.categoryId === undefined ? saved.categoryId : change.categoryId,
          });
        }
        return next;
      });
      setPriceDrafts({});
      setNameDrafts({});
      setCategoryDrafts({});
      setMessage({
        tone: "ok",
        text: `${result.saved} produto${result.saved === 1 ? "" : "s"} salvo${result.saved === 1 ? "" : "s"}. A loja já mostra as mudanças.`,
      });
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-[16px]">
      {/* Filtros da vista */}
      <div className="flex flex-wrap items-center gap-[10px]">
        {servers.length > 0 ? (
          <nav aria-label="Filtrar por servidor" className="flex flex-wrap gap-[8px]">
            <FilterPill active={serverId === ""} onClick={() => setServerId("")}>
              Todos os servidores
            </FilterPill>
            {servers.map((server) => (
              <FilterPill key={server.id} active={serverId === server.id} onClick={() => setServerId(server.id)}>
                {server.label}
              </FilterPill>
            ))}
          </nav>
        ) : null}
        <div className="ml-auto flex w-full flex-wrap items-center gap-[10px] sm:w-auto">
          {filterOptions.length > 0 ? (
            <select
              value={activeCategoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              aria-label="Filtrar por categoria"
              className={cn(
                "h-[36px] min-w-0 flex-1 rounded-full border bg-black/30 px-[14px] font-poppins text-[12px] font-bold text-white sm:max-w-[280px] sm:flex-none",
                activeCategoryFilter ? "border-brand-orange" : "border-white/10",
              )}
            >
              <option value="">Todas as categorias</option>
              <option value={NO_CATEGORY}>Sem categoria</option>
              {filterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : null}
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar produto"
            aria-label="Buscar produto"
            className="h-[36px] w-full rounded-full border border-white/10 bg-black/30 px-[16px] font-poppins text-[13px] text-white placeholder:text-white/40 sm:w-[220px]"
          />
        </div>
      </div>

      {/* Barra fixa: ajustes em lote + salvar sempre à mão depois de rolar. */}
      <div
        ref={toolbar}
        className="sticky top-[12px] z-20 flex flex-wrap items-center gap-[12px] rounded-[20px] border border-brand-border bg-brand-surface/95 px-[20px] py-[12px] backdrop-blur-[10px]"
      >
        {/* Celular (2026-11-04): a barra é fixa e, com os dois lotes, comia
            ~30% da tela. Lá eles só aparecem depois de marcar uma linha. */}
        <div className={cn("flex flex-wrap items-center gap-[8px]", visibleChecked.length === 0 && "hidden sm:flex")}>
          <label htmlFor="ajuste-percentual" className="font-poppins text-[13px] text-brand-fg-muted">
            Ajustar marcados ({visibleChecked.length}) em
          </label>
          <input
            id="ajuste-percentual"
            inputMode="decimal"
            value={percent}
            onChange={(event) => setPercent(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                applyToChecked();
              }
            }}
            placeholder="+5"
            className="h-[36px] w-[70px] rounded-[10px] border border-white/10 bg-black/30 px-[10px] text-right font-poppins text-[13px] text-white"
          />
          <span className="font-poppins text-[13px] text-brand-fg-muted">%</span>
          <button
            type="button"
            onClick={applyToChecked}
            disabled={visibleChecked.length === 0}
            className="h-[36px] rounded-full border border-white/15 px-[14px] font-poppins text-[12px] font-bold text-white/85 transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            APLICAR
          </button>
        </div>

        {filterOptions.length > 0 ? (
          <div className={cn("flex flex-wrap items-center gap-[8px]", visibleChecked.length === 0 && "hidden sm:flex")}>
            <label htmlFor="mover-categoria" className="font-poppins text-[13px] text-brand-fg-muted">
              Mover para
            </label>
            <select
              id="mover-categoria"
              value={bulkCategory}
              onChange={(event) => setBulkCategory(event.target.value)}
              className="h-[36px] max-w-[220px] rounded-[10px] border border-white/10 bg-black/30 px-[10px] font-poppins text-[13px] text-white"
            >
              <option value="">Categoria…</option>
              <option value={NO_CATEGORY}>Sem categoria</option>
              {filterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={moveChecked}
              disabled={visibleChecked.length === 0 || !bulkCategory}
              className="h-[36px] rounded-full border border-white/15 px-[14px] font-poppins text-[12px] font-bold text-white/85 transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              MOVER
            </button>
          </div>
        ) : null}

        <div className="ml-auto flex flex-wrap items-center gap-[10px]">
          {message ? (
            <span
              role="status"
              className={cn("font-helvetica text-[13px]", message.tone === "ok" ? "text-brand-rating" : "text-red-9")}
            >
              {message.text}
            </span>
          ) : dirty ? (
            <span className="font-helvetica text-[13px] text-brand-orange">
              {changes.length} alterado{changes.length === 1 ? "" : "s"}
              {invalid.length ? ` · ${invalid.length} inválido${invalid.length === 1 ? "" : "s"}` : ""}
            </span>
          ) : null}
          <button
            type="button"
            disabled={!dirty || pending}
            onClick={discard}
            className="h-[40px] rounded-full border border-white/15 px-[18px] font-poppins text-[13px] font-bold text-white/80 transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            DESCARTAR
          </button>
          <button
            type="button"
            disabled={changes.length === 0 || invalid.length > 0 || pending}
            onClick={save}
            className="h-[40px] rounded-full bg-[image:var(--brand-orange-gradient)] px-[22px] font-poppins text-[13px] font-bold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pending
              ? "SALVANDO..."
              : changes.length > 0
                ? `SALVAR ${changes.length} PRODUTO${changes.length === 1 ? "" : "S"}`
                : "SALVAR"}
          </button>
        </div>
      </div>

      <div className="relative overflow-x-auto rounded-[20px] border border-brand-border bg-[image:var(--brand-surface-fill)]">
        <table className="w-full border-collapse font-poppins text-[13px] sm:min-w-[860px]">
          <thead>
            <tr className="border-b border-white/10 text-left text-[12px] text-brand-fg-subtle">
              <th className="w-[36px] px-[10px] py-[10px] sm:w-[44px] sm:px-[14px]">
                <input
                  type="checkbox"
                  checked={allVisibleChecked}
                  onChange={toggleAllVisible}
                  aria-label="Marcar todos os produtos visíveis"
                  className="size-[16px] accent-brand-orange"
                />
              </th>
              <th className="py-[10px] font-bold">Produto</th>
              <th className="hidden w-[220px] px-[10px] py-[10px] font-bold sm:table-cell">Categoria</th>
              <th className="hidden py-[10px] font-bold lg:table-cell">Servidor</th>
              <th className="hidden py-[10px] text-right font-bold sm:table-cell">
                {quoted ? "Base atual" : "Preço atual"}
              </th>
              <th className="w-[124px] px-[6px] py-[10px] text-right font-bold sm:w-[140px] sm:px-[14px]">Novo (R$)</th>
              <th className="w-[58px] py-[10px] pr-[10px] text-right font-bold sm:w-[80px] sm:pr-[14px]">Var.</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-[40px] text-center text-brand-fg-subtle">
                  Nenhum produto com esse filtro.
                </td>
              </tr>
            ) : (
              visible.map((row, index) => {
                const draft = priceDrafts[row.id];
                const parsed = draft === undefined ? row.priceCents : parsePriceInput(draft);
                const priceInvalid = draft !== undefined && parsed === null;
                const changed = parsed !== null && parsed !== row.priceCents;
                const ratio = changed ? changeRatio(row.priceCents, parsed) : 0;
                const big = changed && Math.abs(ratio) >= BIG_CHANGE_RATIO;

                const nameDraft = nameDrafts[row.id];
                const nameInvalid = nameDraft !== undefined && parseNameInput(nameDraft) === null;
                const nameChanged = nameDraft !== undefined && !nameInvalid && nameDraft.trim() !== row.name;

                const categoryValue = categoryDrafts[row.id] ?? row.categoryId ?? "";
                const categoryChanged = categoryValue !== (row.categoryId ?? "");
                const category = (
                  <CategorySelect
                    value={categoryValue}
                    options={rowOptions(row.serverId)}
                    savedId={row.categoryId}
                    savedLabel={row.categoryId ? (categoryLabels.get(row.categoryId) ?? "Categoria removida") : ""}
                    changed={categoryChanged}
                    onChange={(value) => setCategoryDraft(row.id, value)}
                    label={`Categoria de ${row.name}${row.serverLabel ? ` (${row.serverLabel})` : ""}`}
                  />
                );

                return (
                  <tr
                    key={row.id}
                    className={cn(
                      "border-b border-white/5 last:border-b-0",
                      (changed || nameChanged || categoryChanged) && "bg-brand-orange/[0.07]",
                      invalidSet.has(row.id) && "bg-red-9/10",
                    )}
                  >
                    <td className="px-[10px] py-[6px] sm:px-[14px]">
                      <input
                        type="checkbox"
                        checked={checked.has(row.id)}
                        onChange={() => toggle(row.id)}
                        aria-label={`Marcar ${row.name}`}
                        tabIndex={-1}
                        className="size-[16px] accent-brand-orange"
                      />
                    </td>
                    <td className="py-[6px] pr-[6px] text-white sm:min-w-[200px] sm:pr-[10px]">
                      <input
                        ref={(element) => {
                          if (element) inputs.current.set(`name:${row.id}`, element);
                          else inputs.current.delete(`name:${row.id}`);
                        }}
                        autoComplete="off"
                        maxLength={NAME_MAX}
                        value={nameDraft ?? row.name}
                        onChange={(event) => setNameDraft(row.id, event.target.value)}
                        onFocus={(event) => keepVisible(event.target)}
                        onKeyDown={(event) => onFieldKey(event, index, "name")}
                        aria-label={`Nome de ${row.name}${row.serverLabel ? ` (${row.serverLabel})` : ""}`}
                        aria-invalid={nameInvalid || undefined}
                        title={nameInvalid ? "O nome precisa ter de 2 a 160 caracteres." : undefined}
                        className={cn(
                          "h-[34px] w-full min-w-0 rounded-[10px] border bg-black/30 px-[10px] text-white",
                          nameInvalid
                            ? "border-red-9"
                            : nameChanged
                              ? "border-brand-orange/70 font-bold"
                              : "border-white/10",
                        )}
                      />
                      {/* Telas estreitas: categoria, preço atual e servidor sob
                          o nome — as colunas somem para os campos caberem. */}
                      <div className="mt-[4px] sm:hidden">{category}</div>
                      <span className="mt-[2px] block truncate text-[11px] text-brand-fg-subtle sm:hidden">
                        <span className={changed ? "line-through" : undefined}>{brl.format(row.priceCents / 100)}</span>
                        {" · "}
                        {row.serverLabel ?? "Sem servidor"}
                      </span>
                      <span className="mt-[2px] hidden truncate text-[11px] text-brand-fg-subtle sm:block lg:hidden">
                        {row.serverLabel ?? "Sem servidor"}
                      </span>
                    </td>
                    <td className="hidden px-[10px] py-[6px] sm:table-cell">{category}</td>
                    <td className="hidden py-[6px] text-brand-fg-subtle lg:table-cell">
                      {row.serverLabel ?? "Sem servidor"}
                    </td>
                    <td
                      className={cn(
                        "hidden py-[6px] text-right sm:table-cell",
                        changed ? "text-brand-fg-subtle line-through" : "text-white",
                      )}
                    >
                      {brl.format(row.priceCents / 100)}
                    </td>
                    <td className="px-[6px] py-[6px] align-top sm:px-[14px] sm:align-middle">
                      <input
                        ref={(element) => {
                          if (element) inputs.current.set(`price:${row.id}`, element);
                          else inputs.current.delete(`price:${row.id}`);
                        }}
                        inputMode="decimal"
                        autoComplete="off"
                        value={draft ?? formatPriceInput(row.priceCents)}
                        onChange={(event) => setPriceDraft(row.id, event.target.value)}
                        onFocus={(event) => {
                          event.target.select();
                          keepVisible(event.target);
                        }}
                        onKeyDown={(event) => onFieldKey(event, index, "price")}
                        aria-label={`Novo preço de ${row.name}${row.serverLabel ? ` (${row.serverLabel})` : ""}`}
                        aria-invalid={priceInvalid || undefined}
                        className={cn(
                          "h-[34px] w-full rounded-[10px] border bg-black/30 px-[8px] text-right text-white sm:px-[10px]",
                          priceInvalid
                            ? "border-red-9"
                            : changed
                              ? "border-brand-orange/70 font-bold"
                              : "border-white/10",
                        )}
                      />
                    </td>
                    <td
                      className={cn(
                        "py-[6px] pr-[10px] text-right align-top text-[12px] sm:pr-[14px] sm:align-middle",
                        priceInvalid
                          ? "text-red-9"
                          : big
                            ? "font-bold text-red-9"
                            : changed
                              ? "text-brand-orange"
                              : "text-white/30",
                      )}
                      title={big ? "Variação grande. Confira se não sobrou ou faltou um zero." : undefined}
                    >
                      <span className="inline-block leading-[34px]">
                        {priceInvalid ? "inválido" : changed ? pct.format(ratio) : "-"}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <p className="font-poppins text-[12px] text-brand-fg-subtle">
        Enter ou ↓ vai para o próximo campo da mesma coluna (nome ou preço), ↑ volta. O ajuste em % é sobre o preço
        atual e, como o &quot;Mover para&quot;, vale só para os marcados que estão na tela. Cada produto só aceita as
        categorias do servidor dele. Nada muda na loja até salvar.
        {quoted ? " Nesta aba o valor é a base da regra de preço de cada produto." : ""}
        {packages
          ? " Nesta aba, o MESMO nome em servidores diferentes forma um pacote só: ao renomear, renomeie em todos os servidores."
          : ""}
      </p>
    </div>
  );
}

/**
 * Select de categoria da linha. NATIVO: são até 300 linhas, um popover por
 * linha pesaria na tela, e o nativo já anda com as setas. Se a categoria
 * gravada não está entre as opções (o escopo mudou depois), ela aparece mesmo
 * assim, marcada, para a linha não fingir "Sem categoria".
 */
function CategorySelect({
  value,
  options,
  savedId,
  savedLabel,
  changed,
  onChange,
  label,
}: {
  value: string;
  options: Option[];
  savedId: string | null;
  savedLabel: string;
  changed: boolean;
  onChange: (value: string) => void;
  label: string;
}) {
  const outOfScope = !!savedId && !options.some((option) => option.value === savedId);
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={label}
      className={cn(
        "h-[34px] w-full min-w-0 rounded-[10px] border bg-black/30 px-[8px] text-[12px]",
        changed ? "border-brand-orange/70 font-bold text-white" : "border-white/10",
        !changed && (value ? "text-white" : "text-white/50"),
      )}
    >
      <option value="">Sem categoria</option>
      {outOfScope && savedId ? <option value={savedId}>{savedLabel} (fora do escopo)</option> : null}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex h-[36px] items-center rounded-full border px-[16px] font-poppins text-[12px] font-bold transition-colors",
        active
          ? "border-brand-orange bg-brand-orange/15 text-white"
          : "border-white/10 text-white/70 hover:border-white/30 hover:text-white",
      )}
    >
      {children}
    </button>
  );
}
