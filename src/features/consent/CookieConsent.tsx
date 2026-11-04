"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import {
  ALL_OFF,
  ALL_ON,
  readConsent,
  saveConsent,
  subscribeOpenPreferences,
  type Consent,
  type ConsentChoices,
} from "./consent";
import { useConsent } from "./useConsent";

/**
 * Aviso de cookies (2026-11-03).
 *
 * ── Cartão no rodapé, não modal que trava a tela ───────────────────────────
 * A pessoa continua navegando enquanto não decide; nada opcional roda nesse
 * meio-tempo (sem escolha = recusado). Um modal que bloqueia a página
 * ("cookie wall") pressiona o aceite — é o que o guia de cookies da ANPD
 * desaconselha — e derruba quem chegou por um anúncio para comprar. O modal
 * existe, mas só para PERSONALIZAR, aberto por quem pediu.
 *
 * ── Recusar é tão fácil quanto aceitar ─────────────────────────────────────
 * "Só essenciais" e "Aceitar todos" lado a lado, mesmo tamanho, um clique cada.
 * Interruptores nascem DESLIGADOS no "Personalizar" na primeira vez.
 *
 * Fica fora do painel e da prévia do painel (equipe, outra base legal).
 */

const HIDDEN_PREFIXES = ["/admin", "/previa"];

/** `cn` (tailwind-merge) sobre o `buttonVariants`: a altura/fonte padrão (50px, 16px) sai. */
const BUTTON_SIZE = "h-[44px] px-3 text-[14px] whitespace-nowrap";

type Category = {
  key: keyof ConsentChoices | "essential";
  title: string;
  text: string;
};

const CATEGORIES: Category[] = [
  {
    key: "essential",
    title: "Essenciais",
    text: "Login, carrinho, pagamento e proteção contra robôs (Cloudflare). Sem eles a loja não funciona, por isso ficam sempre ligados.",
  },
  {
    key: "measurement",
    title: "Medição",
    text: "Estatísticas de visita (páginas abertas, de onde você veio), nossas e do Google Analytics, para entendermos o que funciona na loja.",
  },
  {
    key: "marketing",
    title: "Publicidade",
    text: "Google Ads e outras plataformas de anúncio: medem se um anúncio trouxe você até aqui e mostram ofertas da Lets4Trade em outros sites. Esses parceiros gravam os próprios cookies.",
  },
  {
    key: "media",
    title: "Vídeos do YouTube",
    text: "Deixa os vídeos do YouTube tocarem sozinhos (sem som) quando aparecem na tela. O YouTube pode gravar os próprios cookies. Desligado, o vídeo só carrega se você clicar no play.",
  },
];

