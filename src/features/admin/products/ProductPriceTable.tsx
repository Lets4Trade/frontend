"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";
import { ACTION_FAILED_MESSAGE, runAction } from "@/lib/safeAction";
import { saveProductPricesAction } from "./actions";
import type { OrderableProduct } from "./ordering";
import {
  BIG_CHANGE_RATIO,
  applyPercent,
  buildPriceChanges,
  changeRatio,
  formatPriceInput,
  parsePercent,
  parsePriceInput,
} from "./prices";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const pct = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1, signDisplay: "always" });

type Server = { id: string; label: string };

/**
 * "Editar preços" (2026-10-01, fora do Figma): a aba inteira numa tabela tipo
 * planilha, para a rotina de atualizar dezenas de preços por dia.
 *
 *  - Tudo é rascunho até "SALVAR": a linha alterada fica destacada com
 *    antigo → novo e a variação; variação ≥ 50% ganha aviso (zero a mais).
 *  - Enter / ↓ / ↑ andam entre os campos, como numa planilha.
 *  - "Ajustar marcados em X%" aplica sobre o preço ATUAL (não acumula).
 *  - Filtro de servidor e busca só recortam a VISTA: o que foi digitado em
 *    outro servidor continua no rascunho e vai junto no salvar.
 *  - O salvar é tudo ou nada; se alguém mudou um preço enquanto a tela estava
 *    aberta, nada é gravado e a mensagem diz qual.
 */
