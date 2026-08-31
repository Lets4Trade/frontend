"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import {
  ACCOUNT_ERROR_MESSAGES,
  AccountError,
  updateProfile,
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
 * O botão fica ancorado no rodapé do painel (y=798 num card de 898), e não logo
 * abaixo do último campo: por isso ele é posicionado pelo card, não pelo fluxo
 * do formulário.
 */
export function EditProfileForm({ defaults }: { defaults: ProfileDefaults }) {
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => () => abortRef.current?.abort(), []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const data = new FormData(event.currentTarget);
    const read = (name: string) => String(data.get(name) ?? "");
    const parsed = editProfileSchema.safeParse({
      name: read("name"),
      email: read("email"),
      discord: read("discord"),
      whatsapp: read("whatsapp"),
      password: read("password"),
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

    setFieldErrors({});
    setFormError(null);
    setSaved(false);
    setIsSubmitting(true);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await updateProfile(parsed.data, controller.signal);
      setSaved(true);
      // Limpa o campo de senha após salvar: deixar a nova senha em texto no
      // DOM depois do envio não traz nenhum benefício.
      event.currentTarget.reset?.();
      setIsSubmitting(false);
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      if (cause instanceof AccountError) {
        if (cause.code === "email_taken") {
          setFieldErrors({ email: ACCOUNT_ERROR_MESSAGES.email_taken });
        } else if (cause.code === "name_taken") {
          setFieldErrors({ name: ACCOUNT_ERROR_MESSAGES.name_taken });
        } else {
          setFormError(ACCOUNT_ERROR_MESSAGES[cause.code]);
        }
      } else {
        setFormError(ACCOUNT_ERROR_MESSAGES.unknown);
      }
      setIsSubmitting(false);
    }
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      className="flex h-full w-full flex-col"
    >
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
          inputMode="tel"
          autoComplete="tel"
          placeholder="+55"
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
        />
      </div>

      {formError ? (
        <p
          role="alert"
          className="mt-[25px] rounded-2xl border border-red-9/40 bg-red-9/10 px-4 py-3 text-center font-helvetica text-[14px] text-red-9"
        >
          {formError}
        </p>
      ) : null}

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
