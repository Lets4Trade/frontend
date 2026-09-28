"use client";

import { useMemo, useState, type ReactNode } from "react";
import { quote, type Selection } from "@/features/pricing/quote";
import { cn } from "@/lib/cn";
import {
  PRICING_MODES,
  addonIds,
  draftToPricing,
  emptyDraft,
  newKey,
  type PricingDraft,
  type PricingMode,
} from "./pricingDraft";

/**
 * Editor da REGRA DE PREÇO de um produto de aba SERVIÇO (contrato
 * `game-tabs.md`; formato e cálculo em `features/pricing/quote.ts`).
 *
 * Fica fora do Figma: o arquivo só desenha o lado do cliente (card 1712:3968).
 * A tela é deliberadamente uma planilha simples — modo, números, tabelas — com
 * a PRÉVIA ao lado usando o mesmo `quote()` que o backend usa para cobrar. O
 * que a pessoa vê na prévia é o que o cliente vai pagar para aquela escolha.
 *
 * Dinheiro sempre em CENTAVOS inteiros (dígitos entram pela direita, como no
 * `MoneyField`); percentuais em pontos inteiros. A validação final é o
 * `pricingSchema` do contrato, via `draftToPricing` — o erro aparece aqui
 * embaixo antes de o formulário deixar enviar.
 */
