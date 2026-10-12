"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { MoneyField } from "@/components/ui/MoneyField";
import { TextField } from "@/components/ui/TextField";
import { toastError, toastOk } from "@/components/ui/Toasts";
import { MAX_COUPON_FIXED_CENTS, normalizeCouponCode, type CouponKind } from "@/features/pricing/coupon";
import { cn } from "@/lib/cn";
import { ACTION_FAILED_MESSAGE, runAction } from "@/lib/safeAction";
import {
  deleteCouponAction,
  saveCouponAction,
  searchCouponProductsAction,
  type CouponResult,
  type DeleteCouponResult,
} from "./actions";
import {
  couponPayloadProblem,
  couponSummary,
  formatPercentInput,
  isoToLocalInput,
  localInputToIso,
  parseOptionalInt,
  parsePercentBps,
  type AdminCoupon,
  type CouponPayload,
  type CouponProductOption,
  type CouponTargetGame,
} from "./types";

const SAVE_FAILED: CouponResult = { ok: false, reason: "error" };
const DELETE_FAILED: DeleteCouponResult = { ok: false, reason: "error" };

type Scope = "all" | "some";

/**
 * Formulário do cupom (2026-10-12) — TUDO é escolha do admin: código, tipo e
 * valor, teto, compra mínima, validade, limites, alcance (loja toda ou
 * jogos/abas/produtos) e como o cupom convive com Lets Coins e recompensas.
 *
 * A prévia ao lado é a frase que resume a regra — o que o cliente vai ganhar,
 * sem precisar ler o formulário inteiro.
 */
