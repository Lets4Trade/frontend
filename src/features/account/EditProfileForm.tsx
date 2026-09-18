"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import {
  ACCOUNT_ERROR_MESSAGES,
  AccountError,
  confirmEmailChange,
  saveProfile,
} from "./accountService";
import { editProfileSchema, type EditProfileValues } from "./schema";

type FieldErrors = Partial<Record<keyof EditProfileValues, string>>;

export type ProfileDefaults = {
  name: string;
  email: string;
  discord: string;
  whatsapp: string;
};

/**
 * Formulário "Minhas Informações" (Figma 2116:2106).
 *
 * Duas colunas de 315px com 50px de vão. A esquerda tem três campos (Nome,
 * Discord, Alterar senha) e a direita dois (Email, WhatsApp) — a terceira
 * célula da direita fica vazia, como no design.
 *
 * DOIS CAMPOS NÃO ESTÃO NO ARQUIVO e entraram por exigência do backend: "Senha
 * atual" e, quando o e-mail muda, o código de 6 dígitos. Os dois só APARECEM
 * quando são necessários, então quem só corrige o WhatsApp continua vendo
 * exatamente a tela desenhada.
 *
 * O motivo é de segurança, não de burocracia: trocar e-mail ou senha sem
 * confirmar a senha atual deixaria uma sessão sequestrada tomar a conta. O
 * backend recusa as duas operações sem ela.
 */