export function PricingEditor({
  draft,
  onChange,
  basePriceCents,
}: {
  draft: PricingDraft;
  onChange: (next: PricingDraft) => void;
  /** O "Preço" do produto — base de todos os modos. */
  basePriceCents: number;
}) {
  const patch = (next: Partial<PricingDraft>) => onChange({ ...draft, ...next });
  const validation = useMemo(() => draftToPricing(draft), [draft]);

  function switchMode(mode: PricingMode) {
    if (mode === draft.mode) return;
    // Troca de modo mantém horas base e adicionais (valem em todos) e começa
    // os campos do modo novo com valores sensatos.
    const fresh = emptyDraft(mode);
    onChange({ ...fresh, baseHours: draft.baseHours, addons: draft.addons });
  }

  return (
    <fieldset className="flex flex-col gap-[25px] rounded-[20px] border border-brand-orange/30 bg-black/20 p-[25px]">
      <legend className="px-[8px] font-poppins text-[16px] font-bold text-white">Preço do serviço</legend>

      <div role="radiogroup" aria-label="Como o preço é calculado" className="flex flex-wrap gap-[10px]">
        {PRICING_MODES.map((mode) => {
          const active = draft.mode === mode.value;
          return (
            <button
              key={mode.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => switchMode(mode.value)}
              className={cn(
                "h-[42px] rounded-full border px-[20px] font-poppins text-[13px] font-bold transition-colors",
                active
                  ? "border-brand-orange bg-brand-orange/15 text-white"
                  : "border-white/10 text-white/70 hover:border-white/30 hover:text-white",
              )}
            >
              {mode.label}
            </button>
          );
        })}
      </div>
      <p className="-mt-[12px] font-poppins text-[12px] text-brand-fg-subtle">
        {PRICING_MODES.find((mode) => mode.value === draft.mode)?.hint}
      </p>

      {draft.mode === "FIXED" ? null : (
        <div className="flex flex-wrap gap-[15px]">
          <Mini label={draft.mode === "LEVEL_RANGE" ? "Nome do nível" : "Nome da unidade"} wide>
            <TextInput
              value={draft.unitLabel}
              maxLength={40}
              placeholder={draft.mode === "LEVEL_RANGE" ? "Nível" : "Horas"}
              onChange={(unitLabel) => patch({ unitLabel })}
            />
          </Mini>
          <Mini label="Mínimo">
            <TextInput value={draft.min} numeric onChange={(min) => patch({ min })} />
          </Mini>
          <Mini label="Máximo">
            <TextInput value={draft.max} numeric onChange={(max) => patch({ max })} />
          </Mini>
          {draft.mode === "QUANTITY" ? (
            <>
              <Mini label="Passo">
                <TextInput value={draft.step} numeric onChange={(step) => patch({ step })} />
              </Mini>
              <Mini label="Horas por unidade">
                <TextInput
                  value={draft.hoursPerUnit}
                  numeric
                  placeholder="0"
                  onChange={(hoursPerUnit) => patch({ hoursPerUnit })}
                />
              </Mini>
            </>
          ) : null}
        </div>
      )}

      {draft.mode === "QUANTITY" ? (
        <Table
          title="Faixas de preço (opcional)"
          hint="A partir de N unidades, o unitário vira outro. Sem faixas, o unitário é o preço do produto."
          headers={["A partir de", "Preço unitário", ""]}
          addLabel="+ Adicionar faixa"
          canAdd={draft.tiers.length < 20}
          onAdd={() => patch({ tiers: [...draft.tiers, { key: newKey(), from: "", unitPriceCents: 0 }] })}
          rowKeys={draft.tiers.map((tier) => tier.key)}
          rows={draft.tiers.map((tier, index) => [
            <TextInput
              key="from"
              ariaLabel={`Faixa ${index + 1}: a partir de`}
              value={tier.from}
              numeric
              onChange={(from) =>
                patch({ tiers: draft.tiers.map((t) => (t.key === tier.key ? { ...t, from } : t)) })
              }
            />,
            <CentsInput
              key="price"
              ariaLabel={`Faixa ${index + 1}: preço unitário`}
              cents={tier.unitPriceCents}
              onChange={(unitPriceCents) =>
                patch({ tiers: draft.tiers.map((t) => (t.key === tier.key ? { ...t, unitPriceCents } : t)) })
              }
            />,
            <RemoveButton
              key="rm"
              label={`Remover faixa ${index + 1}`}
              onClick={() => patch({ tiers: draft.tiers.filter((t) => t.key !== tier.key) })}
            />,
          ])}
        />
      ) : null}

      {draft.mode === "LEVEL_RANGE" ? (
        <Table
          title="Faixas de nível"
          hint="Cada nível de “de” (inclusive) até “até” (exclusive) custa o valor da faixa. Todo nível entre o mínimo e o máximo precisa estar numa faixa."
          headers={["De", "Até", "Preço por nível", "Horas por nível", ""]}
          addLabel="+ Adicionar faixa"
          canAdd={draft.bands.length < 50}
          onAdd={() => {
            const last = draft.bands[draft.bands.length - 1];
            patch({
              bands: [
                ...draft.bands,
                { key: newKey(), from: last?.to ?? draft.min, to: "", pricePerLevelCents: 0, hoursPerLevel: "0" },
              ],
            });
          }}
          rowKeys={draft.bands.map((band) => band.key)}
          rows={draft.bands.map((band, index) => {
            const set = (next: Partial<typeof band>) =>
              patch({ bands: draft.bands.map((b) => (b.key === band.key ? { ...b, ...next } : b)) });
            return [
              <TextInput key="from" ariaLabel={`Faixa ${index + 1}: de`} value={band.from} numeric onChange={(from) => set({ from })} />,
              <TextInput key="to" ariaLabel={`Faixa ${index + 1}: até`} value={band.to} numeric onChange={(to) => set({ to })} />,
              <CentsInput
                key="price"
                ariaLabel={`Faixa ${index + 1}: preço por nível`}
                cents={band.pricePerLevelCents}
                onChange={(pricePerLevelCents) => set({ pricePerLevelCents })}
              />,
              <TextInput
                key="hours"
                ariaLabel={`Faixa ${index + 1}: horas por nível`}
                value={band.hoursPerLevel}
                numeric
                onChange={(hoursPerLevel) => set({ hoursPerLevel })}
              />,
              <RemoveButton
                key="rm"
                label={`Remover faixa ${index + 1}`}
                onClick={() => patch({ bands: draft.bands.filter((b) => b.key !== band.key) })}
              />,
            ];
          })}
        />
      ) : null}

      <div className="flex flex-wrap gap-[15px]">
        <Mini label="Horas base (fixas)">
          <TextInput
            value={draft.baseHours}
            numeric
            placeholder="0"
            onChange={(baseHours) => patch({ baseHours })}
          />
        </Mini>
      </div>

      <AddonsTable draft={draft} patch={patch} />

      {validation.ok ? null : (
        <p role="alert" className="font-helvetica text-[14px] text-red-9">
          {validation.message}
        </p>
      )}

      <PricePreview draft={draft} basePriceCents={basePriceCents} />
    </fieldset>
  );
}