export function CouponForm({ coupon, games }: { coupon: AdminCoupon | null; games: CouponTargetGame[] }) {
  const router = useRouter();
  const [saving, startSaving] = useTransition();

  const [code, setCode] = useState(coupon?.code ?? "");
  const [description, setDescription] = useState(coupon?.description ?? "");
  const [isActive, setIsActive] = useState(coupon?.isActive ?? true);
  const [kind, setKind] = useState<CouponKind>(coupon?.kind ?? "PERCENT");
  const [percentText, setPercentText] = useState(
    coupon?.kind === "PERCENT" ? formatPercentInput(coupon.value) : "10",
  );
  const [fixedCents, setFixedCents] = useState(coupon?.kind === "FIXED" ? coupon.value : 0);
  const [maxDiscountCents, setMaxDiscountCents] = useState(coupon?.maxDiscountCents ?? 0);
  const [minSubtotalCents, setMinSubtotalCents] = useState(coupon?.minSubtotalCents ?? 0);
  const [startsAt, setStartsAt] = useState(isoToLocalInput(coupon?.startsAt ?? null));
  const [endsAt, setEndsAt] = useState(isoToLocalInput(coupon?.endsAt ?? null));
  const [maxUsesText, setMaxUsesText] = useState(coupon?.maxUses ? String(coupon.maxUses) : "");
  const [perUserText, setPerUserText] = useState(coupon?.maxUsesPerUser ? String(coupon.maxUsesPerUser) : "");
  const [gameIds, setGameIds] = useState<string[]>(coupon?.gameIds ?? []);
  const [tabIds, setTabIds] = useState<string[]>(coupon?.tabIds ?? []);
  const [products, setProducts] = useState<CouponProductOption[]>(coupon?.targets.products ?? []);
  const hasTargets = (coupon?.gameIds.length ?? 0) + (coupon?.tabIds.length ?? 0) + (coupon?.productIds.length ?? 0) > 0;
  const [scope, setScope] = useState<Scope>(hasTargets ? "some" : "all");
  const [allowCoins, setAllowCoins] = useState(coupon?.allowCoins ?? true);
  const [rewardsOnDiscounted, setRewardsOnDiscounted] = useState(coupon?.rewardsOnDiscounted ?? true);

  const value = kind === "PERCENT" ? (parsePercentBps(percentText) ?? Number.NaN) : fixedCents;
  const payload: CouponPayload = {
    code: normalizeCouponCode(code),
    description: description.trim() || null,
    isActive,
    kind,
    value,
    maxDiscountCents: kind === "PERCENT" && maxDiscountCents > 0 ? maxDiscountCents : null,
    minSubtotalCents: minSubtotalCents > 0 ? minSubtotalCents : null,
    startsAt: localInputToIso(startsAt),
    endsAt: localInputToIso(endsAt),
    maxUses: parseOptionalInt(maxUsesText),
    maxUsesPerUser: parseOptionalInt(perUserText),
    gameIds: scope === "some" ? gameIds : [],
    tabIds: scope === "some" ? tabIds : [],
    productIds: scope === "some" ? products.map((product) => product.id) : [],
    allowCoins,
    rewardsOnDiscounted,
  };
  const scopeEmpty = scope === "some" && payload.gameIds.length + payload.tabIds.length + payload.productIds.length === 0;
  const problem =
    couponPayloadProblem(payload) ??
    (scopeEmpty ? "Escolha ao menos um jogo, aba ou produto — ou marque “Loja toda”." : null);

  function save() {
    if (problem) {
      toastError(problem);
      return;
    }
    startSaving(async () => {
      const result = await runAction(() => saveCouponAction(coupon?.id ?? null, payload), SAVE_FAILED);
      if (!result.ok) {
        toastError(result.message ?? ACTION_FAILED_MESSAGE);
        return;
      }
      toastOk(coupon ? "Cupom salvo." : "Cupom criado.");
      if (!coupon) router.replace(`/admin/cupons/${result.data.id}`);
      else router.refresh();
    });
  }

  function toggle(list: string[], id: string, set: (next: string[]) => void) {
    set(list.includes(id) ? list.filter((item) => item !== id) : [...list, id]);
  }

  return (
    <div className="grid gap-[24px] lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      <div className="flex flex-col gap-[20px]">
        <Card title="Código">
          <div className="grid gap-[20px] sm:grid-cols-2">
            <TextField
              label="Código do cupom"
              placeholder="BLACKFRIDAY10"
              maxLength={40}
              autoCapitalize="characters"
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase().replace(/\s/g, ""))}
            />
            <TextField
              label="Descrição interna (opcional)"
              placeholder="Só o painel vê"
              maxLength={200}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <Check checked={isActive} onChange={setIsActive} className="mt-[16px]">
            Cupom ligado
          </Check>
        </Card>

        <Card title="Desconto">
          <div className="flex flex-wrap gap-[10px]" role="radiogroup" aria-label="Tipo de desconto">
            <Pill active={kind === "PERCENT"} onClick={() => setKind("PERCENT")}>
              Percentual (%)
            </Pill>
            <Pill active={kind === "FIXED"} onClick={() => setKind("FIXED")}>
              Valor fixo (R$)
            </Pill>
          </div>
          <div className="mt-[18px] grid gap-[20px] sm:grid-cols-2">
            {kind === "PERCENT" ? (
              <>
                <TextField
                  label="Percentual"
                  inputMode="decimal"
                  placeholder="10 ou 12,5"
                  value={percentText}
                  onChange={(event) => setPercentText(event.target.value.replace(/[^\d,.%]/g, ""))}
                />
                <MoneyField
                  label="Desconto máximo (opcional)"
                  name="maxDiscountCents"
                  placeholder="Sem teto"
                  defaultCents={maxDiscountCents}
                  maxCents={MAX_COUPON_FIXED_CENTS}
                  onCentsChange={setMaxDiscountCents}
                />
              </>
            ) : (
              <MoneyField
                label="Valor do desconto"
                name="fixedCents"
                defaultCents={fixedCents}
                maxCents={MAX_COUPON_FIXED_CENTS}
                onCentsChange={setFixedCents}
              />
            )}
            <MoneyField
              label="Compra mínima (opcional)"
              name="minSubtotalCents"
              placeholder="Sem mínimo"
              defaultCents={minSubtotalCents}
              maxCents={MAX_COUPON_FIXED_CENTS}
              onCentsChange={setMinSubtotalCents}
            />
          </div>
          <Hint>A compra mínima conta só os itens em que o cupom vale (o alcance abaixo). R$ 0,00 = sem mínimo / sem teto.</Hint>
        </Card>

        <Card title="Validade e limites">
          <div className="grid gap-[20px] sm:grid-cols-2">
            <DateField label="Começa em (opcional)" value={startsAt} onChange={setStartsAt} />
            <DateField label="Termina em (opcional)" value={endsAt} onChange={setEndsAt} />
            <TextField
              label="Limite total de usos (opcional)"
              inputMode="numeric"
              placeholder="Sem limite"
              value={maxUsesText}
              onChange={(event) => setMaxUsesText(event.target.value.replace(/\D/g, ""))}
            />
            <TextField
              label="Usos por cliente (opcional)"
              inputMode="numeric"
              placeholder="Sem limite"
              value={perUserText}
              onChange={(event) => setPerUserText(event.target.value.replace(/\D/g, ""))}
            />
          </div>
          <Hint>
            Horários no fuso deste navegador. Um uso é uma compra (carrinho); compra que expira sem pagar ou é estornada
            devolve o uso.
            {coupon ? ` Usos até agora: ${coupon.usedCount}.` : ""}
          </Hint>
        </Card>

        <Card title="Onde vale">
          <div className="flex flex-wrap gap-[10px]" role="radiogroup" aria-label="Alcance do cupom">
            <Pill active={scope === "all"} onClick={() => setScope("all")}>
              Loja toda
            </Pill>
            <Pill active={scope === "some"} onClick={() => setScope("some")}>
              Escolher jogos, abas ou produtos
            </Pill>
          </div>

          {scope === "some" ? (
            <div className="mt-[18px] flex flex-col gap-[18px]">
              <Hint>O item entra no desconto se o jogo, a aba OU o produto dele estiver marcado.</Hint>
              <ul className="flex flex-col gap-[12px]">
                {games.map((game) => (
                  <li key={game.id} className="rounded-[14px] border border-white/10 p-[14px]">
                    <Check checked={gameIds.includes(game.id)} onChange={() => toggle(gameIds, game.id, setGameIds)}>
                      <span className="font-bold">{game.name}</span>
                      <span className="font-normal text-white/50"> — jogo inteiro</span>
                    </Check>
                    {game.tabs.length > 0 && !gameIds.includes(game.id) ? (
                      <div className="mt-[10px] flex flex-wrap gap-x-[18px] gap-y-[8px] pl-[28px]">
                        {game.tabs.map((tab) => (
                          <Check key={tab.id} small checked={tabIds.includes(tab.id)} onChange={() => toggle(tabIds, tab.id, setTabIds)}>
                            {tab.label}
                          </Check>
                        ))}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
              <ProductPicker selected={products} onChange={setProducts} />
            </div>
          ) : null}
        </Card>

        <Card title="Com outros benefícios">
          <div className="flex flex-col gap-[12px]">
            <Check checked={allowCoins} onChange={setAllowCoins}>
              Pode usar junto com Lets Coins
            </Check>
            <Check checked={rewardsOnDiscounted} onChange={setRewardsOnDiscounted}>
              Cashback e brinde calculados sobre o valor com o cupom
            </Check>
          </div>
          <Hint>
            Desmarcado o segundo, o cashback e o brinde do jogo continuam sobre o valor sem o cupom (a loja dá o desconto E
            a recompensa cheia).
          </Hint>
        </Card>

        <div className="flex flex-wrap items-center gap-[12px]">
          <button
            type="button"
            onClick={save}
            disabled={saving || problem !== null}
            className="inline-flex h-[46px] items-center justify-center rounded-full bg-[image:var(--brand-orange-gradient)] px-[28px] font-poppins text-[14px] font-bold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "SALVANDO..." : coupon ? "SALVAR CUPOM" : "CRIAR CUPOM"}
          </button>
          {problem && code !== "" ? (
            <p role="alert" className="font-poppins text-[13px] text-red-9">
              {problem}
            </p>
          ) : null}
          {coupon ? <DeleteCoupon id={coupon.id} code={coupon.code} /> : null}
        </div>
      </div>

      <aside
        aria-label="Prévia do cupom"
        className="rounded-[20px] border border-brand-border bg-[image:var(--brand-surface-fill)] p-[20px] lg:sticky lg:top-[20px]"
      >
        <p className="font-poppins text-[12px] font-bold tracking-[0.12px] text-white/60 uppercase">Prévia</p>
        <p className="mt-[8px] font-poppins text-[18px] font-bold tracking-[0.5px] text-white">
          {payload.code || "SEU-CODIGO"}
        </p>
        <p className="mt-[8px] font-helvetica text-[14px] leading-[20px] text-white/85">
          {Number.isNaN(value) || value <= 0 ? "Preencha o valor do desconto." : couponSummary(payload, coupon?.usedCount ?? 0)}
        </p>
        <p className="mt-[10px] font-helvetica text-[13px] text-white/60">
          {scope === "all"
            ? "Vale na loja toda."
            : `Vale em ${[
                payload.gameIds.length && `${payload.gameIds.length} jogo(s)`,
                payload.tabIds.length && `${payload.tabIds.length} aba(s)`,
                payload.productIds.length && `${payload.productIds.length} produto(s)`,
              ]
                .filter(Boolean)
                .join(", ") || "— escolha onde"}.`}
          {allowCoins ? " Combina com Lets Coins." : " Não combina com Lets Coins."}
        </p>
        {!isActive ? <p className="mt-[10px] font-poppins text-[12px] text-white/60">Desligado: ninguém consegue usar.</p> : null}
      </aside>
    </div>
  );
}

/**
 * Produtos do alcance: busca com espera de 300ms (não dispara a cada tecla) e
 * os escolhidos como chips removíveis.
 */
function ProductPicker({
  selected,
  onChange,
}: {
  selected: CouponProductOption[];
  onChange: (next: CouponProductOption[]) => void;
}) {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<CouponProductOption[]>([]);
  const [loading, setLoading] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    const query = term.trim();
    if (query.length < 2) return;
    const current = ++seq.current;
    const timer = setTimeout(() => {
      setLoading(true);
      runAction(() => searchCouponProductsAction(query), [] as CouponProductOption[]).then((rows) => {
        // Só a resposta da ÚLTIMA busca vale — uma lenta não sobrescreve a nova.
        if (current !== seq.current) return;
        setResults(rows);
        setLoading(false);
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [term]);

  const chosen = new Set(selected.map((product) => product.id));
  const visible = term.trim().length >= 2 ? results : [];

  return (
    <div>
      <TextField
        label="Produtos (opcional)"
        placeholder="Buscar produto pelo nome"
        value={term}
        onChange={(event) => setTerm(event.target.value)}
      />
      {term.trim().length >= 2 ? (
        <ul className="mt-[8px] max-h-[260px] overflow-y-auto rounded-[14px] border border-white/10">
          {loading && visible.length === 0 ? (
            <li className="px-[14px] py-[10px] font-helvetica text-[13px] text-white/60">Buscando…</li>
          ) : visible.length === 0 ? (
            <li className="px-[14px] py-[10px] font-helvetica text-[13px] text-white/60">Nenhum produto encontrado.</li>
          ) : (
            visible.map((product) => (
              <li key={product.id}>
                <button
                  type="button"
                  disabled={chosen.has(product.id)}
                  onClick={() => onChange([...selected, product])}
                  className="flex w-full items-baseline justify-between gap-[12px] border-b border-white/5 px-[14px] py-[9px] text-left font-helvetica text-[13px] text-white transition-colors last:border-b-0 hover:bg-white/5 disabled:cursor-default disabled:text-white/40"
                >
                  <span className="min-w-0 truncate">{product.name}</span>
                  <span className="shrink-0 text-[12px] text-white/50">{productContext(product)}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
      {selected.length > 0 ? (
        <ul className="mt-[12px] flex flex-wrap gap-[8px]">
          {selected.map((product) => (
            <li
              key={product.id}
              className="flex items-center gap-[6px] rounded-full border border-brand-orange/40 bg-brand-orange/10 py-[5px] pr-[6px] pl-[12px] font-helvetica text-[12px] text-white"
            >
              <span className="max-w-[260px] truncate">
                {product.name} <span className="text-white/50">· {productContext(product)}</span>
              </span>
              <button
                type="button"
                onClick={() => onChange(selected.filter((item) => item.id !== product.id))}
                aria-label={`Tirar ${product.name} do cupom`}
                className="flex size-[20px] items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function productContext(product: CouponProductOption): string {
  return [product.gameName, product.tab, product.server].filter(Boolean).join(" · ");
}

/** Apagar com confirmação na própria linha — nada de diálogo nativo. */
function DeleteCoupon({ id, code }: { id: string; code: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startPending] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function remove() {
    startPending(async () => {
      const result = await runAction(() => deleteCouponAction(id), DELETE_FAILED);
      if (!result.ok) {
        setMessage(result.message ?? ACTION_FAILED_MESSAGE);
        setConfirming(false);
        return;
      }
      toastOk(`Cupom ${code} apagado.`);
      router.replace("/admin/cupons");
    });
  }

  return (
    <div className="ml-auto flex flex-wrap items-center gap-[10px]">
      {message ? (
        <p role="alert" className="max-w-[420px] font-poppins text-[12px] text-red-9">
          {message}
        </p>
      ) : null}
      {confirming ? (
        <>
          <span className="font-poppins text-[13px] text-white/80">Apagar {code}?</span>
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="h-[38px] rounded-full border border-red-9/60 bg-red-9/15 px-[16px] font-poppins text-[13px] font-bold text-white transition-colors hover:bg-red-9/25 disabled:opacity-50"
          >
            {pending ? "APAGANDO..." : "SIM, APAGAR"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="h-[38px] rounded-full border border-white/15 px-[16px] font-poppins text-[13px] text-white/80 hover:text-white"
          >
            Cancelar
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => {
            setMessage(null);
            setConfirming(true);
          }}
          className="h-[38px] rounded-full border border-white/15 px-[16px] font-poppins text-[13px] text-white/70 transition-colors hover:border-red-9/60 hover:text-white"
        >
          Apagar cupom
        </button>
      )}
    </div>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[20px] border border-brand-border bg-[image:var(--brand-surface-fill)] p-[20px] sm:p-[26px]">
      <h2 className="mb-[16px] font-helvetica text-[18px] font-bold text-white">{title}</h2>
      {children}
    </section>
  );
}

function Hint({ children }: { children: ReactNode }) {
  return <p className="mt-[12px] font-poppins text-[12px] leading-[18px] text-brand-fg-subtle">{children}</p>;
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        "flex h-[40px] items-center rounded-full border px-[18px] font-poppins text-[13px] font-bold transition-colors",
        active ? "border-brand-orange bg-brand-orange/15 text-white" : "border-white/10 text-white/70 hover:border-white/30 hover:text-white",
      )}
    >
      {children}
    </button>
  );
}

function Check({
  checked,
  onChange,
  children,
  small = false,
  className,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  children: ReactNode;
  small?: boolean;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "flex w-fit cursor-pointer items-center gap-[10px] font-poppins text-white",
        small ? "text-[13px]" : "text-[14px] font-bold",
        className,
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className={cn("accent-[var(--brand-orange)]", small ? "size-[16px]" : "size-[18px]")}
      />
      <span>{children}</span>
    </label>
  );
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (next: string) => void }) {
  return (
    <div className="flex flex-col gap-[8px]">
      <TextField label={label} type="datetime-local" value={value} onChange={(event) => onChange(event.target.value)} />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className="w-fit pl-[25px] font-poppins text-[12px] text-white/60 hover:text-white"
        >
          Limpar data
        </button>
      ) : null}
    </div>
  );
}
