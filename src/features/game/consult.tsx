import Image from "next/image";
import { cn } from "@/lib/cn";

/**
 * "Consulte aqui" (2026-11-17): produto de aba CATÁLOGO sem preço. No lugar
 * do contador, carrinho e COMPRE AQUI, o card mostra um botão que abre o
 * WhatsApp da loja com a mensagem já escrita.
 *
 * ── O link ─────────────────────────────────────────────────────────────────
 * A base é o `href` que `getContacts()` MONTOU (`https://wa.me/<dígitos>`),
 * nunca o texto do campo — a mesma regra do resto do site. Aqui só entra o
 * `?text=`, com `encodeURIComponent`: nome de produto com `&` ou `#` não pode
 * cortar a mensagem nem virar outro parâmetro.
 *
 * O checkout recusa o produto no backend (`findForCheckout`), então o botão
 * não é a única barreira: um id enviado direto à API também não compra.
 */

/** "Salve, tenho interesse em X do jogo Y do servidor Z" — servidor só se houver. */
export function consultMessage({
  productName,
  gameName,
  serverLabel,
}: {
  productName: string;
  gameName: string;
  serverLabel?: string;
}): string {
  const server = serverLabel?.trim();
  return `Salve, tenho interesse em ${productName.trim()} do jogo ${gameName.trim()}${server ? ` do servidor ${server}` : ""}`;
}

/** Só aceita a base `https://wa.me/<dígitos>`; qualquer outra coisa = sem link. */
const WA_BASE = /^https:\/\/wa\.me\/\d{10,15}$/;

export function consultHref(whatsappHref: string | undefined, message: string): string | undefined {
  if (!whatsappHref || !WA_BASE.test(whatsappHref)) return undefined;
  return `${whatsappHref}?text=${encodeURIComponent(message)}`;
}

/** O texto no lugar do preço. */
export function ConsultPrice() {
  return <span className="font-helvetica text-[15px] font-bold text-white/70 desk:text-[17px]">Preço sob consulta</span>;
}

/**
 * O botão. Sem WhatsApp configurado na loja, aparece desabilitado (com o
 * motivo no `title`) em vez de sumir: o card não fica sem ação nenhuma e o
 * admin percebe o que falta.
 */
export function ConsultButton({
  href,
  productName,
  className,
}: {
  href?: string;
  productName: string;
  className?: string;
}) {
  const classes = cn(
    "flex h-[38px] w-full items-center justify-center gap-[8px] rounded-[10px] border border-[#25d366]/60 bg-[#25d366]/15 font-poppins text-[13px] font-bold text-white transition-colors desk:h-[50px] desk:text-[16px]",
    href
      ? "hover:bg-[#25d366]/30 focus-visible:ring-2 focus-visible:ring-[#25d366] focus-visible:outline-none"
      : "cursor-not-allowed opacity-50",
    className,
  );
  const content = (
    <>
      <Image
        src="/icons/social/whatsapp.svg"
        alt=""
        width={22}
        height={22}
        aria-hidden
        className="size-[18px] desk:size-[22px]"
      />
      CONSULTE AQUI
    </>
  );

  return href ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Consultar ${productName} pelo WhatsApp`}
      className={classes}
    >
      {content}
    </a>
  ) : (
    <span role="link" aria-disabled="true" title="WhatsApp da loja não configurado" className={classes}>
      {content}
    </span>
  );
}
