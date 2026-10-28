"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/SelectField";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { TextField } from "@/components/ui/TextField";
import {
  SELL_TEXT_MAX,
  createSellSchema,
  sellGameOptions,
  type SellFormValues,
  type SellGame,
} from "./schema";
import { SELL_ERROR_MESSAGES, SellError, submitSellRequest } from "./sellService";

type FieldErrors = Partial<Record<keyof SellFormValues, string>>;

/**
 * Formulário "Venda pra nós" (Figma 2030:995).
 *
 * Duas colunas de 315px com 50px de vão — o mesmo grid do cadastro. A área de
 * descrição ocupa só a coluna da esquerda na quarta linha, como no design.
 *
 * `games`: os jogos da loja, com o logo (vêm do servidor, `SellPageBody`).
 * `game`: o formulário DENTRO da página de um jogo (aba SELL) nasce com esse
 * jogo escolhido. Mesmo envio, mesma validação e o mesmo anti-spam de `/venda`.
 */
export function SellForm({ games, game }: { games: readonly SellGame[]; game?: { slug: string; name: string } }) {
  const gameSlug = game?.slug;
  const gameName = game?.name;
  const gameOptions = useMemo(
    () => sellGameOptions(games, gameSlug && gameName ? { slug: gameSlug, name: gameName } : undefined),
    [games, gameSlug, gameName],
  );
  const schema = useMemo(() => createSellSchema(gameOptions.options), [gameOptions]);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => () => abortRef.current?.abort(), []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const data = new FormData(event.currentTarget);
    const read = (name: string) => String(data.get(name) ?? "");
    const parsed = schema.safeParse({
      jogo: read("jogo"),
      plataforma: read("plataforma"),
      servidor: read("servidor"),
      tipoProduto: read("tipoProduto"),
      discord: read("discord"),
      whatsapp: read("whatsapp"),
      descricao: read("descricao"),
    });

    if (!parsed.success) {
      const { fieldErrors: zodErrors } = parsed.error.flatten();
      const next: FieldErrors = {};
      for (const [key, messages] of Object.entries(zodErrors)) {
        const first = messages?.[0];
        if (first) next[key as keyof SellFormValues] = first;
      }
      setFieldErrors(next);
      setFormError(null);
      setSent(false);
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setSent(false);
    setIsSubmitting(true);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await submitSellRequest(parsed.data, controller.signal);
      setSent(true);
      setIsSubmitting(false);
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setFormError(
        cause instanceof SellError
          ? SELL_ERROR_MESSAGES[cause.code]
          : SELL_ERROR_MESSAGES.unknown,
      );
      setIsSubmitting(false);
    }
  }

  // Enviada (2026-10-23): a confirmação TOMA o lugar do formulário. Antes a
  // mensagem aparecia embaixo, perto do botão — fora da tela — com tudo ainda
  // preenchido, e a pessoa achava que não tinha ido e mandava de novo.
  if (sent) {
    return (
      <div role="status" className="flex w-full flex-col items-center gap-[14px] py-[30px] text-center">
        <span aria-hidden className="flex size-[56px] items-center justify-center rounded-full bg-[#22c55e]/15 text-[28px] text-[#4ade80]">
          ✓
        </span>
        <p className="font-poppins text-[22px] font-bold text-white">Proposta enviada!</p>
        <p className="max-w-[420px] font-helvetica text-[15px] leading-[22px] text-brand-fg-muted">
          Recebemos suas informações. A equipe vai falar com você pelo Discord ou pelo WhatsApp que você informou.
        </p>
        <Button variant="outline" className="mt-[10px] px-[30px]" onClick={() => setSent(false)}>
          ENVIAR OUTRA PROPOSTA
        </Button>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex w-full flex-col">
      <div className="grid grid-cols-1 gap-x-[50px] gap-y-[25px] md:grid-cols-2">
        <SelectField
          name="jogo"
          label="Jogo:"
          placeholder="Escolha o jogo"
          options={gameOptions.options}
          defaultValue={gameOptions.defaultValue}
          error={fieldErrors.jogo}
        />
        {/* Plataforma, servidor e tipo: TEXTO LIVRE (2026-10-28, pedido do
            usuário) — eram selects com poucas opções e "Outros". */}
        <TextField
          name="plataforma"
          label="Plataforma:"
          type="text"
          maxLength={SELL_TEXT_MAX}
          placeholder="Ex.: Steam, PS5, Battle.net"
          error={fieldErrors.plataforma}
        />

        <TextField
          name="servidor"
          label="Servidor:"
          type="text"
          maxLength={SELL_TEXT_MAX}
          placeholder="Ex.: América do Sul, Hardcore"
          error={fieldErrors.servidor}
        />
        <TextField
          name="tipoProduto"
          label="Tipo de Produto:"
          type="text"
          maxLength={SELL_TEXT_MAX}
          placeholder="Ex.: Gold, conta, item"
          error={fieldErrors.tipoProduto}
        />

        {/* Discord OU WhatsApp (2026-10-28): um dos dois basta. O aviso fica numa
            linha própria — no placeholder ele não cabia na coluna de 315px. */}
        <p className="-mb-[10px] font-helvetica text-[14px] leading-[18px] text-brand-fg-muted md:col-span-2">
          Contato: informe o <strong className="text-white">Discord</strong> ou o{" "}
          <strong className="text-white">WhatsApp</strong> — um dos dois basta.
        </p>
        <TextField
          name="discord"
          label="Discord:"
          type="text"
          maxLength={64}
          placeholder="Discord ID"
          error={fieldErrors.discord}
        />
        <TextField
          name="whatsapp"
          label="Número De Whatsapp:"
          type="tel"
          mask="phone"
          autoComplete="tel"
          placeholder="(11) 91234-5678"
          error={fieldErrors.whatsapp}
        />

        <TextAreaField
          name="descricao"
          label="Descrição Sobre o Produto Vendido:"
          placeholder="Descrição (se escolheu “Outros”, diga qual)"
          error={fieldErrors.descricao}
        />
      </div>

      {/* 50px depois da textarea (e não 25 como entre as linhas) — medido no
          design: textarea termina em 553 e o divisor fica em 603. */}
      <hr className="mt-[50px] border-0 border-t border-white/20" />

      {formError ? (
        <p
          role="alert"
          className="mt-[25px] rounded-2xl border border-red-9/40 bg-red-9/10 px-4 py-3 text-center font-helvetica text-[14px] text-red-9"
        >
          {formError}
        </p>
      ) : null}

      <Button
        type="submit"
        variant="primary"
        disabled={isSubmitting}
        className="mt-[25px] w-full md:w-[315px]"
      >
        {isSubmitting ? "ENVIANDO..." : "ENVIAR INFORMAÇÕES"}
      </Button>
    </form>
  );
}
