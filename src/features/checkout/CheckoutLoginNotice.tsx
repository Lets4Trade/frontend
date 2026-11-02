import { safeRedirectPath } from "@/lib/safeRedirect";
import { isCheckoutRedirect } from "./loginHref";

/**
 * Aviso no login/cadastro de quem veio do carrinho (2026-11-02): diz que o
 * carrinho não se perdeu e que a pessoa volta para o checkout. Só aparece com
 * `?redirect=/checkout` — em qualquer outra entrada a tela fica como sempre.
 */
export function CheckoutLoginNotice({ redirect }: { redirect: string | null }) {
  if (!isCheckoutRedirect(safeRedirectPath(redirect, ""))) return null;

  return (
    <p
      role="status"
      className="mb-[20px] rounded-[16px] border border-brand-orange/40 bg-brand-orange/10 px-[16px] py-[12px] text-center font-helvetica text-[14px] leading-[20px] text-white"
    >
      <strong className="font-bold">Seu carrinho está salvo.</strong> Entre ou crie sua conta e você volta
      direto para finalizar a compra.
    </p>
  );
}