export function CookieConsent() {
  const pathname = usePathname() ?? "/";
  const consent = useConsent();
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [draft, setDraft] = useState<ConsentChoices>(ALL_OFF);

  // Link "Preferências de cookies" do rodapé.
  useEffect(
    () =>
      subscribeOpenPreferences(() => {
        // `readConsent` e não o `consent` do render: este ouvinte nasce uma vez só.
        setDraft(toChoices(readConsent()));
        setPrefsOpen(true);
      }),
    [],
  );

  function choose(choices: ConsentChoices) {
    saveConsent(choices);
    setPrefsOpen(false);
  }

  function openPrefs() {
    setDraft(toChoices(consent));
    setPrefsOpen(true);
  }

  const hidden = HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  // `undefined` = ainda hidratando: nada aparece (evita piscar para quem já escolheu).
  const showBar = !hidden && consent === null && !prefsOpen;

  return (
    <>
      {showBar ? (
        <section
          role="region"
          aria-label="Aviso de cookies"
          className="fixed inset-x-[12px] bottom-[max(12px,env(safe-area-inset-bottom))] z-50 mx-auto max-w-[760px] rounded-[22px] border border-brand-border bg-brand-surface/95 p-[18px] shadow-[0_24px_60px_rgba(0,0,0,.6)] backdrop-blur-[12px] sm:bottom-[24px] sm:p-[22px] md:flex md:items-center md:gap-[24px]"
        >
          <div className="min-w-0 flex-1">
            <h2 className="font-poppins text-[15px] font-bold text-white sm:text-[16px]">
              Este site usa cookies
            </h2>
            <p className="mt-[6px] font-helvetica text-[13px] leading-[19px] text-brand-fg-muted sm:text-[14px] sm:leading-[20px]">
              Usamos cookies essenciais para a loja funcionar. Com a sua permissão, também usamos
              cookies de estatística (Google Analytics), de publicidade (Google Ads) e de vídeos do
              YouTube.{" "}
              <Link
                href="/politica-de-privacidade"
                className="text-white underline underline-offset-[3px] hover:text-brand-orange"
              >
                Política de privacidade
              </Link>
            </p>
            <button
              type="button"
              onClick={openPrefs}
              className="mt-[8px] font-poppins text-[13px] font-medium text-white/70 underline underline-offset-[3px] hover:text-white"
            >
              Personalizar
            </button>
          </div>
          <div className="mt-[14px] grid grid-cols-2 gap-[10px] md:mt-0 md:w-[320px] md:shrink-0">
            <button
              type="button"
              onClick={() => choose(ALL_OFF)}
              className={cn(buttonVariants({ variant: "outline" }), BUTTON_SIZE)}
            >
              Só essenciais
            </button>
            <button
              type="button"
              onClick={() => choose(ALL_ON)}
              className={cn(buttonVariants({ variant: "cta" }), BUTTON_SIZE)}
            >
              Aceitar todos
            </button>
          </div>
        </section>
      ) : null}

      <Dialog.Root open={prefsOpen} onOpenChange={setPrefsOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-[2px]" />
          <Dialog.Content className="fixed top-1/2 left-1/2 z-[60] flex max-h-[calc(100dvh-32px)] w-[520px] max-w-[calc(100vw-24px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[26px] border border-brand-border bg-brand-surface shadow-[0_24px_60px_rgba(0,0,0,.6)] outline-none">
            <div className="overflow-y-auto px-[22px] pt-[24px] pb-[8px] sm:px-[28px]">
              <Dialog.Title className="pr-[36px] font-poppins text-[20px] leading-[26px] font-bold text-white">
                Preferências de cookies
              </Dialog.Title>
              <Dialog.Description className="mt-[6px] font-helvetica text-[14px] leading-[20px] text-brand-fg-muted">
                Escolha o que podemos usar. Você pode mudar quando quiser em &quot;Preferências de
                cookies&quot;, no rodapé do site.
              </Dialog.Description>

              <ul className="mt-[18px] flex flex-col gap-[10px]">
                {CATEGORIES.map((category) => {
                  const locked = category.key === "essential";
                  const checked = locked || draft[category.key as keyof ConsentChoices];
                  const id = `consent-${category.key}`;
                  return (
                    <li
                      key={category.key}
                      className="flex items-start gap-[14px] rounded-[16px] border border-brand-border bg-black/25 p-[14px]"
                    >
                      <div className="min-w-0 flex-1">
                        <label htmlFor={id} className="font-poppins text-[15px] font-bold text-white">
                          {category.title}
                        </label>
                        <p className="mt-[4px] font-helvetica text-[13px] leading-[19px] text-brand-fg-muted">
                          {category.text}
                        </p>
                      </div>
                      <Switch
                        id={id}
                        checked={checked}
                        disabled={locked}
                        label={locked ? `${category.title}: sempre ligados` : category.title}
                        onChange={(value) =>
                          setDraft((current) => ({ ...current, [category.key]: value }))
                        }
                      />
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="grid grid-cols-1 gap-[10px] border-t border-brand-border px-[22px] py-[16px] sm:grid-cols-3 sm:px-[28px]">
              <button
                type="button"
                onClick={() => choose(ALL_OFF)}
                className={cn(buttonVariants({ variant: "outline" }), BUTTON_SIZE)}
              >
                Só essenciais
              </button>
              <button
                type="button"
                onClick={() => choose(draft)}
                className={cn(buttonVariants({ variant: "outline" }), BUTTON_SIZE)}
              >
                Salvar escolhas
              </button>
              <button
                type="button"
                onClick={() => choose(ALL_ON)}
                className={cn(buttonVariants({ variant: "cta" }), BUTTON_SIZE)}
              >
                Aceitar todos
              </button>
            </div>

            <Dialog.Close
              aria-label="Fechar"
              className="absolute top-[14px] right-[14px] flex size-[34px] items-center justify-center rounded-full bg-black/50 font-poppins text-[20px] leading-none text-white/80 hover:bg-black/70 hover:text-white"
            >
              ×
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

function toChoices(consent: Consent | null | undefined): ConsentChoices {
  return consent
    ? { measurement: consent.measurement, media: consent.media, marketing: consent.marketing }
    : ALL_OFF;
}

function Switch({
  id,
  checked,
  disabled,
  label,
  onChange,
}: {
  id: string;
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative mt-[2px] h-[26px] w-[46px] shrink-0 rounded-full border transition-colors focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60",
        checked ? "border-brand-orange bg-brand-orange" : "border-white/20 bg-white/10",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute top-[2px] left-[2px] size-[20px] rounded-full bg-white shadow transition-transform",
          checked && "translate-x-[20px]",
        )}
      />
    </button>
  );
}
