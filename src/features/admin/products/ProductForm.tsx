"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type FormEvent } from "react";
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
  PRODUCT_TYPES,
  labelFor,
} from "../games/options";
import {
  createProductAction,
  updateProductAction,
  type CreateProductResult,
} from "./actions";
import { createProductSchema } from "./schema";
import type { AdminProduct } from "./catalog";

type ErrorField =
  | "gameId"
  | "name"
  | "priceCents"
  | "platform"
  | "productType"
  | "serverId";
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
}: {
  games: AdminGame[];
  /** Presente = EDIÇÃO. Ausente = cadastro novo. */
  product?: AdminProduct;
}) {
  const router = useRouter();
  const isEditing = product !== undefined;

  const formRef = useRef<HTMLFormElement>(null);
  const [isSubmitting, startSubmit] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ name: string; gameName: string } | null>(null);

  const [gameId, setGameId] = useState(product?.game.id ?? "");
  const selectedGame = games.find((game) => game.id === gameId) ?? null;

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

  const productTypeOptions =
    selectedGame?.productTypes.map((value) => ({
      value,
      label: labelFor(PRODUCT_TYPES, value),
    })) ?? [];

  const serverOptions =
    selectedGame?.servers.map((server) => ({ value: server.id, label: server.label })) ?? [];

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
      productType: data.get("productType") ?? "",
      serverId: data.get("serverId") ?? "",
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

    setFieldErrors({});
    setFormError(null);

    startSubmit(async () => {
      const result = isEditing
        ? await updateProductAction(product.id, data)
        : await createProductAction(data);

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

      setSaved({ name: result.name, gameName: result.gameName });
      formRef.current?.reset();
      // O `reset()` nativo devolve os campos ao estado inicial do DOM, mas o
      // jogo escolhido também vive em estado React (é ele que monta os três
      // selects dependentes). Sem esta linha, os dropdowns continuariam com as
      // opções do jogo anterior sobre um campo de jogo já vazio.
      setGameId("");
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
          disabled={selectedGame === null || serverOptions.length === 0}
          error={fieldErrors.serverId}
        />

        <SelectField
          key={`type-${gameId}`}
          label="Tipo de Produto:"
          name="productType"
          placeholder="Tipo de produto"
          options={productTypeOptions}
          defaultValue={product?.productType ?? onlyOption(productTypeOptions)}
          disabled={selectedGame === null}
          error={fieldErrors.productType}
        />

        <MoneyField
          label="Preço"
          name="priceCents"
          placeholder="R$ 0,00"
          defaultCents={product?.priceCents}
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
            {/* O produto está saved, mas a vitrine ainda lê o conteúdo semente
                do frontend — quem for conferir em /games não vai achar. Dizer
                isso é mais barato que a pessoa concluir que o cadastro falhou. */}
            <p className="font-helvetica text-[13px] text-brand-fg-subtle">
              A vitrine ainda não lê o catálogo do banco, então ele não aparece
              em /games por enquanto.
            </p>
          </div>
        ) : null}
      </AdminFormActions>
    </form>
  );
}
