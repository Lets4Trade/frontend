"use client";

import { Fragment, useMemo, useState, type ReactNode } from "react";
import { addonsTitle, MAX_ADDON_CHOICES, MAX_SERVICE_TOTAL_CENTS, quote, type Selection } from "@/features/pricing/quote";
import { cn } from "@/lib/cn";
import {
  PRICING_MODES,
  addonIdTree,
  emptyAddon,
  type AddonDraft,
  draftToPricing,
  emptyDraft,
  moveItem,
  newKey,
  parsePresets,
  type PricingDraft,
  type PricingMode,
  unitSizeOf,
} from "./pricingDraft";
import { formatQuantity } from "@/features/game/configurator";

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
  hideModes = false,
}: {
  draft: PricingDraft;
  onChange: (next: PricingDraft) => void;
  /** O "Preço" do produto — base de todos os modos. */
  basePriceCents: number;
  /**
   * Esconde a escolha de modo quando outro controle já a faz (o "Depois do
   * CONTINUAR" da aba PACOTES, `PackageLayoutPicker`): duas escolhas na mesma
   * tela para a mesma coisa só confundiriam.
   */
  hideModes?: boolean;
}) {
  const patch = (next: Partial<PricingDraft>) => onChange({ ...draft, ...next });
  const validation = useMemo(() => draftToPricing(draft), [draft]);

  function switchMode(mode: PricingMode) {
    if (mode === draft.mode) return;
    // Troca de modo mantém horas base e adicionais (valem em todos) e começa
    // os campos do modo novo com valores sensatos.
    const fresh = emptyDraft(mode);
    onChange({ ...fresh, baseHours: draft.baseHours, addons: draft.addons, addonsTitle: draft.addonsTitle, maxAddons: draft.maxAddons });
  }

  return (
    <fieldset className="flex flex-col gap-[25px] rounded-[20px] border border-brand-orange/30 bg-black/20 p-[25px]">
      <legend className="px-[8px] font-poppins text-[16px] font-bold text-white">Preço do serviço</legend>

      {hideModes ? null : (
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
      )}
      {hideModes ? null : (
        <p className="-mt-[12px] font-poppins text-[12px] text-brand-fg-subtle">
          {PRICING_MODES.find((mode) => mode.value === draft.mode)?.hint}
        </p>
      )}

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
              {/* Tamanho da unidade (2026-10-23): o preço do produto é o de UMA unidade. */}
              <Mini label="1 unidade vale">
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={draft.unitSize}
                  maxLength={30}
                  placeholder="1"
                  onChange={(event) => patch({ unitSize: event.target.value.replace(/[^\d.\s]/g, "") })}
                  className={MINI_INPUT}
                />
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

      {draft.mode === "QUANTITY" ? <UnitSizeHint draft={draft} /> : null}

      {draft.mode === "QUANTITY" ? (
        <label className="flex max-w-[700px] flex-col gap-[6px]">
          <span className="font-poppins text-[12px] font-bold text-white/70">Quantidades prontas (opcional)</span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={draft.presets}
            maxLength={400}
            placeholder="100, 500, 1.000, 5.000"
            // Só dígitos e separadores; a conversão e a recusa são do `draftToPricing`.
            onChange={(event) => patch({ presets: event.target.value.replace(/[^\d.,;\s]/g, "") })}
            className={MINI_INPUT}
          />
          <span className="font-poppins text-[12px] text-brand-fg-subtle">
            Viram os botões de quantidade da aba (até {MAX_PRESETS}), em UNIDADES. Cada uma tem que respeitar
            mínimo, máximo e passo. Separe por vírgula; ponto é milhar (1.000 = mil).
          </span>
        </label>
      ) : null}

      {draft.mode === "QUANTITY" ? <PresetDiscounts draft={draft} onChange={(discounts) => patch({ discounts })} /> : null}

      {/* "Faixas de preço" por quantidade saíram em 2026-10-01: o cliente paga
          sempre quantidade × preço; o benefício é o cashback em Lets Coins. */}
      {draft.mode === "LEVEL_RANGE" ? (
        <Table
          title="Faixas de nível"
          hint="Cada nível de “de” (inclusive) até “até” (exclusive) custa o valor da faixa. Todo nível entre o mínimo e o máximo precisa estar numa faixa. Se duas faixas cobrem o mesmo nível, vale a de CIMA: use ↑ ↓ para ordenar."
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
              <RowActions
                key="actions"
                noun="faixa"
                index={index}
                count={draft.bands.length}
                onMove={(delta) => patch({ bands: moveItem(draft.bands, index, delta) })}
                onRemove={() => patch({ bands: draft.bands.filter((b) => b.key !== band.key) })}
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

/**
 * Serviços / adicionais (2026-11-09: título da lista, limite de escolhas e
 * SUBSERVIÇOS com limite próprio, pedido do usuário). Os subserviços abrem
 * numa linha embaixo do serviço ("Subserviços (N)").
 *
 * Serviço com subserviços é um GRUPO (2026-11-11): na loja vira título, sem
 * caixinha e sem preço, com os subserviços sempre abertos. Por isso a linha
 * dele troca tipo/valor/horas por um aviso — não há o que preencher.
 */
function AddonsTable({
  draft,
  patch,
}: {
  draft: PricingDraft;
  patch: (next: Partial<PricingDraft>) => void;
}) {
  const ids = addonIdTree(draft.addons);
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set());
  const toggleOpen = (key: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const setAddons = (addons: AddonDraft[]) => patch({ addons });
  const defaultTitle = addonsTitle({ mode: draft.mode });

  return (
    <div className="flex flex-col gap-[14px]">
      <div className="flex flex-wrap gap-[15px]">
        <Mini label="Título da lista na loja" wide>
          <TextInput
            value={draft.addonsTitle}
            maxLength={60}
            placeholder={defaultTitle}
            onChange={(addonsTitle) => patch({ addonsTitle })}
          />
        </Mini>
        <Mini label="Máximo que o cliente marca">
          <TextInput
            value={draft.maxAddons}
            numeric
            placeholder="Sem limite"
            onChange={(maxAddons) => patch({ maxAddons })}
          />
        </Mini>
      </div>
      <Table
        title="Serviços / adicionais (opcional)"
        hint="O cliente marca os que quiser, até o máximo acima. Percentual incide sobre o serviço (não sobre outros adicionais). O id é gerado do nome e não muda depois de salvo. A loja mostra na ordem desta lista: use ↑ ↓ para ordenar. Serviço com subserviços vira um TÍTULO de grupo na loja: sem caixinha e sem preço, com os subserviços sempre abertos embaixo (cada um com limite próprio)."
        headers={["Nome", "Tipo", "Valor", "Horas a mais", "Id", "Subserviços", ""]}
        addLabel="+ Adicionar serviço"
        canAdd={draft.addons.length < MAX_ADDON_CHOICES}
        onAdd={() => setAddons([...draft.addons, emptyAddon()])}
        rowKeys={draft.addons.map((addon) => addon.key)}
        rows={draft.addons.map((addon, index) => {
          const cells = addonCells({
            addon,
            index,
            noun: "adicional",
            id: ids.parents[index],
            list: draft.addons,
            setList: setAddons,
          });
          return [
          cells[0],
          ...(addon.children.length > 0
            ? [
                <GroupNote key="kind">Título</GroupNote>,
                <GroupNote key="value">Sem preço</GroupNote>,
                <GroupNote key="hours">—</GroupNote>,
              ]
            : cells.slice(1, 4)),
          cells[4],
          <button
            key="children"
            type="button"
            onClick={() => toggleOpen(addon.key)}
            aria-expanded={open.has(addon.key)}
            aria-label={`Subserviços de ${addon.label || `adicional ${index + 1}`}`}
            className={cn(
              "h-[40px] rounded-full border px-[14px] font-poppins text-[12px] font-bold whitespace-nowrap transition-colors",
              open.has(addon.key) || addon.children.length > 0
                ? "border-brand-orange/70 text-white"
                : "border-dashed border-white/25 text-white/80 hover:border-brand-orange/60",
            )}
          >
            {/* Texto que diz o que é (2026-11-09: "0 ▾" sozinho não se achava). */}
            {addon.children.length === 0 && !open.has(addon.key)
              ? "+ Subserviços"
              : `Subserviços (${addon.children.length}) ${open.has(addon.key) ? "▴" : "▾"}`}
          </button>,
          cells[5],
          ];
        })}
        details={draft.addons.map((addon, index) =>
          open.has(addon.key) ? (
            <ChildAddons
              key={addon.key}
              parent={addon}
              parentIndex={index}
              ids={ids.children[index] ?? []}
              onChange={(next) => setAddons(draft.addons.map((item) => (item.key === addon.key ? { ...item, ...next } : item)))}
            />
          ) : null,
        )}
      />
    </div>
  );
}

/** Os subserviços de um serviço: limite + a mesma tabela, um nível abaixo. */
function ChildAddons({
  parent,
  parentIndex,
  ids,
  onChange,
}: {
  parent: AddonDraft;
  parentIndex: number;
  ids: string[];
  onChange: (next: Partial<AddonDraft>) => void;
}) {
  const name = parent.label.trim() || `adicional ${parentIndex + 1}`;
  const setChildren = (children: AddonDraft[]) => onChange({ children });
  return (
    <div className="ml-[18px] flex flex-col gap-[12px] rounded-[16px] border border-white/10 bg-black/30 p-[14px]">
      <Mini label={`Máximo de subserviços de “${name}”`}>
        <TextInput
          value={parent.maxChildren}
          numeric
          placeholder="Todos"
          onChange={(maxChildren) => onChange({ maxChildren })}
        />
      </Mini>
      <Table
        title={`Subserviços de “${name}”`}
        hint={`Na loja, “${name}” vira o título do grupo (sem caixinha e sem preço) e estes subserviços aparecem sempre abertos embaixo, para o cliente marcar.`}
        headers={["Nome", "Tipo", "Valor", "Horas a mais", "Id", ""]}
        addLabel="+ Adicionar subserviço"
        canAdd={parent.children.length < MAX_ADDON_CHOICES}
        onAdd={() => setChildren([...parent.children, emptyAddon()])}
        rowKeys={parent.children.map((child) => child.key)}
        rows={parent.children.map((child, index) =>
          addonCells({
            addon: child,
            index,
            noun: `subserviço de ${name}`,
            id: ids[index],
            list: parent.children,
            setList: setChildren,
          }),
        )}
      />
    </div>
  );
}

/** As células de uma linha de serviço ou subserviço (nome, tipo, valor, horas, id, ações). */
function addonCells({
  addon,
  index,
  noun,
  id,
  list,
  setList,
}: {
  addon: AddonDraft;
  index: number;
  noun: string;
  id: string;
  list: AddonDraft[];
  setList: (next: AddonDraft[]) => void;
}): ReactNode[] {
  const label = `${noun.charAt(0).toUpperCase()}${noun.slice(1)} ${index + 1}`;
  const set = (next: Partial<AddonDraft>) => setList(list.map((item) => (item.key === addon.key ? { ...item, ...next } : item)));
  return [
    <TextInput
      key="label"
      ariaLabel={`${label}: nome`}
      value={addon.label}
      maxLength={80}
      placeholder="Prioridade"
      onChange={(next) => set({ label: next })}
    />,
    <select
      key="kind"
      aria-label={`${label}: tipo`}
      value={addon.kind}
      onChange={(event) => set({ kind: event.target.value === "FIXED" ? "FIXED" : "PERCENT" })}
      className={cn(MINI_INPUT, "min-w-[72px]")}
    >
      <option value="PERCENT">%</option>
      <option value="FIXED">R$</option>
    </select>,
    addon.kind === "PERCENT" ? (
      <TextInput
        key="value"
        ariaLabel={`${label}: percentual`}
        value={addon.percent}
        numeric
        signed
        placeholder="10 ou -100"
        onChange={(percent) => set({ percent })}
      />
    ) : (
      <CentsInput key="value" ariaLabel={`${label}: valor`} cents={addon.cents} onChange={(cents) => set({ cents })} />
    ),
    <TextInput
      key="hours"
      ariaLabel={`${label}: horas a mais`}
      value={addon.extraHours}
      numeric
      placeholder="0"
      onChange={(extraHours) => set({ extraHours })}
    />,
    <code key="id" className="block truncate font-mono text-[12px] text-brand-fg-subtle">
      {id}
    </code>,
    <RowActions
      key="actions"
      noun={noun}
      index={index}
      count={list.length}
      onMove={(delta) => setList(moveItem(list, index, delta))}
      onRemove={() => setList(list.filter((item) => item.key !== addon.key))}
    />,
  ];
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
  const tree = addonIdTree(draft.addons);
  const ids = [...tree.parents, ...tree.children.flat()];

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
        Prévia: como o cliente vê
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
        {draft.addons.map((addon, index) => {
          const id = tree.parents[index];
          // Grupo (2026-11-11): só o título, com os subserviços sempre abertos.
          if (addon.children.length === 0) {
            return (
              <PreviewCheck
                key={addon.key}
                label={addon.label || `Adicional ${index + 1}`}
                checked={chosen.includes(id)}
                onChange={(checked) =>
                  setChosen((current) => (checked ? [...current, id] : current.filter((item) => item !== id)))
                }
              />
            );
          }
          return (
            <Fragment key={addon.key}>
              <span className="flex h-[40px] items-center font-poppins text-[13px] font-bold text-white">
                {addon.label || `Adicional ${index + 1}`}:
              </span>
              {addon.children.map((child, childIndex) => {
                    const childId = tree.children[index][childIndex];
                    return (
                      <PreviewCheck
                        key={child.key}
                        label={`› ${child.label || `Subserviço ${childIndex + 1}`}`}
                        checked={chosen.includes(childId)}
                        onChange={(checked) =>
                          setChosen((current) => (checked ? [...current, childId] : current.filter((item) => item !== childId)))
                        }
                      />
                    );
                  })}
            </Fragment>
          );
        })}
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

/**
 * O exemplo do tamanho da unidade, com os números do próprio rascunho:
 * "1 unidade = 1Mi Gold · 10 unidades = 10Mi Gold · preço do produto = 1 unidade".
 */
function UnitSizeHint({ draft }: { draft: PricingDraft }) {
  const size = unitSizeOf(draft.unitSize);
  const label = draft.unitLabel.trim() || "unidades";
  if (!Number.isFinite(size) || size <= 1) {
    return (
      <p className="-mt-[8px] max-w-[700px] font-poppins text-[12px] text-brand-fg-subtle">
        &quot;1 unidade vale&quot;: para vender em lotes — ex.: 1.000.000 faz cada unidade ser 1Mi de {label}, e 10
        unidades entregarem 10Mi. Vazio = 1.
      </p>
    );
  }
  return (
    <p className="-mt-[8px] max-w-[700px] font-poppins text-[12px] text-white/80">
      1 unidade = <strong>{formatQuantity(size)} {label}</strong> · 10 unidades ={" "}
      <strong>
        {formatQuantity(size * 10)} {label}
      </strong>
      . O preço do produto é o de UMA unidade.
    </p>
  );
}

/**
 * Desconto por quantidade pronta (2026-10-27, pedido do usuário para a aba
 * Gold): um % ao lado de cada botão. Vale daquela quantidade para cima (quem
 * digita 600 paga com o desconto de 500), e a loja mostra o selo "-5%" no
 * botão. A conta é do `quote` — a prévia ao lado já sai com o desconto.
 */
function PresetDiscounts({
  draft,
  onChange,
}: {
  draft: PricingDraft;
  onChange: (discounts: Record<string, string>) => void;
}) {
  const presets = [...new Set(parsePresets(draft.presets).filter(Number.isFinite))].sort((a, b) => a - b);
  if (presets.length === 0) return null;
  const size = unitSizeOf(draft.unitSize);
  const unit = Number.isFinite(size) && size > 0 ? size : 1;
  const label = draft.unitLabel.trim();
  return (
    <div className="flex max-w-[700px] flex-col gap-[8px]">
      <span className="font-poppins text-[12px] font-bold text-white/70">Desconto por quantidade (opcional)</span>
      <div className="flex flex-wrap gap-[10px]">
        {presets.map((preset) => (
          <label
            key={preset}
            className="flex items-center gap-[8px] rounded-[10px] border border-white/10 bg-black/30 py-[6px] pr-[10px] pl-[12px]"
          >
            <span className="min-w-[56px] font-poppins text-[13px] font-bold text-white">
              {formatQuantity(preset * unit)}
              {label ? ` ${label}` : ""}
            </span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              aria-label={`Desconto a partir de ${formatQuantity(preset * unit)} ${label}`.trim()}
              value={draft.discounts[String(preset)] ?? ""}
              maxLength={2}
              placeholder="0"
              onChange={(event) =>
                onChange({ ...draft.discounts, [String(preset)]: event.target.value.replace(/\D/g, "") })
              }
              className="h-[34px] w-[52px] rounded-[8px] border border-white/10 bg-black/40 px-[8px] text-center font-poppins text-[13px] text-white placeholder:text-white/30 focus:border-brand-orange/60 focus:outline-none"
            />
            <span className="font-poppins text-[13px] text-white/60">%</span>
          </label>
        ))}
      </div>
      <span className="font-poppins text-[12px] text-brand-fg-subtle">
        Vale a partir daquela quantidade, inclusive para quem digitar mais. Na loja, o botão ganha o selo “-5%”. Vazio
        = sem desconto.
      </span>
    </div>
  );
}

/** Espelha o `.max(24)` de `presets` no `pricingSchema` (só para o texto de ajuda). */
const MAX_PRESETS = 24;

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
  signed,
  placeholder,
  // 16 dígitos: cabe qualquer quantidade exata (2026-10-20, sem teto).
  maxLength = 16,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  numeric?: boolean;
  /** Numérico que aceita o sinal de menos na frente (adicional em %, desconto). */
  signed?: boolean;
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
      // Numérico: só dígitos, vírgula e ponto (e o "-" só na frente, quando
      // `signed`) — a conversão (e a recusa de fração em campo inteiro e do
      // piso de −100%) é do `draftToPricing`.
      onChange={(event) => onChange(numeric ? numericText(event.target.value, signed) : event.target.value)}
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
        // Teto técnico (R$ 20 mi), o mesmo do backend — era R$ 100 mil.
        onChange(digits === "" ? 0 : Math.min(Number(digits), MAX_SERVICE_TOTAL_CENTS));
      }}
      className={MINI_INPUT}
    />
  );
}

const ROW_BUTTON =
  "flex size-[40px] shrink-0 items-center justify-center rounded-[8px] border border-white/10 bg-black/40 font-poppins text-[14px] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30";

/**
 * Subir / descer / remover a linha (2026-11-09: antes só dava para pôr linha
 * nova no FIM, e encaixar uma faixa no meio obrigava a apagar e refazer tudo).
 * As chaves das linhas são estáveis (`rowKeys`), então o React MOVE a linha e
 * os campos não trocam de valor no caminho.
 */
function RowActions({
  noun,
  index,
  count,
  onMove,
  onRemove,
}: {
  noun: string;
  index: number;
  count: number;
  onMove: (delta: -1 | 1) => void;
  onRemove: () => void;
}) {
  const position = index + 1;
  return (
    <div className="flex items-center gap-[6px]">
      <button
        type="button"
        onClick={() => onMove(-1)}
        disabled={index === 0}
        aria-label={`Subir ${noun} ${position}`}
        title="Subir"
        className={`${ROW_BUTTON} text-white`}
      >
        ↑
      </button>
      <button
        type="button"
        onClick={() => onMove(1)}
        disabled={index === count - 1}
        aria-label={`Descer ${noun} ${position}`}
        title="Descer"
        className={`${ROW_BUTTON} text-white`}
      >
        ↓
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remover ${noun} ${position}`}
        title="Remover"
        className={`${ROW_BUTTON} text-brand-orange`}
      >
        ✕
      </button>
    </div>
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
  details,
}: {
  title: string;
  hint: string;
  headers: string[];
  rows: ReactNode[][];
  /** Linha extra, em largura cheia, embaixo de cada linha (subserviços, 2026-11-09). */
  details?: (ReactNode | null)[];
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
        <div className="relative overflow-x-auto">
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
                <Fragment key={rowKeys[index] ?? index}>
                  <tr>
                    {cells.map((cell, cellIndex) => (
                      <td key={cellIndex} className="align-middle">
                        {cell}
                      </td>
                    ))}
                  </tr>
                  {details?.[index] ? (
                    <tr>
                      <td colSpan={cells.length}>{details[index]}</td>
                    </tr>
                  ) : null}
                </Fragment>
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

function numericText(raw: string, signed?: boolean): string {
  const digits = raw.replace(/[^\d.,]/g, "");
  return signed && raw.trimStart().startsWith("-") ? `-${digits}` : digits;
}

/** Caixa da prévia (escolha de exemplo; não vai para o produto). */
/** O lugar de tipo/valor/horas na linha de um grupo (2026-11-11). */
function GroupNote({ children }: { children: ReactNode }) {
  return <span className="block font-poppins text-[12px] whitespace-nowrap text-white/50">{children}</span>;
}

function PreviewCheck({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex h-[40px] items-center gap-[8px] font-poppins text-[13px] text-white/80">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-[16px] accent-[var(--brand-orange)]"
      />
      {label}
    </label>
  );
}