export function EditProfileForm({ defaults }: { defaults: ProfileDefaults }) {
  const router = useRouter();

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);

  /** Liga o campo "Senha atual" assim que uma credencial entra em jogo. */
  const [needsPassword, setNeedsPassword] = useState(false);
  /** Liga o campo de código depois que o backend o envia. */
  const [awaitingCode, setAwaitingCode] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => () => abortRef.current?.abort(), []);

  function nextController() {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    return controller;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const form = event.currentTarget;
    const data = new FormData(form);
    const read = (name: string) => String(data.get(name) ?? "");

    const parsed = editProfileSchema.safeParse({
      name: read("name"),
      email: read("email"),
      discord: read("discord"),
      whatsapp: read("whatsapp"),
      password: read("password"),
      currentPassword: read("currentPassword"),
    });

    if (!parsed.success) {
      const { fieldErrors: zodErrors } = parsed.error.flatten();
      const next: FieldErrors = {};
      for (const [key, messages] of Object.entries(zodErrors)) {
        const first = messages?.[0];
        if (first) next[key as keyof EditProfileValues] = first;
      }
      setFieldErrors(next);
      setFormError(null);
      setSaved(false);
      return;
    }

    const values = parsed.data;
    const touchesCredentials =
      values.password !== "" ||
      values.email.trim().toLowerCase() !== defaults.email.trim().toLowerCase();

    // Revela o campo em vez de mandar a requisição para tomar 401: o backend
    // recusaria, e o usuário levaria um erro sem saber o que faltou.
    if (touchesCredentials && values.currentPassword === "") {
      setNeedsPassword(true);
      setFieldErrors({
        currentPassword: "Confirme sua senha atual para alterar e-mail ou senha.",
      });
      setFormError(null);
      setSaved(false);
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setSaved(false);
    setIsSubmitting(true);

    try {
      const result = await saveProfile(
        values,
        defaults.email,
        nextController().signal,
      );

      if (result.emailChangePending) {
        setAwaitingCode(true);
      } else {
        setSaved(true);
        setNeedsPassword(false);
        // Recarrega os dados do servidor: o card de perfil ao lado mostra o
        // nome, e ele acabou de mudar.
        router.refresh();
      }

      // Limpa as senhas depois do envio — não há ganho em deixá-las no DOM.
      clearSecrets(form);
      setIsSubmitting(false);
    } catch (cause) {
      handleFailure(cause);
    }
  }

  async function handleConfirmCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const code = String(new FormData(event.currentTarget).get("code") ?? "").trim();
    if (!/^\d{6}$/.test(code)) {
      setFieldErrors({});
      setFormError("Informe o código de 6 dígitos.");
      return;
    }

    setFormError(null);
    setIsSubmitting(true);
    try {
      await confirmEmailChange(code, nextController().signal);
      setAwaitingCode(false);
      setNeedsPassword(false);
      setSaved(true);
      setIsSubmitting(false);
      router.refresh();
    } catch (cause) {
      handleFailure(cause);
    }
  }

  function handleFailure(cause: unknown) {
    if (cause instanceof DOMException && cause.name === "AbortError") return;
    if (cause instanceof AccountError) {
      if (cause.code === "email_taken") {
        setFieldErrors({ email: ACCOUNT_ERROR_MESSAGES.email_taken });
      } else if (cause.code === "name_taken") {
        setFieldErrors({ name: ACCOUNT_ERROR_MESSAGES.name_taken });
      } else if (cause.code === "wrong_password") {
        setNeedsPassword(true);
        setFieldErrors({ currentPassword: ACCOUNT_ERROR_MESSAGES.wrong_password });
      } else {
        setFormError(ACCOUNT_ERROR_MESSAGES[cause.code]);
      }
    } else {
      setFormError(ACCOUNT_ERROR_MESSAGES.unknown);
    }
    setIsSubmitting(false);
  }

  if (awaitingCode) {
    return (
      <form
        noValidate
        onSubmit={handleConfirmCode}
        className="flex h-full w-full flex-col"
      >
        <p className="font-helvetica text-[16px] leading-[24px] text-brand-fg-muted">
          Enviamos um código de 6 dígitos para <strong>{defaults.email}</strong>,
          o seu e-mail atual. Confirme para concluir a troca.
        </p>

        <div className="mt-[25px] w-[315px]">
          <TextField
            name="code"
            label="Código de confirmação:"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
          />
        </div>

        {formError ? <FormAlert message={formError} /> : null}

        <div className="mt-auto flex gap-[25px]">
          <Button type="submit" variant="primary" disabled={isSubmitting} className="w-[315px] px-0">
            {isSubmitting ? "CONFIRMANDO..." : "CONFIRMAR NOVO E-MAIL"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-[200px] px-0"
            onClick={() => {
              setAwaitingCode(false);
              setFormError(null);
            }}
          >
            CANCELAR
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex h-full w-full flex-col">
      {/* Colunas FIXAS de 315px, não `grid-cols-2`. O painel tem 1000px de área
          útil e o design mantém os campos em 315 (x=50 e x=415), deixando os
          320px restantes vazios à direita. Dividir o espaço em dois esticaria
          cada campo para 475. */}
      <div className="grid grid-cols-1 gap-x-[50px] gap-y-[25px] md:grid-cols-[315px_315px]">
        <TextField
          name="name"
          label="Nome:"
          type="text"
          autoComplete="username"
          placeholder="Nome"
          defaultValue={defaults.name}
          error={fieldErrors.name}
        />
        <TextField
          name="email"
          label="Email:"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="nome@gmail.com"
          defaultValue={defaults.email}
          error={fieldErrors.email}
        />

        <TextField
          name="discord"
          label="Discord:"
          type="text"
          placeholder="Discord ID"
          defaultValue={defaults.discord}
          error={fieldErrors.discord}
        />
        <TextField
          name="whatsapp"
          label="Número De Whatsapp:"
          type="tel"
          mask="phone"
          autoComplete="tel"
          placeholder="(11) 91234-5678"
          defaultValue={defaults.whatsapp}
          error={fieldErrors.whatsapp}
        />

        <TextField
          name="password"
          label="Alterar senha:"
          type="password"
          autoComplete="new-password"
          placeholder="**********"
          error={fieldErrors.password}
          // Basta digitar para o campo de confirmação aparecer, em vez de o
          // usuário descobrir a exigência só ao clicar em salvar.
          onChange={(event) => {
            if (event.currentTarget.value !== "") setNeedsPassword(true);
          }}
        />

        {needsPassword ? (
          <TextField
            name="currentPassword"
            label="Senha atual:"
            type="password"
            autoComplete="current-password"
            placeholder="**********"
            error={fieldErrors.currentPassword}
          />
        ) : null}
      </div>

      {needsPassword ? (
        <p className="mt-[15px] font-helvetica text-[13px] text-brand-fg-subtle">
          Alterar e-mail ou senha exige confirmar a senha atual.
        </p>
      ) : null}

      {formError ? <FormAlert message={formError} /> : null}

      {saved ? (
        <p
          role="status"
          className="mt-[25px] rounded-2xl border border-brand-orange/40 bg-brand-orange/10 px-4 py-3 text-center font-helvetica text-[14px] text-brand-orange"
        >
          Informações atualizadas.
        </p>
      ) : null}

      {/* `mt-auto` empurra o botão para o rodapé do painel, reproduzindo o y=798
          do design sem fixar a posição em pixels. */}
      <Button
        type="submit"
        variant="primary"
        disabled={isSubmitting}
        className="mt-auto w-full px-0 md:w-[315px]"
      >
        {isSubmitting ? "SALVANDO..." : "ATUALIZAR INFORMAÇÕES"}
      </Button>
    </form>
  );
}

function FormAlert({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="mt-[25px] rounded-2xl border border-red-9/40 bg-red-9/10 px-4 py-3 text-center font-helvetica text-[14px] text-red-9"
    >
      {message}
    </p>
  );
}

/** Zera só os campos de senha; o resto do formulário reflete o que foi salvo. */
function clearSecrets(form: HTMLFormElement) {
  for (const name of ["password", "currentPassword"]) {
    const field = form.elements.namedItem(name);
    if (field instanceof HTMLInputElement) field.value = "";
  }
}
