"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { toastError, toastOk } from "@/components/ui/Toasts";
import { cn } from "@/lib/cn";
import { runAction } from "@/lib/safeAction";
import { NEW_TAB, applyTabOrder, centralHref, moveInList } from "../central";
import { tabWarnings } from "../centralView";
import { reorderTabsAction } from "./actions";
import { FAILED, HiddenBadge, LayoutBadge, MESSAGES } from "./GameTabsEditor";
import { defaultTabIcon, isProductTab, tabIconSrc, type GameTab } from "./types";

/**
 * Lado ESQUERDO do mestre-detalhe da Central (admin-games-ux.md, Etapa 2): as
 * abas do jogo, a ordem delas e "+ Nova aba".
 *
 * Escolher uma aba é um `<Link>` com `?aba=` e `scroll={false}`: navegação do
 * App Router, sem recarregar a página — só o servidor redesenha o detalhe (e os
 * produtos/categorias dela). O servidor escolhido no filtro vai junto: os
 * servidores são do JOGO, valem para qualquer aba.
 *
 * A ORDEM é rascunho até "Salvar ordem" (↑ ↓ mexem só na lista local), como no
 * editor antigo — cinco cliques não viram cinco gravações.
 *
 * Abaixo de 1280px a lista vira um `<select>` (escolher) e a ordem fica num
 * `<details>` logo abaixo, para não empurrar o detalhe para longe. 1280 e não
 * 1024: entre os dois a Central já gasta uma coluna com a navegação dela, e
 * três colunas espremeriam o formulário da aba.
 */
