"use client";

import Link from "next/link";
import { useRef, useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { FileField } from "@/components/ui/FileField";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import {
  AdminFieldGrid,
  AdminFormActions,
} from "@/features/admin/AdminFormCard";
import { ACTION_FAILED_UPLOAD_MESSAGE, runAction } from "@/lib/safeAction";
import { slugify, slugifyDraft } from "@/lib/slugify";
import { createGameAction, type CreateGameResult } from "./actions";
import { centralHref } from "./central";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  PLATFORMS,
  TAB_TEMPLATE_OPTIONS,
} from "./options";
import { createGameSchema } from "./schema";

type ErrorField = "name" | "slug" | "platform" | "tabTemplate" | "servers";
type FieldErrors = Partial<Record<ErrorField, string>>;

type FailureReason = Extract<CreateGameResult, { ok: false }>["reason"];

const ERROR_MESSAGES: Record<FailureReason, string> = {
  unauthenticated: "Sua sessão expirou. Entre de novo para continuar.",
  forbidden: "Sua conta não tem permissão para cadastrar jogos.",
  invalid: "Confira os campos e tente de novo.",
  error: "Não conseguimos salvar agora. Tente novamente em instantes.",
};

/**
 * Formulário "CADASTRO DE JOGO" (Figma 4468:1841).
 *
 * Quatro colunas de 315px com 50px de vão, exatamente as posições do arquivo
 * (x = 50, 415, 780 e 1145 dentro do card de 1510). A segunda fileira tem só a
 * primeira célula ocupada — as outras três ficam vazias, como no desenho.
 *
 * FLUXO e não posição absoluta, apesar de o arquivo ser absoluto: a área entre
 * a segunda fileira e o botão está visivelmente reservada para campos que ainda
 * virão. Em fluxo, um campo novo entra e o card cresce; em coordenada fixa,
 * cada campo novo é um recálculo de todas as medidas abaixo dele.
 *
 * A validação daqui é de UX — avisa na hora, sem esperar o 400 voltar. Quem
 * decide é o backend, e os limites são os mesmos (ver `schema.ts`).
 */
