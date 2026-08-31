"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { login } from "./authService";
import { loginSchema } from "./schema";
import { AUTH_ERROR_MESSAGES, AuthError } from "./types";

/** Para onde mandar o usuário depois de autenticar. */
const REDIRECT_AFTER_LOGIN = "/";

type FieldErrors = Partial<Record<"email" | "password", string>>;

/**
 * Formulário de login.
 *
 * Estado local + `zod` em vez de react-hook-form: são dois campos, e o projeto
 * não tem o `react-hook-form` instalado (só o `@hookform/resolvers`, que é peer
 * dele). Trocar para RHF depois é direto — a validação já está isolada no
 * `loginSchema`, então só a ligação com o input muda.
 */
export function LoginForm() {
  const router = useRouter();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cancela a requisição em voo se o componente desmontar (usuário navegou
  // antes da resposta) — evita setState em componente morto e request órfã.
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => () => abortRef.current?.abort(), []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const formData = new FormData(event.currentTarget);
    const parsed = loginSchema.safeParse({
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    });

    if (!parsed.success) {
      const { fieldErrors: zodFieldErrors } = parsed.error.flatten();
      setFieldErrors({
        email: zodFieldErrors.email?.[0],
        password: zodFieldErrors.password?.[0],
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
      await login(parsed.data, controller.signal);
      // A sessão vive no cookie httpOnly devolvido pelo servidor. `refresh()`
      // força os server components a rebuscarem os dados já autenticados.
      router.replace(REDIRECT_AFTER_LOGIN);
      router.refresh();
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      // Nunca logamos `parsed.data`: o objeto carrega a senha em texto puro.
      setFormError(
        cause instanceof AuthError
          ? AUTH_ERROR_MESSAGES[cause.code]
          : AUTH_ERROR_MESSAGES.unknown,
      );
      setIsSubmitting(false);
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex w-full flex-col">
      <h1
        id="login-heading"
        // Título em Helvetica Neue Bold no design — não Poppins.
        className="font-helvetica text-[30px] leading-[26px] font-bold tracking-[0.3px] text-white"
      >
        LOGIN
      </h1>

      <hr className="mt-[25px] border-0 border-t border-brand-hairline" />

      <div className="mt-[25px] flex flex-col gap-[25px]">
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
          name="password"
          label="Senha"
          type="password"
          autoComplete="current-password"
          placeholder="Digite Sua Senha"
          error={fieldErrors.password}
        />
      </div>

      <hr className="mt-[25px] border-0 border-t border-brand-hairline" />

      {/* Erro de formulário (credencial/rede). `role="alert"` faz o leitor de
          tela anunciar sem precisar mover o foco. */}
      {formError ? (
        <p
          role="alert"
          className="mt-[25px] rounded-2xl border border-red-9/40 bg-red-9/10 px-4 py-3 text-center font-helvetica text-[14px] text-red-9"
        >
          {formError}
        </p>
      ) : null}

      <div className="mt-[25px] flex flex-col gap-[25px]">
        <Button type="submit" variant="primary" fullWidth disabled={isSubmitting}>
          {isSubmitting ? "ENTRANDO..." : "ACESSAR"}
        </Button>

        <Button
          variant="outline"
          fullWidth
          onClick={() => router.push("/criar-conta")}
        >
          CRIAR CONTA
        </Button>
      </div>

      <hr className="mt-[25px] border-0 border-t border-brand-hairline" />

      <Link
        href="/esqueci-minha-senha"
        className="mt-[25px] self-center font-poppins text-[15px] leading-[19px] font-bold tracking-[0.15px] text-brand-fg-muted transition-colors hover:text-white"
      >
        ESQUECEU SUA SENHA?
      </Link>
    </form>
  );
}
