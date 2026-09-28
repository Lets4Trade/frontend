"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { FileField } from "@/components/ui/FileField";
import { MoneyField } from "@/components/ui/MoneyField";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import { AdminFieldGrid, AdminFormActions } from "@/features/admin/AdminFormCard";
import type { AdminGame } from "@/features/admin/catalog";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  PLATFORMS,
  labelFor,
} from "../games/options";
import { listGameTabsAction } from "../games/tabs/actions";
import { isProductTab, type GameTab } from "../games/tabs/types";
import { PricingEditor } from "./PricingEditor";
import { draftToPricing, pricingToDraft, type PricingDraft } from "./pricingDraft";
import {
  createProductAction,
  updateProductAction,
  type CreateProductResult,
} from "./actions";
import { ACTION_FAILED_UPLOAD_MESSAGE, runAction } from "@/lib/safeAction";
import { createProductSchema } from "./schema";
import type { AdminProduct } from "./catalog";
import { categorySelectOptions } from "./categoryOptions";

type ErrorField =
  | "gameId"
  | "name"
  | "priceCents"
  | "platform"
  | "tabId"
  | "serverId"
  | "categoryId";
type FieldErrors = Partial<Record<ErrorField, string>>;

type FailureReason = Extract<CreateProductResult, { ok: false }>["reason"];

const ERROR_MESSAGES: Record<FailureReason, string> = {
  unauthenticated: "Sua sessão expirou. Entre de novo para continuar.",
  forbidden: "Sua conta não tem permissão para cadastrar produtos.",
  invalid: "Confira os campos e tente de novo.",
  error: "Não conseguimos salvar agora. Tente novamente em instantes.",
};

/**
 * Formulário "CADASTRO DE PRODUTO" (Figma 3806:7059).
 *
 * Mesma grade da tela de jogo: quatro colunas de 315px nos x = 50, 415, 780 e
 * 1145 do arquivo. A primeira fileira classifica o produto (jogo, plataforma,
 * servidor, tipo) e a segunda descreve o item (preço, imagem).
 *
 * ── Os três selects da direita DEPENDEM do jogo ─────────────────────────────
 * O arquivo desenha quatro selects soltos, com valores de exemplo. Soltos eles
 * deixariam cadastrar um produto de PlayStation num jogo que só existe na
 * Steam, ou com o servidor de OUTRO jogo — um card que nenhum filtro da vitrine
 * alcança, e que ninguém descobre até um cliente reclamar. Então plataforma,
 * servidor e tipo saem do que o JOGO escolhido declarou, e ficam desabilitados
 * até haver um jogo.
 *
 * Eles são remontados por `key` quando o jogo muda, em vez de controlados por
 * estado. O efeito é o mesmo — a escolha anterior some — e evita o vaivém entre
 * campo controlado e não controlado que um `value=""` provocaria no Radix.
 *
 * Quando a lista tem UMA opção só (o caso comum, porque o cadastro de jogo
 * manda uma plataforma e um tipo), ela já vem escolhida: obrigar a abrir um
 * dropdown de um item é atrito sem contrapartida.
 *
 * ── ABA no lugar do "Tipo de Produto" (contrato `game-tabs.md`, 2026-09-28) ─
 * As abas agora são por jogo (Jogos → Abas). O select lista as de catálogo e
 * serviço do jogo escolhido, lidas por server action quando o jogo muda (na
 * edição, já vêm do servidor). Aba SERVIÇO abre o editor da regra de preço
 * (`PricingEditor`), que viaja num hidden como JSON e é validado pelo MESMO
 * `pricingSchema` aqui, na action e no backend. As categorias do select são as
 * do servidor + aba escolhidos, mais as globais.
 *
 * ── "Nome do produto" NÃO está no arquivo ───────────────────────────────────
 * Entrou porque os consumidores exigem: o card da vitrine mostra o nome
 * (`ProductCard`) e o pedido o congela (`Order.productName`). Sem ele, dois
 * produtos do mesmo jogo, servidor e tipo ficariam indistinguíveis na tela e no
 * histórico. Ocupa a TERCEIRA coluna da segunda fileira, que está vazia no
 * desenho — nada que o arquivo posiciona saiu do lugar.
 */