export function GameForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [isSubmitting, startSubmit] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSalvo] = useState<{ name: string; slug: string; id?: string } | null>(null);
  // O link acompanha o NOME até o admin mexer nele; depois é dele. Voltar a
  // esvaziar o campo devolve o automático.
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const shownSlug = slugTouched ? slug : slugify(name);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const data = new FormData(event.currentTarget);

    const parsed = createGameSchema.safeParse({
      name: data.get("name"),
      slug: data.get("slug") ?? "",
      platform: data.get("platform"),
      tabTemplate: data.get("tabTemplate"),
      servers: data.get("servers") ?? "",
    });

    if (!parsed.success) {
      const errors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as ErrorField | undefined;
        // Só a PRIMEIRA mensagem de cada campo: empilhar três avisos embaixo de
        // uma coluna de 315px empurraria a fileira inteira para baixo.
        if (field && !errors[field]) errors[field] = issue.message;
      }
      setFieldErrors(errors);
      setFormError(null);
      setSalvo(null);
      return;
    }

    setFieldErrors({});
    setFormError(null);

    startSubmit(async () => {
      const result = await runAction(() => createGameAction(data), {
        ok: false,
        reason: "error",
        message: ACTION_FAILED_UPLOAD_MESSAGE,
      });

      if (!result.ok) {
        setFormError(result.message ?? ERROR_MESSAGES[result.reason]);
        setSalvo(null);
        return;
      }

      setSalvo({ name: result.name, slug: result.slug, id: result.id });
      // Limpa para o próximo cadastro — é uma tela de cadastrar em série, e
      // deixar o jogo anterior nos campos convida a salvar duplicado. O
      // `reset()` nativo também zera o input de arquivo, que o React não
      // controla e que um `setState` não alcançaria.
      formRef.current?.reset();
      setName("");
      setSlug("");
      setSlugTouched(false);
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="px-[50px] pt-[33px]">
      <AdminFieldGrid>
        <TextField
          label="Nome"
          name="name"
          placeholder="Jogo"
          autoComplete="off"
          maxLength={120}
          error={fieldErrors.name}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />

        {/* Fora do Figma (2026-09-25): o endereço da página na loja. Nasce do
            nome e o admin pode trocar; a prévia já sai normalizada, que é o que
            o servidor vai gravar. */}
        <div>
          <TextField
            label="Link na loja:"
            name="slug"
            placeholder="link-do-jogo"
            autoComplete="off"
            maxLength={80}
            error={fieldErrors.slug}
            value={shownSlug}
            onChange={(event) => {
              setSlug(slugifyDraft(event.target.value));
              setSlugTouched(event.target.value !== "");
            }}
          />
          <p className="mt-[6px] pl-[25px] font-helvetica text-[12px] text-brand-fg-subtle">
            /games/{slugify(shownSlug) || "…"}
          </p>
        </div>

        {/* SEM placeholder, e com a opção do arquivo já escolhida.
            "Steam" e "Gold" são valores REAIS destes selects — desenhá-los como
            texto-fantasma criaria um campo que mostra "Steam" e vale vazio, e
            reprovaria o envio dizendo "escolha a plataforma" logo abaixo de um
            field que diz Steam. Pré-selecionar reproduz exatamente o estado
            desenhado e não deixa estado inválido invisível. */}
        <SelectField
          label="Plataformas:"
          name="platform"
          defaultValue="STEAM"
          options={PLATFORMS}
          error={fieldErrors.platform}
        />

        {/* Texto livre e não select: o nome do servidor é do JOGO ("Eternal
            Softcore", "Season 34"), e nenhuma lista fechada sobreviveria à
            próxima liga que a desenvolvedora lançar. O plural do placeholder do
            arquivo ("Servidores") é o que diz que aqui vai mais de um — vários
            separados por vírgula. */}
        <TextField
          label="Servidor:"
          name="servers"
          placeholder="Servidores"
          autoComplete="off"
          error={fieldErrors.servers}
        />

        <SelectField
          // Só um MODELO: vira a PRIMEIRA aba do jogo (o backend a cria com
          // rótulo, ícone e layout do modelo); as outras se criam depois, em
          // "Abas". Não é gravado como "tipo" em lugar nenhum.
          label="Tipo de produto inicial:"
          name="tabTemplate"
          defaultValue="GOLD"
          options={TAB_TEMPLATE_OPTIONS}
          error={fieldErrors.tabTemplate}
        />

        <FileField
          label="Imagem do jogo"
          placeholder="Anexar imagem"
          name="image"
          accept={ACCEPTED_IMAGE_TYPES}
          maxBytes={MAX_IMAGE_BYTES}
        />
      </AdminFieldGrid>

      <AdminFormActions>
        <Button type="submit" variant="primary" fullWidth disabled={isSubmitting}>
          {isSubmitting ? "SALVANDO…" : "SALVAR E CADASTRAR"}
        </Button>

        {/* `role="alert"` interrompe o leitor de tela, `role="status"` não.
            Falha precisa interromper; confirmação, não. */}
        {formError ? (
          <p role="alert" className="font-helvetica text-[14px] text-red-9">
            {formError}
          </p>
        ) : null}

        {saved ? (
          <p role="status" className="font-helvetica text-[14px] text-brand-rating">
            {saved.name} cadastrado em /games/{saved.slug} ·{" "}
            {/* As abas nascem do tipo escolhido acima; o próximo passo natural
                é dar nome, ícone e layout a elas (e criar as demais). */}
            {saved.id ? (
              <Link
                href={centralHref(saved.id, { section: "abas" })}
                className="font-bold underline"
              >
                configurar as abas →
              </Link>
            ) : (
              <Link href="/admin/jogos" className="font-bold underline">
                ver lista de jogos
              </Link>
            )}
          </p>
        ) : null}
      </AdminFormActions>
    </form>
  );
}
