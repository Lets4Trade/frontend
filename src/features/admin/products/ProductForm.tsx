"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { FileField } from "@/components/ui/FileField";
import { MoneyField } from "@/components/ui/MoneyField";
import { SelectField } from "@/components/ui/SelectField";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { TextField } from "@/components/ui/TextField";
import { toastOk } from "@/components/ui/Toasts";
import { QUOTED_LAYOUTS, effectivePricing } from "@/features/pricing/quote";
import { AdminFieldGrid, AdminFormActions } from "@/features/admin/AdminFormCard";
import type { AdminGame } from "@/features/admin/catalog";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  PLATFORMS,
  labelFor,
} from "../games/options";
import { listGameTabsAction } from "../games/tabs/actions";
import { isProductTab, layoutLabel, type GameTab, type TabLayout } from "../games/tabs/types";
import { PricingEditor } from "./PricingEditor";
import { draftToPricing, pricingToDraft, type PricingDraft } from "./pricingDraft";
import {
  createProductAction,
  updateProductAction,
  type CreateProductResult,
} from "./actions";
import { ACTION_FAILED_UPLOAD_MESSAGE, runAction } from "@/lib/safeAction";
import { MAX_HIGHLIGHTS, createProductSchema, parseHighlights } from "./schema";
import type { AdminProduct } from "./catalog";
import type { ProductPrefill } from "./links";
import { categorySelectOptions } from "./categoryOptions";