export function ProductForm({
  games,
  product,
  initialTabs,
}: {
  games: AdminGame[];
  /** Presente = EDIÇÃO. Ausente = cadastro novo. */
  product?: AdminProduct;
  /** Abas do jogo do produto, lidas no servidor (só na edição). */
  initialTabs?: GameTab[] | null;
}) {
  const router = useRouter();
  const isEditing = product !== undefined;

  const formRef = useRef<HTMLFormElement>(null);
  const [isSubmitting, startSubmit] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState<{
    name: string;
    gameName: string;
    /** Para o "Ver na loja"; `null` se o jogo sumiu da lista entre o envio e a volta. */
    gameSlug: string | null;
  } | null>(null);

  const [gameId, setGameId] = useState(product?.game.id ?? "");
  const selectedGame = games.find((game) => game.id === gameId) ?? null;

  // Abas do jogo escolhido. `null` = ainda não lidas (ou a leitura falhou —
  // `tabsError` diz qual). Só as de catálogo/serviço recebem produto.
  const [tabs, setTabs] = useState<GameTab[] | null>(initialTabs ?? null);
  const [tabsError, setTabsError] = useState(isEditing && !initialTabs);
  const [loadingTabs, startLoadTabs] = useTransition();
  const tabsRequest = useRef(0);
  const productTabs = tabs?.filter(isProductTab) ?? [];

  const [tabId, setTabId] = useState(product?.tabId ?? "");
  const [serverId, setServerId] = useState(product?.serverId ?? "");
  const selectedTab = productTabs.find((tab) => tab.id === tabId) ?? null;
  const isService = selectedTab?.layout === "SERVICE";

  // Preço do produto acompanhado AO VIVO só para a prévia do serviço.
  const [priceCents, setPriceCents] = useState(product?.priceCents ?? 0);
  const onPriceChange = useCallback((cents: number) => setPriceCents(cents), []);
  const [pricingDraft, setPricingDraft] = useState<PricingDraft>(() => pricingToDraft(product?.pricing));

  /**
   * Lê as abas do jogo recém-escolhido. O contador descarta respostas
   * atrasadas: trocar de jogo duas vezes rápido não pode deixar as abas do
   * primeiro no select do segundo.
   */
  function loadTabs(id: string) {
    const request = ++tabsRequest.current;
    setTabs(null);
    setTabsError(false);
    setTabId("");
    if (!id) return;
    startLoadTabs(async () => {
      const result = await runAction(() => listGameTabsAction(id), { ok: false, reason: "error" });
      if (request !== tabsRequest.current) return;
      if (!result.ok) {
        setTabsError(true);
        return;
      }
      setTabs(result.data);
      const options = result.data.filter(isProductTab);
      // Uma aba só já vem escolhida — mesma regra dos outros selects.
      setTabId(options.length === 1 ? options[0].id : "");
    });
  }

  /**
   * Trocar o jogo apaga os erros da PRIMEIRA fileira, e só dela.
   *
   * Escolher um jogo já preenche plataforma e tipo quando há uma opção só — e
   * deixar "Escolha a plataforma" em vermelho embaixo de um campo que agora diz
   * "Steam" é a mesma contradição de um placeholder que mostra um valor e vale
   * vazio. Os erros de preço e de nome ficam: eles continuam verdadeiros, e
   * apagá-los esconderia o que ainda falta preencher.
   */
  function selectGame(id: string) {
    setGameId(id);
    const game = games.find((item) => item.id === id);
    setServerId(game && game.servers.length === 1 ? game.servers[0].id : "");
    loadTabs(id);
    setFieldErrors((previous) => ({
      priceCents: previous.priceCents,
      name: previous.name,
    }));
  }

  const gameOptions = games.map((game) => ({ value: game.id, label: game.name }));

  const platformOptions =
    selectedGame?.platforms.map((value) => ({
      value,
      label: labelFor(PLATFORMS, value),
    })) ?? [];

  const tabOptions = productTabs.map((tab) => ({
    value: tab.id,
    label: `${tab.label}${tab.layout === "SERVICE" ? " — serviço" : ""}${tab.isActive ? "" : " (oculta)"}`,
  }));

  const serverOptions =
    selectedGame?.servers.map((server) => ({ value: server.id, label: server.label })) ?? [];

  // Categorias vêm do Builder de Páginas. Jogo que nunca passou por lá tem a
  // lista vazia, e aí o select aparece desabilitado com a explicação — em vez
  // de sumir e deixar a pessoa sem saber por que não dá para classificar.
  //
  // Só as do ESCOPO: servidor + aba escolhidos, mais as globais (sem servidor
  // / sem aba). Categoria de outro servidor ou aba não aparece na vitrine
  // daquele produto, e o backend recusaria a combinação.
  const categoryOptions = selectedGame
    ? categorySelectOptions(
        selectedGame.categories.filter(
          (category) =>
            (!category.serverId || category.serverId === serverId) &&
            (!category.tabId || category.tabId === tabId),
        ),
      )
    : [];
  const categoryDefault =
    product?.categoryId && categoryOptions.some((option) => option.value === product.categoryId)
      ? product.categoryId
      : undefined;

  /**
   * O que vai no hidden `pricing`: a regra (aba SERVIÇO), `"null"` para LIMPAR
   * a de um produto que saiu de uma aba de serviço, ou nada.
   */
  const pricingCheck = isService ? draftToPricing(pricingDraft) : null;
  const pricingField = pricingCheck
    ? pricingCheck.ok
      ? JSON.stringify(pricingCheck.pricing)
      : ""
    : isEditing && product?.pricing
      ? "null"
      : "";

  /** Uma opção só já vem escolhida; várias abrem com o placeholder. */
  const onlyOption = (options: { value: string }[]) =>
    options.length === 1 ? options[0].value : undefined;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const data = new FormData(event.currentTarget);

    const parsed = createProductSchema.safeParse({
      // Editando, o select de jogo está DESABILITADO — e campo desabilitado
      // não entra no `FormData`. O valor vem do produto, que é quem o sabe.
      gameId: product?.game.id ?? data.get("gameId") ?? "",
      name: data.get("name"),
      priceCents: data.get("priceCents"),
      platform: data.get("platform") ?? "",
      tabId: data.get("tabId") ?? "",
      serverId: data.get("serverId") ?? "",
      categoryId: data.get("categoryId") ?? "",
    });

    if (!parsed.success) {
      const errors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as ErrorField | undefined;
        if (field && !errors[field]) errors[field] = issue.message;
      }
      setFieldErrors(errors);
      setFormError(null);
      setSaved(null);
      return;
    }

    // O servidor é obrigatório QUANDO o jogo tem servidores — não dá para
    // exprimir isso no zod sem dar a ele acesso à lista de jogos. Um produto
    // sem servidor num jogo que filtra por servidor some da vitrine filtrada.
    if (selectedGame && selectedGame.servers.length > 0 && parsed.data.serverId === "") {
      setFieldErrors({ serverId: "Escolha o servidor do produto." });
      setFormError(null);
      setSaved(null);
      return;
    }

    // Regra de preço inválida não sai daqui: o erro já está escrito embaixo
    // do editor, e este aviso aponta para ele.
    if (pricingCheck && !pricingCheck.ok) {
      setFieldErrors({});
      setFormError(`Preço do serviço: ${pricingCheck.message}`);
      setSaved(null);
      return;
    }

    setFieldErrors({});
    setFormError(null);

    startSubmit(async () => {
      // O slug é lido AGORA, antes do `await`: no sucesso o formulário zera o
      // jogo escolhido, e depois disso não haveria mais de onde tirá-lo.
      const gameSlug = selectedGame?.slug ?? null;
      const result = await runAction(
        () => (isEditing ? updateProductAction(product.id, data) : createProductAction(data)),
        { ok: false, reason: "error", message: ACTION_FAILED_UPLOAD_MESSAGE },
      );

      if (!result.ok) {
        setFormError(result.message ?? ERROR_MESSAGES[result.reason]);
        setSaved(null);
        return;
      }

      // Editando, a tela cumpriu o papel e o lugar de conferir o resultado é a
      // listagem. Cadastrando, fica-se aqui: é uma tela de cadastrar em série.
      if (isEditing) {
        router.push("/admin/produtos");
        return;
      }

      setSaved({ name: result.name, gameName: result.gameName, gameSlug });
      formRef.current?.reset();
      // O `reset()` nativo devolve os campos ao estado inicial do DOM, mas o
      // jogo escolhido também vive em estado React (é ele que monta os três
      // selects dependentes). Sem esta linha, os dropdowns continuariam com as
      // opções do jogo anterior sobre um campo de jogo já vazio.
      setGameId("");
      loadTabs("");
      setServerId("");
      setPricingDraft(pricingToDraft(null));
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="px-[50px] pt-[33px]">
      <AdminFieldGrid>
        <SelectField
          label="Jogo:"
          name="gameId"
          placeholder="Selecione o jogo"
          options={gameOptions}
          defaultValue={product?.game.id}
          // Editando, o jogo é FIXO: trocá-lo mudaria junto o significado de
          // plataforma, servidor e tipo, e o backend nem aceita o campo no PATCH.
          disabled={isEditing}
          onValueChange={selectGame}
          error={fieldErrors.gameId}
        />

        <SelectField
          key={`platform-${gameId}`}
          label="Plataforma:"
          name="platform"
          placeholder="Plataforma"
          options={platformOptions}
          defaultValue={product?.platform ?? onlyOption(platformOptions)}
          disabled={selectedGame === null}
          error={fieldErrors.platform}
        />

        <SelectField
          key={`server-${gameId}`}
          label="Servidor:"
          name="serverId"
          // Placeholder diferente quando o jogo não tem servidor nenhum: um
          // campo vazio e desabilitado sem explicação parece defeito.
          placeholder={
            selectedGame !== null && serverOptions.length === 0
              ? "Este jogo não tem servidores"
              : "Servidor"
          }
          options={serverOptions}
          defaultValue={product?.serverId ?? onlyOption(serverOptions)}
          onValueChange={setServerId}
          disabled={selectedGame === null || serverOptions.length === 0}
          error={fieldErrors.serverId}
        />

        <SelectField
          key={`category-${gameId}-${serverId}-${tabId}`}
          label="Categoria:"
          name="categoryId"
          // Placeholder diferente quando o jogo não tem categoria nenhuma —
          // mesma razão do servidor: campo vazio e desabilitado sem explicação
          // parece defeito. Aqui o texto ainda diz ONDE se cria uma.
          placeholder={
            selectedGame !== null && categoryOptions.length === 0
              ? "Nenhuma neste servidor/aba"
              : "Categoria (opcional)"
          }
          options={categoryOptions}
          defaultValue={categoryDefault}
          disabled={selectedGame === null || categoryOptions.length === 0}
          error={fieldErrors.categoryId}
        />

        <SelectField
          // Remonta quando as abas chegam: o `defaultValue` do Radix só vale
          // na montagem.
          key={`tab-${gameId}-${tabs === null ? "loading" : tabs.length}`}
          label="Aba:"
          name="tabId"
          placeholder={
            selectedGame === null
              ? "Aba"
              : loadingTabs
                ? "Carregando abas…"
                : tabsError
                  ? "Não foi possível ler as abas"
                  : tabOptions.length === 0
                    ? "Nenhuma — crie em Jogos → Abas"
                    : "Aba do produto"
          }
          options={tabOptions}
          defaultValue={tabId || undefined}
          onValueChange={setTabId}
          disabled={selectedGame === null || tabOptions.length === 0}
          error={
            fieldErrors.tabId ??
            (tabsError ? "Recarregue a página para tentar ler as abas de novo." : undefined)
          }
        />

        <MoneyField
          // Em serviço o "preço" muda de papel conforme o modo — o rótulo diz qual.
          label={
            isService && pricingDraft.mode === "QUANTITY"
              ? "Preço unitário padrão"
              : isService && pricingDraft.mode === "LEVEL_RANGE"
                ? "Taxa base do serviço"
                : "Preço"
          }
          name="priceCents"
          placeholder="R$ 0,00"
          defaultCents={product?.priceCents}
          onCentsChange={onPriceChange}
          error={fieldErrors.priceCents}
        />

        <FileField
          label="Imagem do produto"
          // Editando sem anexar nada, o backend mantém a arte atual — o texto diz
          // isso para ninguém achar que salvar vai apagar a imagem que já existe.
          placeholder={isEditing ? "Trocar imagem (opcional)" : "Anexar imagem"}
          name="image"
          accept={ACCEPTED_IMAGE_TYPES}
          maxBytes={MAX_IMAGE_BYTES}
        />

        <TextField
          label="Nome do produto"
          name="name"
          placeholder="500M Divine Orbs"
          defaultValue={product?.name}
          autoComplete="off"
          maxLength={160}
          error={fieldErrors.name}
        />
      </AdminFieldGrid>

      <input type="hidden" name="pricing" value={pricingField} />
      {isService ? (
        <div className="mt-[49px] max-w-[1100px]">
          <PricingEditor draft={pricingDraft} onChange={setPricingDraft} basePriceCents={priceCents} />
        </div>
      ) : null}

      <AdminFormActions>
        <Button type="submit" variant="primary" fullWidth disabled={isSubmitting}>
          {isSubmitting
            ? "SALVANDO…"
            : isEditing
              ? "SALVAR ALTERAÇÕES"
              : "SALVAR E ANUNCIAR"}
        </Button>

        {formError ? (
          <p role="alert" className="font-helvetica text-[14px] text-red-9">
            {formError}
          </p>
        ) : null}

        {saved ? (
          <div role="status" className="flex flex-col gap-1">
            <p className="font-helvetica text-[14px] text-brand-rating">
              {saved.name} cadastrado em {saved.gameName}
            </p>
            {/* Até 2026-09-10 aqui havia um aviso de que a vitrine não lia o
                banco. Ela lê desde então, e o aviso passou a MENTIR — fazia o
                admin achar que o cadastro não tinha efeito. No lugar, o atalho
                para conferir o produto onde o cliente vai vê-lo. */}
            {saved.gameSlug ? (
              <Link
                href={`/games/${encodeURIComponent(saved.gameSlug)}`}
                target="_blank"
                rel="noopener"
                className="font-helvetica text-[13px] text-brand-fg-subtle underline underline-offset-2 hover:text-white"
              >
                Ver na loja
              </Link>
            ) : null}
          </div>
        ) : null}
      </AdminFormActions>
    </form>
  );
}
