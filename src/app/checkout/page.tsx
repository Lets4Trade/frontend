import type { Metadata } from "next";
import { getAccountProfile } from "@/features/account/profile";
import { CheckoutClient } from "@/features/checkout/CheckoutClient";
import { CheckoutShell } from "@/features/checkout/CheckoutShell";

export const metadata: Metadata = {
  title: "Checkout | Lets4Trade",
  description: "Finalize seu pedido na Lets4Trade.",
  // Página de compra, por sessão: nada a indexar.
  robots: { index: false, follow: false },
};

/**
 * Checkout (Figma nó 2568:1505 — "Checkout Cartão").
 *
 * CABEÇALHO REDUZIDO, e é o arquivo que pede: aqui ele tem 1077px (só a faixa
 * da esquerda) e só o logo — sem busca, sem menu, sem carrinho. É o padrão de
 * checkout, e existe para não oferecer saídas no meio do pagamento.
 *
 * A ROTA NÃO É GUARDADA. Quem não tem conta ainda consegue montar o pedido e
 * fechar pelo WhatsApp, que é o que o próprio texto do arquivo oferece ("É novo
 * por aqui? Se preferir pode fechar o pedido pelo nosso WhatsApp"). A exigência
 * de sessão só aparece no momento de criar o pedido, e aí manda para o login
 * com retorno.
 *
 * O perfil é lido no SERVIDOR quando existe sessão: é ele que torna reais o
 * saldo de Lets Coins e o card de cashback. Sem sessão, os dois caem no estado
 * de quem ainda não comprou — que é a verdade, não um marcador.
 */
export default async function CheckoutPage() {
  const result = await getAccountProfile();
  const profile = result.ok
    ? {
        letsCoins: result.profile.coins,
        totalSpent: Number(result.profile.totalSpent) || 0,
      }
    : null;

  return (
    <CheckoutShell>
      <CheckoutClient profile={profile} />
    </CheckoutShell>
  );
}
