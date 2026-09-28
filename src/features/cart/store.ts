"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Selection } from "@/features/pricing/quote";
import { cartLineId } from "./lineId";

/**
 * Carrinho (Figma 2501:3626).
 *
 * ONDE ELE MORA — no navegador, em `localStorage`, e NÃO no backend. Não é
 * atalho: não existe model de carrinho, e o carrinho precisa funcionar para
 * quem ainda não tem conta, que é justamente quem está começando a comprar.
 * Amarrar carrinho a usuário obrigaria a logar antes de escolher.
 *
 * O que se perde, e é consciente: o carrinho não acompanha a pessoa entre
 * navegadores nem dispositivos. Quando existir checkout, ele sobe para o
 * servidor no momento do login/checkout — este store vira a fonte que alimenta
 * essa sincronização, não um concorrente dela.
 *
 * PREÇO EM CENTAVOS, inteiro. Somar `float` de dinheiro erra centavo, e o
 * carrinho é exatamente onde a soma acontece.
 */
export type CartItem = {
  /**
   * Produto + servidor (+ hash da escolha, no serviço) — ver `lineId.ts`.
   */
  id: string;
  productId: string;
  gameSlug: string;
  name: string;
  /** Arte do produto. Vazio = o card mostra o retângulo cinza do design. */
  image?: string;
  /** Logo do jogo, no alto à direita do item. */
  gameLogo?: string;
  /** Servidor/liga escolhido ("Eternal Softcore"). */
  platform: string;
  unitPriceCents: number;
  quantity: number;
  /** Quando entrou no carrinho — é a data que o card mostra. */
  addedAt: string;
  /**
   * Só SERVIÇO (abas por jogo, 2026-09-28): a escolha do configurador. Vai ao
   * checkout, onde o BACKEND recalcula o preço — `unitPriceCents` aqui é só a
   * prévia. Presente = linha de serviço, quantidade fixa em 1.
   *
   * Opcional para o carrinho salvo por versões anteriores continuar abrindo.
   */
  selection?: Selection;
  /** Resumo da escolha ("Nível 1 → 50 · Prioridade"), para carrinho e checkout. */
  summary?: string;
  /** Horas estimadas do serviço. */
  hours?: number;
};

/** Linha de serviço: tem escolha, e a quantidade não muda. */
export function isServiceItem(item: Pick<CartItem, "selection">): boolean {
  return Boolean(item.selection);
}

/** Teto por linha. Sem ele um clique preso monta um pedido absurdo. */
const MAX_QUANTITY = 99;

type CartState = {
  items: CartItem[];
  isOpen: boolean;

  open: () => void;
  close: () => void;

  add: (item: Omit<CartItem, "id" | "addedAt" | "quantity">, quantity?: number) => void;
  setQuantity: (id: string, quantity: number) => void;
  remove: (id: string) => void;
  clear: () => void;
};


export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      isOpen: false,

      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),

      add: (item, quantity = 1) =>
        set((state) => {
          const id = cartLineId(item.productId, item.platform, item.selection);
          const existing = state.items.find((line) => line.id === id);

          // Serviço: a MESMA escolha de novo substitui a linha (preço de prévia
          // atualizado), sem somar — um boosting 1 → 50 não vira "2x".
          if (item.selection) {
            const line: CartItem = {
              ...item,
              id,
              quantity: 1,
              addedAt: existing?.addedAt ?? new Date().toISOString(),
            };
            return {
              items: existing
                ? state.items.map((current) => (current.id === id ? line : current))
                : [...state.items, line],
              isOpen: true,
            };
          }

          // Adicionar o mesmo produto/servidor SOMA na linha existente em vez de
          // criar outra — duas linhas iguais no carrinho é sempre erro de quem
          // programou, nunca intenção de quem comprou.
          const items = existing
            ? state.items.map((line) =>
                line.id === id
                  ? {
                      ...line,
                      quantity: Math.min(line.quantity + quantity, MAX_QUANTITY),
                    }
                  : line,
              )
            : [
                ...state.items,
                {
                  ...item,
                  id,
                  quantity: Math.min(Math.max(quantity, 1), MAX_QUANTITY),
                  addedAt: new Date().toISOString(),
                },
              ];

          // Abrir ao adicionar é o retorno de que o clique funcionou: o botão do
          // card não muda de aparência, então sem isto nada acontece na tela.
          return { items, isOpen: true };
        }),

      setQuantity: (id, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((line) => line.id !== id)
              : state.items.map((line) =>
                  line.id === id
                    ? {
                        ...line,
                        // Serviço é sempre 1: o backend recusa outra quantidade.
                        quantity: isServiceItem(line) ? 1 : Math.min(quantity, MAX_QUANTITY),
                      }
                    : line,
                ),
        })),

      remove: (id) =>
        set((state) => ({ items: state.items.filter((line) => line.id !== id) })),

      clear: () => set({ items: [] }),
    }),
    {
      name: "l4t-cart",
      // `isOpen` NÃO é persistido: abrir o site com o carrinho já aberto porque
      // ele ficou aberto ontem é comportamento errado.
      partialize: (state) => ({ items: state.items }),
      version: 1,
    },
  ),
);

/**
 * `true` só depois que o `localStorage` foi lido.
 *
 * O servidor renderiza o carrinho vazio (não tem como saber o que há no
 * navegador). Se o contador do cabeçalho pintasse o valor persistido já na
 * primeira renderização do cliente, o React acusaria divergência de hidratação
 * e descartaria a árvore.
 *
 * `useSyncExternalStore` em vez de `useState` + `useEffect`: o estado de
 * hidratação é do STORE, não do componente. O terceiro argumento é o valor do
 * servidor — sempre `false`, que é o que faz a primeira renderização dos dois
 * lados bater.
 */
export function useCartHydrated() {
  return useSyncExternalStore(
    (onChange) => useCart.persist.onFinishHydration(onChange),
    () => useCart.persist.hasHydrated(),
    () => false,
  );
}

/** Soma das linhas, em centavos. */
export function subtotalCents(items: CartItem[]) {
  return items.reduce((total, line) => total + line.unitPriceCents * line.quantity, 0);
}

/** Quantidade total de unidades — o número da bolinha do cabeçalho. */
export function itemCount(items: CartItem[]) {
  return items.reduce((total, line) => total + line.quantity, 0);
}

export function formatCents(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/** Horas estimadas em pt-BR com duas casas: 19 → "19,00". */
export function formatHours(hours: number) {
  return hours.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