function AddonsTable({
  draft,
  patch,
}: {
  draft: PricingDraft;
  patch: (next: Partial<PricingDraft>) => void;
}) {
  const ids = addonIds(draft.addons);
  return (
    <Table
      title="Adicionais (opcional)"
      hint="O cliente marca os que quiser. Percentual incide sobre o serviço (não sobre outros adicionais). O id é gerado do nome e não muda depois de salvo."
      headers={["Nome", "Tipo", "Valor", "Horas a mais", "Id", ""]}
      addLabel="+ Adicionar adicional"
      canAdd={draft.addons.length < 20}
      onAdd={() =>
        patch({
          addons: [
            ...draft.addons,
            { key: newKey(), id: null, label: "", kind: "PERCENT", percent: "", cents: 0, extraHours: "" },
          ],
        })
      }
      rowKeys={draft.addons.map((addon) => addon.key)}
      rows={draft.addons.map((addon, index) => {
        const set = (next: Partial<typeof addon>) =>
          patch({ addons: draft.addons.map((a) => (a.key === addon.key ? { ...a, ...next } : a)) });
        return [
          <TextInput
            key="label"
            ariaLabel={`Adicional ${index + 1}: nome`}
            value={addon.label}
            maxLength={80}
            placeholder="Prioridade"
            onChange={(label) => set({ label })}
          />,
          <select
            key="kind"
            aria-label={`Adicional ${index + 1}: tipo`}
            value={addon.kind}
            onChange={(event) => set({ kind: event.target.value === "FIXED" ? "FIXED" : "PERCENT" })}
            className={MINI_INPUT}
          >
            <option value="PERCENT">%</option>
            <option value="FIXED">R$</option>
          </select>,
          addon.kind === "PERCENT" ? (
            <TextInput
              key="value"
              ariaLabel={`Adicional ${index + 1}: percentual`}
              value={addon.percent}
              numeric
              placeholder="10"
              onChange={(percent) => set({ percent })}
            />
          ) : (
            <CentsInput
              key="value"
              ariaLabel={`Adicional ${index + 1}: valor`}
              cents={addon.cents}
              onChange={(cents) => set({ cents })}
            />
          ),
          <TextInput
            key="hours"
            ariaLabel={`Adicional ${index + 1}: horas a mais`}
            value={addon.extraHours}
            numeric
            placeholder="0"
            onChange={(extraHours) => set({ extraHours })}
          />,
          <code key="id" className="block truncate font-mono text-[12px] text-brand-fg-subtle">
            {ids[index]}
          </code>,
          <RemoveButton
            key="rm"
            label={`Remover adicional ${index + 1}`}
            onClick={() => patch({ addons: draft.addons.filter((a) => a.key !== addon.key) })}
          />,
        ];
      })}
    />
  );
}

/**
 * Prévia com uma escolha de EXEMPLO — o `quote()` do contrato, o mesmo que o
 * backend roda no checkout. A escolha é local (não vai para o produto).
 */
