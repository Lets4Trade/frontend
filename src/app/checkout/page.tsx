import type { Metadata } from "next";
import { CheckoutClient } from "@/features/checkout/CheckoutClient";
import { CheckoutShell } from "@/features/checkout/CheckoutShell";
import { getLoyalty } from "@/features/loyalty/data";
import { getContacts } from "@/features/site/contacts";

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
 * A FIDELIDADE é lida no SERVIDOR quando existe sessão: é ela que torna reais o
 * saldo de Lets Coins e o card de cashback. Sem sessão, os dois caem no estado
 * de quem ainda não comprou — que é a verdade, não um marcador.
 *
 * Vem de `GET /me/loyalty` e não mais de `/me`: o card precisa do nível, do
 * percentual, do progresso e do que falta para o próximo, e até 2026-09-10 a
 * tela CALCULAVA tudo isso a partir do total gasto contra uma tabela que só
 * existia no frontend. A tabela agora é do backend, e o cálculo também.
 */
export default async function CheckoutPage() {
  // Em paralelo: o contato é leitura pública e cacheada, e não pode somar
  // latência à tela de pagamento.
  const [result, contacts] = await Promise.all([getLoyalty(), getContacts()]);

  return (
    <CheckoutShell>
      <CheckoutClient
        loyalty={result.ok ? result.summary : null}
        // Só o LINK montado viaja para o cliente — ver `features/site/contacts.ts`.
        whatsappHref={contacts.whatsapp?.href}
      />
    </CheckoutShell>
  );
}