export function TabsMasterList({
  gameId,
  tabs,
  selectedId,
  serverId,
}: {
  gameId: string;
  tabs: GameTab[];
  /** Aba aberta à direita, ou `NEW_TAB`. */
  selectedId: string;
  /** Servidor do filtro — mantido ao trocar de aba. `""` = todos. */
  serverId: string;
}) {
  const router = useRouter();
  const selectId = useId();
  const [order, setOrder] = useState<string[] | null>(null);
  const [pending, startTransition] = useTransition();

  const shown = applyTabOrder(tabs, order);
  const dirty = shown.some((tab, index) => tab.id !== tabs[index]?.id);

  const hrefFor = (tabId: string) => centralHref(gameId, { section: "abas", tabId, serverId });

  function move(index: number, direction: -1 | 1) {
    setOrder(moveInList(shown, index, direction).map((tab) => tab.id));
  }

  function saveOrder() {
    const ids = shown.map((tab) => tab.id);
    startTransition(async () => {
      const result = await runAction(() => reorderTabsAction(gameId, ids), FAILED);
      if (!result.ok) {
        toastError(result.message ?? MESSAGES[result.reason]);
        return;
      }
      toastOk("Ordem das abas salva.");
      // A lista do servidor passa a vir nesta ordem: o rascunho vira "igual".
      router.refresh();
    });
  }

  function discardOrder() {
    setOrder(null);
  }

  const list = (
    <>
      <ul className="flex flex-col gap-[8px]">
        {shown.map((tab, index) => {
          const active = tab.id === selectedId;
          const icon = tabIconSrc(tab.iconUrl ?? defaultTabIcon(tab.slug, tab.layout));
          return (
            <li
              key={tab.id}
              className={cn(
                "flex items-center gap-[8px] rounded-[14px] border pr-[8px] transition-colors",
                active ? "border-brand-orange bg-brand-orange/10" : "border-white/10 hover:border-white/25",
              )}
            >
              <Link
                href={hrefFor(tab.id)}
                scroll={false}
                aria-current={active ? "page" : undefined}
                className="flex min-w-0 flex-1 items-center gap-[12px] rounded-[14px] py-[10px] pl-[12px] focus-visible:outline-2 focus-visible:outline-brand-orange"
              >
                <span className="flex size-[36px] shrink-0 items-center justify-center rounded-[8px] bg-black/30">
                  {icon ? (
                    <Image src={icon} alt="" width={28} height={28} className="size-[28px] object-contain" />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-poppins text-[14px] font-bold text-white">{tab.label}</span>
                  <span className="mt-[4px] flex flex-wrap items-center gap-[6px]">
                    <LayoutBadge layout={tab.layout} />
                    {tab.isActive ? null : <HiddenBadge />}
                    {isProductTab(tab) ? (
                      <span className="font-poppins text-[11px] text-brand-fg-subtle">
                        {tab.productCount} produto{tab.productCount === 1 ? "" : "s"}
                      </span>
                    ) : null}
                  </span>
                  {tabWarnings(tab).map((warning) => (
                    <span
                      key={warning.code}
                      title={warning.detail}
                      className="mt-[4px] block font-poppins text-[11px] font-bold text-brand-orange"
                    >
                      {warning.short}
                    </span>
                  ))}
                </span>
              </Link>
              <span className="flex shrink-0 flex-col gap-[4px]">
                <OrderButton
                  label={`Mover ${tab.label} para cima`}
                  disabled={index === 0 || pending}
                  onClick={() => move(index, -1)}
                >
                  ↑
                </OrderButton>
                <OrderButton
                  label={`Mover ${tab.label} para baixo`}
                  disabled={index === shown.length - 1 || pending}
                  onClick={() => move(index, 1)}
                >
                  ↓
                </OrderButton>
              </span>
            </li>
          );
        })}
      </ul>

      {dirty ? (
        <div className="mt-[12px] flex flex-col gap-[8px]">
          <p className="font-poppins text-[12px] text-brand-orange">A nova ordem ainda não foi salva.</p>
          <div className="flex gap-[8px]">
            <button
              type="button"
              onClick={saveOrder}
              disabled={pending}
              className="h-[40px] flex-1 rounded-full bg-[image:var(--brand-orange-gradient)] font-poppins text-[13px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {pending ? "SALVANDO…" : "SALVAR ORDEM"}
            </button>
            <button
              type="button"
              onClick={discardOrder}
              disabled={pending}
              className="h-[40px] rounded-full border border-white/10 px-[14px] font-poppins text-[13px] font-bold text-white/70 transition-opacity hover:opacity-80"
            >
              Desfazer
            </button>
          </div>
        </div>
      ) : null}
    </>
  );

  const newTabLink = (
    <Link
      href={hrefFor(NEW_TAB)}
      scroll={false}
      aria-current={selectedId === NEW_TAB ? "page" : undefined}
      className={cn(
        "flex h-[44px] items-center justify-center rounded-[14px] border border-dashed font-poppins text-[13px] font-bold transition-colors",
        selectedId === NEW_TAB
          ? "border-brand-orange text-white"
          : "border-white/20 text-brand-orange hover:border-brand-orange/60",
      )}
    >
      + Nova aba
    </Link>
  );

  return (
    <>
      {/* < 1280px: escolher num select; ordem e "nova aba" logo abaixo. */}
      <div className="flex flex-col gap-[12px] xl:hidden">
        <label htmlFor={selectId} className="font-poppins text-[13px] font-bold text-white">
          Aba
        </label>
        <select
          id={selectId}
          value={selectedId}
          onChange={(event) => router.push(hrefFor(event.target.value), { scroll: false })}
          className="h-[50px] rounded-full border border-white/10 bg-brand-surface px-[20px] font-poppins text-[14px] text-white focus:border-brand-orange/60 focus:outline-none"
        >
          {shown.map((tab) => (
            <option key={tab.id} value={tab.id}>
              {tab.label}
              {tab.isActive ? "" : " (oculta)"}
              {tabWarnings(tab).map((warning) => ` (${warning.short})`).join("")}
            </option>
          ))}
          <option value={NEW_TAB}>+ Nova aba</option>
        </select>
        {shown.length > 1 ? (
          <details className="rounded-[14px] border border-white/10 px-[12px] py-[10px]">
            <summary className="cursor-pointer font-poppins text-[13px] font-bold text-white/80">
              Ordem das abas{dirty ? " (não salva)" : ""}
            </summary>
            <div className="mt-[12px]">{list}</div>
          </details>
        ) : null}
      </div>

      {/* ≥ 1280px: a coluna da esquerda. */}
      <nav aria-label="Abas do jogo" className="hidden flex-col gap-[12px] xl:flex">
        {shown.length === 0 ? (
          <p className="font-poppins text-[13px] text-brand-fg-subtle">Nenhuma aba ainda.</p>
        ) : (
          list
        )}
        {newTabLink}
      </nav>
    </>
  );
}

function OrderButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-[26px] items-center justify-center rounded-[6px] border border-white/10 font-poppins text-[12px] text-white transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-25"
    >
      {children}
    </button>
  );
}