function PricePreview({ draft, basePriceCents }: { draft: PricingDraft; basePriceCents: number }) {
  const [quantity, setQuantity] = useState("");
  const [levelFrom, setLevelFrom] = useState("");
  const [levelTo, setLevelTo] = useState("");
  const [chosen, setChosen] = useState<string[]>([]);

  const validation = draftToPricing(draft);
  const ids = addonIds(draft.addons);

  let result: ReturnType<typeof quote> | null = null;
  if (validation.ok) {
    const selection: Selection = {
      ...(quantity.trim() ? { quantity: Number(quantity) } : {}),
      ...(levelFrom.trim() ? { levelFrom: Number(levelFrom) } : {}),
      ...(levelTo.trim() ? { levelTo: Number(levelTo) } : {}),
      // Só os adicionais que ainda existem: apagar um na tabela não pode
      // deixar a prévia presa em "adicional não existe".
      addonIds: chosen.filter((id) => ids.includes(id)),
    };
    result = quote(basePriceCents, validation.pricing, selection);
  }

  return (
    <section
      aria-labelledby="previa-preco"
      className="rounded-[16px] border border-white/10 bg-[image:var(--brand-surface-fill)] p-[20px]"
    >
      <h3 id="previa-preco" className="font-poppins text-[14px] font-bold text-white">
        Prévia — como o cliente vê
      </h3>

      <div className="mt-[12px] flex flex-wrap items-end gap-[15px]">
        {draft.mode === "QUANTITY" ? (
          <Mini label={`Quantidade (${draft.unitLabel || "unidades"})`}>
            <TextInput value={quantity} numeric placeholder={draft.min || "1"} onChange={setQuantity} />
          </Mini>
        ) : null}
        {draft.mode === "LEVEL_RANGE" ? (
          <>
            <Mini label={`${draft.unitLabel || "Nível"} atual`}>
              <TextInput value={levelFrom} numeric placeholder={draft.min} onChange={setLevelFrom} />
            </Mini>
            <Mini label={`${draft.unitLabel || "Nível"} desejado`}>
              <TextInput value={levelTo} numeric placeholder={draft.max} onChange={setLevelTo} />
            </Mini>
          </>
        ) : null}
        {draft.addons.map((addon, index) => (
          <label key={addon.key} className="flex h-[40px] items-center gap-[8px] font-poppins text-[13px] text-white/80">
            <input
              type="checkbox"
              checked={chosen.includes(ids[index])}
              onChange={(event) =>
                setChosen((current) =>
                  event.target.checked ? [...current, ids[index]] : current.filter((id) => id !== ids[index]),
                )
              }
              className="size-[16px] accent-[var(--brand-orange)]"
            />
            {addon.label || `Adicional ${index + 1}`}
          </label>
        ))}
      </div>

      <div className="mt-[15px] font-poppins text-[13px]">
        {!validation.ok ? (
          <p className="text-brand-fg-subtle">Corrija a regra acima para ver a prévia.</p>
        ) : result && !result.ok ? (
          <p className="text-brand-orange">{result.message}</p>
        ) : result && result.ok ? (
          <>
            <ul className="flex flex-col gap-[4px] text-white/80">
              {result.lines.map((line, index) => (
                <li key={index} className="flex justify-between gap-[20px]">
                  <span>{line.label}</span>
                  <span>{formatCents(line.cents)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-[10px] flex justify-between gap-[20px] border-t border-white/10 pt-[10px] font-bold text-white">
              <span>
                Total{result.hours > 0 ? ` · ~${result.hours.toLocaleString("pt-BR")} h` : ""}
              </span>
              <span>{formatCents(result.totalCents)}</span>
            </p>
          </>
        ) : null}
      </div>
    </section>
  );
}

// ── Peças compactas ────────────────────────────────────────────────────────
// As pílulas de 50px do formulário não cabem numa tabela de faixas; estes
// campos são a versão de 40px, com o mesmo fundo escuro.

const MINI_INPUT =
  "h-[40px] w-full rounded-[10px] border border-white/10 bg-black/40 px-[12px] font-poppins text-[13px] text-white placeholder:text-white/30 focus:border-brand-orange/60 focus:outline-none";

function Mini({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return (
    <label className={cn("flex flex-col gap-[6px]", wide ? "w-[220px]" : "w-[140px]")}>
      <span className="font-poppins text-[12px] font-bold text-white/70">{label}</span>
      {children}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  numeric,
  placeholder,
  maxLength = 12,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  numeric?: boolean;
  placeholder?: string;
  maxLength?: number;
  ariaLabel?: string;
}) {
  return (
    <input
      type="text"
      inputMode={numeric ? "decimal" : undefined}
      autoComplete="off"
      aria-label={ariaLabel}
      value={value}
      maxLength={maxLength}
      placeholder={placeholder}
      // Numérico: só dígitos, vírgula e ponto — a conversão (e a recusa de
      // fração em campo inteiro) é do `draftToPricing`.
      onChange={(event) => onChange(numeric ? event.target.value.replace(/[^\d.,]/g, "") : event.target.value)}
      className={MINI_INPUT}
    />
  );
}

/** Mesmo gesto do `MoneyField`: dígitos entram pela direita, o valor é centavo inteiro. */
function CentsInput({
  cents,
  onChange,
  ariaLabel,
}: {
  cents: number;
  onChange: (cents: number) => void;
  ariaLabel: string;
}) {
  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      aria-label={ariaLabel}
      value={cents === 0 ? "" : formatCents(cents)}
      placeholder="R$ 0,00"
      onChange={(event) => {
        const digits = event.target.value.replace(/\D/g, "").slice(0, 12);
        onChange(digits === "" ? 0 : Math.min(Number(digits), 10_000_000));
      }}
      className={MINI_INPUT}
    />
  );
}

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex size-[40px] items-center justify-center rounded-[8px] border border-white/10 bg-black/40 font-poppins text-[14px] text-brand-orange transition-opacity hover:opacity-90"
    >
      ✕
    </button>
  );
}

function Table({
  title,
  hint,
  headers,
  rows,
  rowKeys,
  addLabel,
  canAdd,
  onAdd,
}: {
  title: string;
  hint: string;
  headers: string[];
  rows: ReactNode[][];
  /** Chave estável por linha: remover uma do meio não pode mover o foco. */
  rowKeys: string[];
  addLabel: string;
  canAdd: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="flex flex-col gap-[10px]">
      <p className="font-poppins text-[14px] font-bold text-white">{title}</p>
      <p className="-mt-[6px] font-poppins text-[12px] text-brand-fg-subtle">{hint}</p>
      {rows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-separate border-spacing-x-[8px] border-spacing-y-[6px]">
            <thead>
              <tr>
                {headers.map((header, index) => (
                  <th key={index} scope="col" className="text-left font-poppins text-[11px] font-bold text-white/50">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((cells, index) => (
                <tr key={rowKeys[index] ?? index}>
                  {cells.map((cell, cellIndex) => (
                    <td key={cellIndex} className="align-middle">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <button
        type="button"
        onClick={onAdd}
        disabled={!canAdd}
        className="h-[40px] w-fit rounded-full border border-dashed border-white/20 px-[20px] font-poppins text-[13px] font-bold text-white/80 transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {addLabel}
      </button>
    </div>
  );
}

function formatCents(cents: number): string {
  const whole = Math.trunc(cents / 100);
  const remainder = Math.abs(cents % 100);
  return `R$ ${whole.toLocaleString("pt-BR")},${String(remainder).padStart(2, "0")}`;
}
