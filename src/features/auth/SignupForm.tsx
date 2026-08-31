"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { signup } from "./authService";
import { signupSchema } from "./schema";
import { SIGNUP_ERROR_MESSAGES, SignupError } from "./types";

/** Para onde mandar o usuário depois de cadastrar. */
const REDIRECT_AFTER_SIGNUP = "/";

type Field = "email" | "name" | "password" | "whatsapp";
type FieldErrors = Partial<Record<Field, string>>;

/**
 * Formulário de cadastro (Figma 1953:855).
 *
 * Mesmo desenho do login: estado local + `zod`, sem react-hook-form (que não
 * está instalado). Reusa `TextField` e `Button` — as superfícies do card de
 * cadastro são idênticas às do login nos assets exportados.
 */
export function SignupForm() {
  const router = useRouter();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => () => abortRef.current?.abort(), []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const formData = new FormData(event.currentTarget);
    const parsed = signupSchema.safeParse({
      email: String(formData.get("email") ?? ""),
      name: String(formData.get("name") ?? ""),
      password: String(formData.get("password") ?? ""),
      whatsapp: String(formData.get("whatsapp") ?? ""),
    });

    if (!parsed.success) {
      const { fieldErrors: zodFieldErrors } = parsed.error.flatten();
      setFieldErrors({
        email: zodFieldErrors.email?.[0],
        name: zodFieldErrors.name?.[0],
        password: zodFieldErrors.password?.[0],
        whatsapp: zodFieldErrors.whatsapp?.[0],
      });
      setFormError(null);
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setIsSubmitting(true);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await signup(parsed.data, controller.signal);
      router.replace(REDIRECT_AFTER_SIGNUP);
      router.refresh();
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      // Nunca logamos `parsed.data`: carrega a senha em texto puro.
      if (cause instanceof SignupError) {
        // Colisão de unicidade aponta para o campo, não para o topo do form —
        // o usuário precisa ver QUAL campo trocar.
        if (cause.code === "email_taken") {
          setFieldErrors({ email: SIGNUP_ERROR_MESSAGES.email_taken });
        } else if (cause.code === "name_taken") {
          setFieldErrors({ name: SIGNUP_ERROR_MESSAGES.name_taken });
        } else {
          setFormError(SIGNUP_ERROR_MESSAGES[cause.code]);
        }
      } else {
        setFormError(SIGNUP_ERROR_MESSAGES.unknown);
      }
      setIsSubmitting(false);
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex w-full flex-col">
      <h1
        id="signup-heading"
        className="font-helvetica text-[30px] leading-[26px] font-bold tracking-[0.3px] text-white"
      >
        CRIAR CONTA
      </h1>

      <hr className="mt-[25px] border-0 border-t border-brand-hairline" />

      {/* Duas colunas de 315px com 50px de vão, como no design. Abaixo de `md`
          empilha — o card tem 780px e não cabe em tela pequena. */}
      <div className="mt-[25px] grid grid-cols-1 gap-x-[50px] gap-y-[25px] md:grid-cols-2">
        <TextField
          name="email"
          label="E-mail"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="Digite Seu E-mail"
          error={fieldErrors.email}
        />

        <TextField
          name="name"
          label="Nome"
          type="text"
          autoComplete="username"
          placeholder="Nome de usuário"
          error={fieldErrors.name}
        />

        <TextField
          name="password"
          label="Senha"
          type="password"
          autoComplete="new-password"
          placeholder="Digite Sua Senha"
          error={fieldErrors.password}
        />

        <TextField
          name="whatsapp"
          label="Número De Whatsapp"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+55"
          error={fieldErrors.whatsapp}
        />
      </div>

      <hr className="mt-[25px] border-0 border-t border-brand-hairline" />

      {formError ? (
        <p
          role="alert"
          className="mt-[25px] rounded-2xl border border-red-9/40 bg-red-9/10 px-4 py-3 text-center font-helvetica text-[14px] text-red-9"
        >
          {formError}
        </p>
      ) : null}

      {/* O botão tem 315px e fica alinhado à ESQUERDA no design — não é largura
          total nem centralizado. */}
      <Button
        type="submit"
        variant="primary"
        disabled={isSubmitting}
        className="mt-[25px] w-full md:w-[315px]"
      >
        {isSubmitting ? "CRIANDO..." : "CRIAR CONTA"}
      </Button>

      {/* O backend registra `acceptedTerms` e `acceptedPrivacyPolicy` como true
          no cadastro com base NESTE texto — não há checkbox no design. Se este
          aviso sair da tela, o aceite deixa de ter respaldo: ou volta o
          checkbox, ou o backend para de registrar o consentimento.
          Ver .claude/context/open-questions.md. */}
      <p className="mt-[25px] text-center font-helvetica text-[13px] leading-[18px] text-brand-fg-subtle">
        Ao criar sua conta, você aceita os{" "}
        <Link href="/termos" className="text-brand-fg-muted underline hover:text-white">
          Termos de Uso
        </Link>{" "}
        e a{" "}
        <Link
          href="/politica-de-privacidade"
          className="text-brand-fg-muted underline hover:text-white"
        >
          Política de Privacidade
        </Link>
        .
      </p>
    </form>
  );
}