export function ProductPriceTable({
  gameId,
  quoted,
  servers,
  initialServerId,
  initial,
}: {
  gameId: string;
  /** Aba cotada (serviço/quantidade/pacotes): o preço é a BASE da regra. */
  quoted: boolean;
  servers: Server[];
  initialServerId: string;
  initial: OrderableProduct[];
}) {
  const router = useRouter();
  // O preço "atual" de cada linha: começa no lido e é atualizado após salvar,
  // sem esperar o refresh da página.
  const [current, setCurrent] = useState(() => new Map(initial.map((item) => [item.id, item.priceCents])));
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState<Set<string>>(() => new Set());
  const [serverId, setServerId] = useState(
    servers.some((server) => server.id === initialServerId) ? initialServerId : "",
  );
  const [search, setSearch] = useState("");
  const [percent, setPercent] = useState("");
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const inputs = useRef(new Map<string, HTMLInputElement>());
  const toolbar = useRef<HTMLDivElement>(null);

  const rows = useMemo(
    () => initial.map((item) => ({ ...item, priceCents: current.get(item.id) ?? item.priceCents })),
    [initial, current],
  );
  const visible = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return rows.filter(
      (row) =>
        (!serverId || row.serverId === serverId) &&
        (!term || row.name.toLocaleLowerCase("pt-BR").includes(term)),
    );
  }, [rows, serverId, search]);

  const { changes, invalid } = buildPriceChanges(rows, drafts);
  const invalidSet = new Set(invalid);
  const dirty = changes.length > 0 || invalid.length > 0;
  const visibleChecked = visible.filter((row) => checked.has(row.id));
  const allVisibleChecked = visible.length > 0 && visibleChecked.length === visible.length;

  // Sair da tela com preço digitado e não salvo perde trabalho de vários
  // minutos — o navegador pergunta antes.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function setDraft(id: string, value: string) {
    setDrafts((prev) => ({ ...prev, [id]: value }));
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
    setDrafts((prev) => ({ ...prev, ...next }));
    setMessage(
      skipped > 0
        ? { tone: "error", text: `${skipped} produto(s) ficariam fora da faixa permitida e não foram ajustados.` }
        : null,
    );
  }

  function discard() {
    setDrafts({});
    setMessage(null);
  }

  /** Enter / ↓ / ↑ andam entre os campos de preço visíveis. */
  function onPriceKey(event: KeyboardEvent<HTMLInputElement>, index: number) {
    const step = event.key === "Enter" || event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const target = visible[index + (event.shiftKey && event.key === "Enter" ? -1 : step)];
    const input = target ? inputs.current.get(target.id) : undefined;
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
      setMessage({ tone: "error", text: `Corrija ${invalid.length} preço(s) inválido(s) antes de salvar.` });
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
        for (const change of changes) next.set(change.id, change.priceCents);
        return next;
      });
      setDrafts({});
      setMessage({
        tone: "ok",
        text: `${result.saved} preço${result.saved === 1 ? "" : "s"} salvo${result.saved === 1 ? "" : "s"}. A loja já mostra os novos.`,
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
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar produto"
          aria-label="Buscar produto"
          className="ml-auto h-[36px] w-full rounded-full border border-white/10 bg-black/30 px-[16px] font-poppins text-[13px] text-white placeholder:text-white/40 sm:w-[220px]"
        />
      </div>

      {/* Barra fixa: ajuste em lote + salvar sempre à mão depois de rolar. */}
      <div ref={toolbar} className="sticky top-[12px] z-20 flex flex-wrap items-center gap-[12px] rounded-[20px] border border-brand-border bg-brand-surface/95 px-[20px] py-[12px] backdrop-blur-[10px]">
        <div className="flex flex-wrap items-center gap-[8px]">
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
                ? `SALVAR ${changes.length} PREÇO${changes.length === 1 ? "" : "S"}`
                : "SALVAR"}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-[20px] border border-brand-border bg-[image:var(--brand-surface-fill)]">
        <table className="w-full border-collapse font-poppins text-[13px] sm:min-w-[640px]">
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
              <th className="hidden py-[10px] font-bold sm:table-cell">Servidor</th>
              <th className="hidden py-[10px] text-right font-bold sm:table-cell">{quoted ? "Base atual" : "Preço atual"}</th>
              <th className="w-[124px] px-[6px] py-[10px] text-right font-bold sm:w-[150px] sm:px-[14px]">Novo (R$)</th>
              <th className="w-[58px] pr-[10px] py-[10px] text-right font-bold sm:w-[90px] sm:pr-[14px]">Var.</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-[40px] text-center text-brand-fg-subtle">
                  Nenhum produto com esse filtro.
                </td>
              </tr>
            ) : (
              visible.map((row, index) => {
                const draft = drafts[row.id];
                const parsed = draft === undefined ? row.priceCents : parsePriceInput(draft);
                const isInvalid = invalidSet.has(row.id);
                const changed = parsed !== null && parsed !== row.priceCents;
                const ratio = changed ? changeRatio(row.priceCents, parsed) : 0;
                const big = changed && Math.abs(ratio) >= BIG_CHANGE_RATIO;
                return (
                  <tr
                    key={row.id}
                    className={cn(
                      "border-b border-white/5 last:border-b-0",
                      changed && "bg-brand-orange/[0.07]",
                      isInvalid && "bg-red-9/10",
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
                    <td className="max-w-[260px] py-[6px] text-white">
                      <span className="block truncate">{row.name}</span>
                      {/* Telas estreitas: servidor e preço atual sob o nome — as
                          colunas somem para o campo de digitar caber sem rolar. */}
                      <span className="block truncate text-[11px] text-brand-fg-subtle sm:hidden">
                        <span className={changed ? "line-through" : undefined}>{brl.format(row.priceCents / 100)}</span>
                        {" · "}
                        {row.serverLabel ?? "Sem servidor"}
                      </span>
                    </td>
                    <td className="hidden py-[6px] text-brand-fg-subtle sm:table-cell">{row.serverLabel ?? "Sem servidor"}</td>
                    <td
                      className={cn(
                        "hidden py-[6px] text-right sm:table-cell",
                        changed ? "text-brand-fg-subtle line-through" : "text-white",
                      )}
                    >
                      {brl.format(row.priceCents / 100)}
                    </td>
                    <td className="px-[6px] py-[6px] sm:px-[14px]">
                      <input
                        ref={(element) => {
                          if (element) inputs.current.set(row.id, element);
                          else inputs.current.delete(row.id);
                        }}
                        inputMode="decimal"
                        autoComplete="off"
                        value={draft ?? formatPriceInput(row.priceCents)}
                        onChange={(event) => setDraft(row.id, event.target.value)}
                        onFocus={(event) => {
                          event.target.select();
                          keepVisible(event.target);
                        }}
                        onKeyDown={(event) => onPriceKey(event, index)}
                        aria-label={`Novo preço de ${row.name}${row.serverLabel ? ` (${row.serverLabel})` : ""}`}
                        aria-invalid={isInvalid || undefined}
                        className={cn(
                          "h-[34px] w-full rounded-[10px] border bg-black/30 px-[8px] text-right text-white sm:px-[10px]",
                          isInvalid
                            ? "border-red-9"
                            : changed
                              ? "border-brand-orange/70 font-bold"
                              : "border-white/10",
                        )}
                      />
                    </td>
                    <td
                      className={cn(
                        "pr-[10px] py-[6px] text-right text-[12px] sm:pr-[14px]",
                        isInvalid ? "text-red-9" : big ? "font-bold text-red-9" : changed ? "text-brand-orange" : "text-white/30",
                      )}
                      title={big ? "Variação grande. Confira se não sobrou ou faltou um zero." : undefined}
                    >
                      {isInvalid ? "inválido" : changed ? pct.format(ratio) : "-"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <p className="font-poppins text-[12px] text-brand-fg-subtle">
        Enter ou ↓ vai para o próximo preço, ↑ volta. O ajuste em % é sobre o preço atual e vale só para os
        marcados que estão na tela. Nada muda na loja até salvar.
        {quoted ? " Nesta aba o valor é a base da regra de preço de cada produto." : ""}
      </p>
    </div>
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