type ErrorField =
  | "gameId"
  | "name"
  | "priceCents"
  | "platform"
  | "tabId"
  | "serverId"
  | "categoryId"
  | "highlights";
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
 * ── Layouts v2 (contrato `game-tabs-v2.md`, 2026-09-30) ────────────────────
 * Abas LINK e SELL não recebem produto e ficam fora do select
 * (`isProductTab`). O editor de preço vale para toda aba de `QUOTED_LAYOUTS`
 * (Serviço, Quantidade, Pacotes) e parte de `effectivePricing` — a MESMA
 * regra que a vitrine e o backend usam, então produto de aba Quantidade sem
 * regra salva abre mostrando o padrão que já vale na loja. Aba PACOTES ganha
 * os "Tópicos do card" (`highlights`).
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
  prefill,
  returnTo = null,
}: {
  games: AdminGame[];
  /** Presente = EDIÇÃO. Ausente = cadastro novo. */
  product?: AdminProduct;
  /**
   * Abas do jogo, lidas no servidor: o do produto (edição) ou o do
   * pré-preenchimento (cadastro com `?jogo=`).
   */
  initialTabs?: GameTab[] | null;
  /**
   * Cadastro com o contexto já escolhido pela URL (`links.ts`), JÁ conferido
   * contra `games`/`initialTabs` pela página. Ignorado na edição.
   */
  prefill?: ProductPrefill;
  /**
   * `?volta=` JÁ conferido (`safeReturnPath`, só `/admin/...`): para onde ir
   * depois de salvar — a Central do jogo manda o próprio endereço. Na edição
   * troca a listagem; no cadastro, o "SALVAR E ANUNCIAR" volta para lá (o
   * "Salvar e cadastrar outro" continua aqui, como sempre).
   */
  returnTo?: string | null;
}) {
  const router = useRouter();
  const isEditing = product !== undefined;
  const seed = isEditing ? null : (prefill ?? null);
  const initialGameId = product?.game.id ?? seed?.gameId ?? "";
  const initialGame = games.find((game) => game.id === initialGameId) ?? null;
  // Mesma regra dos selects: uma opção só já vem escolhida.
  const initialProductTabs = initialTabs?.filter(isProductTab) ?? [];
  const initialTabId =
    product?.tabId ??
    (seed?.tabId || (initialProductTabs.length === 1 ? initialProductTabs[0].id : ""));
  const initialServerId =
    product?.serverId ??
    (seed?.serverId || (initialGame?.servers.length === 1 ? initialGame.servers[0].id : ""));

  const formRef = useRef<HTMLFormElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  /**
   * Qual botão enviou: "SALVAR E ANUNCIAR" (zera tudo, como sempre) ou
   * "Salvar e cadastrar outro" (mantém o contexto). Ref e não estado: é lido
   * uma vez, no submit, e não desenha nada. O Enter num campo dispara o
   * PRIMEIRO botão de envio — o de sempre.
   */
  const submitIntent = useRef<"announce" | "again">("announce");
  /**
   * Muda a cada "cadastrar outro": remonta nome, preço e imagem, os três
   * campos que se limpam (os dois últimos guardam estado próprio que só o
   * `reset()` do form alcançaria — e ele levaria os selects junto).
   */
  const [entryKey, setEntryKey] = useState(0);
  /**
   * Muda a cada "SALVAR E ANUNCIAR" bem-sucedido, que zera o formulário. Com
   * pré-preenchimento o select de jogo nasce com `defaultValue`, e o `reset()`
   * do form o devolveria a ele (o Radix escuta o reset) com o estado já
   * vazio; remontar sem valor mantém tela e estado de acordo.
   */
  const [resetCount, setResetCount] = useState(0);

  // Depois de "cadastrar outro", o foco volta ao nome: é o próximo campo a
  // mudar, e o teclado não precisa voltar do botão até lá.
  useEffect(() => {
    if (entryKey > 0) nameRef.current?.focus();
  }, [entryKey]);
  const [isSubmitting, startSubmit] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState<{
    name: string;
    gameName: string;
    /** Para o "Ver na loja"; `null` se o jogo sumiu da lista entre o envio e a volta. */
    gameSlug: string | null;
  } | null>(null);

  const [gameId, setGameId] = useState(initialGameId);
  const selectedGame = games.find((game) => game.id === gameId) ?? null;

  // Abas do jogo escolhido. `null` = ainda não lidas (ou a leitura falhou —
  // `tabsError` diz qual). Só as de catálogo/serviço recebem produto.
  const [tabs, setTabs] = useState<GameTab[] | null>(initialTabs ?? null);
  const [tabsError, setTabsError] = useState(initialGameId !== "" && !initialTabs);
  const [loadingTabs, startLoadTabs] = useTransition();
  const tabsRequest = useRef(0);
  const productTabs = tabs?.filter(isProductTab) ?? [];

  const [tabId, setTabId] = useState(initialTabId);
  const [serverId, setServerId] = useState(initialServerId);
  const selectedTab = productTabs.find((tab) => tab.id === tabId) ?? null;
  const isQuoted = selectedTab !== null && isQuotedLayout(selectedTab.layout);
  const isPackages = selectedTab?.layout === "PACKAGES";

  // Preço do produto acompanhado AO VIVO só para a prévia do serviço.
  const [priceCents, setPriceCents] = useState(product?.priceCents ?? 0);
  const onPriceChange = useCallback((cents: number) => setPriceCents(cents), []);
  // A regra que VALE hoje para o produto (`effectivePricing`): a salva, ou o
  // padrão do layout da aba (Quantidade sem regra = 1..1000).
  const [pricingDraft, setPricingDraft] = useState<PricingDraft>(() => {
    const layout = initialTabs?.find((tab) => tab.id === initialTabId)?.layout;
    return pricingToDraft(effectivePricing(layout, product?.pricing) ?? product?.pricing);
  });
  // Mexeu no editor? Então trocar de aba não pode apagar o que foi digitado.
  const pricingTouched = useRef(false);
  const onPricingChange = useCallback((next: PricingDraft) => {
    pricingTouched.current = true;
    setPricingDraft(next);
  }, []);

  // Tópicos do card (aba PACOTES), uma linha por tópico.
  const [highlightsText, setHighlightsText] = useState(() => (product?.highlights ?? []).join("\n"));

  /**
   * Escolhe a aba. Sem regra digitada nem salva, o editor passa a mostrar o
   * padrão do layout novo (Quantidade → "Por quantidade" 1..1000; Serviço e
   * Pacotes → preço fixo) — o mesmo que a loja usaria sem regra.
   */
  function selectTab(id: string, list: GameTab[] | null = tabs) {
    setTabId(id);
    if (pricingTouched.current || product?.pricing) return;
    const layout = list?.find((tab) => tab.id === id)?.layout;
    setPricingDraft(pricingToDraft(effectivePricing(layout, null)));
  }

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
      selectTab(options.length === 1 ? options[0].id : "", result.data);
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
    label: `${tab.label}${tab.layout === "CATALOG" ? "" : ` — ${layoutLabel(tab.layout).toLowerCase()}`}${tab.isActive ? "" : " (oculta)"}`,
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
   * O que vai no hidden `pricing`: a regra (aba cotada), `"null"` para LIMPAR
   * a de um produto que saiu de uma aba cotada, ou nada.
   */
  const pricingCheck = isQuoted ? draftToPricing(pricingDraft) : null;
  const pricingField = pricingCheck
    ? pricingCheck.ok
      ? JSON.stringify(pricingCheck.pricing)
      : ""
    : isEditing && product?.pricing
      ? "null"
      : "";

  /**
   * O hidden `highlights`: a lista (aba PACOTES), `"[]"` para LIMPAR os de um
   * produto que saiu de uma aba de pacotes, ou nada (não mexe).
   */
  const highlightsCheck = isPackages ? parseHighlights(highlightsText) : null;
  const highlightsField = highlightsCheck
    ? highlightsCheck.ok
      ? JSON.stringify(highlightsCheck.highlights)
      : ""
    : isEditing && (product?.highlights?.length ?? 0) > 0
      ? "[]"
      : "";

  /** Uma opção só já vem escolhida; várias abrem com o placeholder. */
  const onlyOption = (options: { value: string }[]) =>
    options.length === 1 ? options[0].value : undefined;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const again = !isEditing && submitIntent.current === "again";
    submitIntent.current = "announce";

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

    if (highlightsCheck && !highlightsCheck.ok) {
      setFieldErrors({ highlights: highlightsCheck.message });
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
        // Voltando para a Central, o aviso vai junto (o toaster é do layout
        // do painel e sobrevive à navegação); a listagem já mostra o produto.
        if (returnTo) toastOk(`${result.name} salvo.`);
        router.push(returnTo ?? "/admin/produtos");
        return;
      }

      if (returnTo && !again) {
        toastOk(`${result.name} cadastrado em ${result.gameName}.`);
        router.push(returnTo);
        return;
      }

      setSaved({ name: result.name, gameName: result.gameName, gameSlug });

      // "Salvar e cadastrar outro": o próximo produto é do MESMO jogo, aba,
      // servidor, plataforma e categoria, com a mesma regra de preço — só o
      // que descreve o item (nome, preço, imagem, tópicos) volta em branco.
      // Os selects não são tocados (nem remontados: as `key` deles não mudam).
      if (again) {
        setEntryKey((key) => key + 1);
        setPriceCents(0);
        setHighlightsText("");
        return;
      }

      formRef.current?.reset();
      setResetCount((count) => count + 1);
      // O `reset()` nativo devolve os campos ao estado inicial do DOM, mas o
      // jogo escolhido também vive em estado React (é ele que monta os três
      // selects dependentes). Sem esta linha, os dropdowns continuariam com as
      // opções do jogo anterior sobre um campo de jogo já vazio.
      setGameId("");
      loadTabs("");
      setServerId("");
      setPricingDraft(pricingToDraft(null));
      pricingTouched.current = false;
      setHighlightsText("");
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="px-[50px] pt-[33px]">
      <AdminFieldGrid>
        <SelectField
          key={`game-${resetCount}`}
          label="Jogo:"
          name="gameId"
          placeholder="Selecione o jogo"
          options={gameOptions}
          defaultValue={resetCount === 0 && initialGameId ? initialGameId : undefined}
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
          defaultValue={
            product?.platform ??
            (gameId === initialGameId && seed?.platform ? seed.platform : onlyOption(platformOptions))
          }
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
          // O estado já nasce com o do produto, o do pré-preenchimento ou a
          // opção única — e `selectGame` o repõe a cada troca de jogo.
          defaultValue={serverId || undefined}
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
          onValueChange={(id) => selectTab(id)}
          disabled={selectedGame === null || tabOptions.length === 0}
          error={
            fieldErrors.tabId ??
            (tabsError ? "Recarregue a página para tentar ler as abas de novo." : undefined)
          }
        />

        <MoneyField
          key={`price-${entryKey}`}
          // Em serviço o "preço" muda de papel conforme o modo — o rótulo diz qual.
          label={
            isQuoted && pricingDraft.mode === "QUANTITY"
              ? "Preço unitário padrão"
              : isQuoted && pricingDraft.mode === "LEVEL_RANGE"
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
          key={`image-${entryKey}`}
          label="Imagem do produto"
          // Editando sem anexar nada, o backend mantém a arte atual — o texto diz
          // isso para ninguém achar que salvar vai apagar a imagem que já existe.
          placeholder={isEditing ? "Trocar imagem (opcional)" : "Anexar imagem"}
          name="image"
          accept={ACCEPTED_IMAGE_TYPES}
          maxBytes={MAX_IMAGE_BYTES}
        />

        <TextField
          key={`name-${entryKey}`}
          ref={nameRef}
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
      <input type="hidden" name="highlights" value={highlightsField} />

      {isPackages ? (
        <div className="mt-[49px] max-w-[660px]">
          <TextAreaField
            label="Tópicos do card"
            value={highlightsText}
            onChange={(event) => {
              setHighlightsText(event.target.value);
              setFieldErrors((previous) => ({ ...previous, highlights: undefined }));
            }}
            placeholder={"Manual Boosting Guarantee\nEntrega em até 24h"}
            // Folga para as quebras de linha; o teto real (6 × 80) é do zod.
            maxLength={(MAX_HIGHLIGHTS + 2) * 81}
            error={fieldErrors.highlights}
          />
          <p className="mt-[6px] pl-[25px] font-helvetica text-[12px] text-brand-fg-subtle">
            Um tópico por linha, até {MAX_HIGHLIGHTS} linhas de até 80 caracteres. Aparecem com bolinha no card do
            pacote. Linhas em branco são ignoradas.
          </p>
        </div>
      ) : null}

      {isQuoted ? (
        <div className="mt-[49px] max-w-[1100px]">
          {selectedTab?.layout === "QUANTITY" && pricingDraft.mode !== "QUANTITY" ? (
            <p className="mb-[15px] font-helvetica text-[13px] text-brand-orange">
              Aba de Quantidade: use “Por quantidade” — as quantidades prontas viram os botões da loja.
            </p>
          ) : null}
          <PricingEditor draft={pricingDraft} onChange={onPricingChange} basePriceCents={priceCents} />
        </div>
      ) : null}

      <AdminFormActions>
        <Button
          type="submit"
          variant="primary"
          fullWidth
          disabled={isSubmitting}
          onClick={() => {
            submitIntent.current = "announce";
          }}
        >
          {isSubmitting
            ? "SALVANDO…"
            : isEditing
              ? "SALVAR ALTERAÇÕES"
              : "SALVAR E ANUNCIAR"}
        </Button>

        {/* Cadastro em série (admin-games-ux.md, Etapa 1): mantém jogo,
            plataforma, servidor, aba, categoria e regra de preço; limpa nome,
            preço, imagem e tópicos. Só no cadastro — na edição não há "outro". */}
        {isEditing ? null : (
          <Button
            type="submit"
            variant="outline"
            fullWidth
            disabled={isSubmitting}
            onClick={() => {
              submitIntent.current = "again";
            }}
          >
            Salvar e cadastrar outro
          </Button>
        )}

        {returnTo ? (
          <Link
            href={returnTo}
            className="font-poppins text-[14px] font-bold text-white/70 transition-opacity hover:opacity-80"
          >
            ← Voltar sem salvar
          </Link>
        ) : null}

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

/** A aba cobra por `quote` (Serviço, Quantidade, Pacotes)? Fonte: `QUOTED_LAYOUTS`. */
function isQuotedLayout(layout: TabLayout): boolean {
  return (QUOTED_LAYOUTS as readonly string[]).includes(layout);
}
