/**
 * Tipos do "Builder de Páginas" (Figma 3883:2153).
 *
 * A tela edita um RASCUNHO em memória e grava tudo de uma vez no botão "SALVAR
 * E PUBLICAR PAGE". Por isso existem dois formatos aqui: o que o backend
 * devolve (`BuilderGame`) e o que a tela mantém enquanto a pessoa edita
 * (`Draft`). Eles quase coincidem, e a diferença é toda no que ainda não foi
 * salvo.
 */

import type { GameSectionKey } from "@/features/game/sections";
import type { GamePage } from "@/features/game/types";

/** Item de lista editável — servidor (etapa 6) ou categoria (etapa 7). */
export type BuilderListItem = {
  /**
   * Ausente = item que ainda não existe no banco.
   *
   * É o que diz ao backend se a linha é para criar ou renomear, e é por isso
   * que o rascunho precisa de uma chave própria para o React (`key`): duas
   * linhas novas não têm id e não podem compartilhar chave.
   */
  id?: string;
  label: string;
  /** Só de leitura — o slug é decidido no servidor, a partir do rótulo. */
  slug?: string;
  /** Chave estável de renderização, local à tela. NUNCA vai para o backend. */
  key: string;
};

export type BuilderBanner = {
  id: string;
  /** Já absoluta, apontando para o backend. */
  imageUrl: string;
  href?: string | null;
};

/** O que `GET /api/v1/admin/game-page/:id` devolve. */
export type BuilderGame = {
  id: string;
  slug: string;
  name: string;
  imageUrl?: string | null;
  platforms: string[];
  productTypes: string[];
  heading?: string | null;
  serversLabel?: string | null;
  categoriesLabel?: string | null;
  description?: string | null;
  servers: { id: string; label: string; slug: string; position: number }[];
  categories: { id: string; label: string; slug: string; position: number }[];
  banners: { id: string; imageUrl: string; href?: string | null; position: number }[];
  /** Blocos visíveis, na ordem. Vazio = não personalizado. */
  sectionOrder?: string[] | null;
};

/** Uma linha da tela de escolha de jogo. */
export type BuilderGameSummary = {
  id: string;
  slug: string;
  name: string;
  imageUrl?: string | null;
  productCount: number;
};

/**
 * O estado que a tela edita.
 *
 * `heading`, `serversLabel`, `categoriesLabel` e `description` são STRING e não
 * `string | null`: no formulário, "não personalizado" e "apagado" são a mesma
 * caixa vazia, e quem traduz vazio para nulo é o backend (ver `blankToNull`).
 * Carregar `null` como `""` é o que faz o campo aparecer com o texto derivado
 * como placeholder em vez de com a palavra "null" dentro.
 *
 * As imagens NÃO estão aqui: elas sobem na hora em que o arquivo é escolhido, e
 * o rascunho só guarda o resultado (`imageUrl`, `banners`). Ver `actions.ts`.
 */
export type Draft = {
  name: string;
  /** Link da página (`/games/<slug>`), editável na etapa 4 desde 2026-09-25. */
  slug: string;
  heading: string;
  serversLabel: string;
  categoriesLabel: string;
  description: string;
  productTypes: string[];
  servers: BuilderListItem[];
  categories: BuilderListItem[];
  /**
   * Etapa 10 — os blocos VISÍVEIS, na ordem.
   *
   * Sempre resolvido (nunca vazio) no rascunho: a tela precisa de uma lista
   * concreta para desenhar. Quem traduz "vazio no banco" em "ordem padrão" é
   * `resolveSectionOrder`, na entrada.
   */
  sectionOrder: GameSectionKey[];
  /** Resultado dos uploads já feitos — não participa do salvamento. */
  imageUrl: string | null;
  banners: BuilderBanner[];
};

/**
 * O que a maquete desenha e o builder NÃO edita.
 *
 * Referências, notícias, FAQ e a moeda de fidelidade vêm do conteúdo editorial
 * e da tela "Edição de sessões", iguais para todo jogo. Chegam PRONTOS do
 * servidor para a pré-visualização usar os componentes DE VERDADE em vez de
 * desenhar retângulos rotulados no lugar deles.
 */
export type BuilderShared = {
  references: GamePage["references"];
  news: GamePage["news"];
  faq: GamePage["faq"];
  coin: GamePage["identity"]["coin"];
};
