import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/features/auth/session";
import { CHECKOUT_LOGIN_HREF } from "@/features/checkout/loginHref";
import { CheckoutClient } from "@/features/checkout/CheckoutClient";
import { CheckoutShell } from "@/features/checkout/CheckoutShell";
import { getPublicGifts } from "@/features/gifts/publicGifts";
import { getLoyalty } from "@/features/loyalty/data";
import { installmentLimitFrom, minInstallmentFrom } from "@/features/payment/types";
import { getContacts } from "@/features/site/contacts";
import { getSavedCards } from "@/features/payment/data";
import { getReferencesVideoHref } from "@/features/site/content";
import { getLayoutContent } from "@/features/site/layoutContent";

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
 * A ROTA É GUARDADA (2026-11-02, pedido do usuário). Até então a sessão só era
 * exigida no clique de PAGAR: a pessoa digitava o cartão inteiro, ia para o
 * login, criava a conta e caía na HOME, sem o checkout e sem o que digitou.
 * Agora quem chega sem sessão vai para o login ANTES de ver o formulário, com
 * `?redirect=/checkout` — que sobrevive ao "CRIAR CONTA" e ao Google/Discord e
 * traz a pessoa de volta para cá. O carrinho fica no `localStorage` e não se
 * perde no caminho. Dados de cartão NUNCA são guardados (nem para "não perder")
 * — por isso a ordem certa é logar antes de digitá-los.
 *
 * Sessão ilegível (backend fora) também cai no login: fail secure, e a tela de
 * pagamento sem sessão não teria como criar o pedido de qualquer jeito.
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
  // Os brindes por jogo (2026-10-12) também: públicos e cacheados.
  // O vídeo de referências (2026-10-20) também: leitura pública das sessões.
  // O limite de parcelas (2026-10-28) também: sessão `layout:pagamento`, da
  // mesma leitura cacheada do layout.
  // Cartões salvos (2026-11-02): também em paralelo; sem sessão vem vazio.
  const [user, result, contacts, gifts, referencesHref, layout, savedCards] = await Promise.all([
    getSessionUser(),
    getLoyalty(),
    getContacts(),
    getPublicGifts(),
    getReferencesVideoHref(),
    getLayoutContent(),
    getSavedCards(),
  ]);

  if (!user) redirect(CHECKOUT_LOGIN_HREF);

  return (
    <CheckoutShell>
      <CheckoutClient
        loyalty={result.ok ? result.summary : null}
        gifts={gifts}
        // Só o LINK montado viaja para o cliente — ver `features/site/contacts.ts`.
        whatsappHref={contacts.whatsapp?.href}
        referencesHref={referencesHref}
        installmentLimit={installmentLimitFrom(layout.text("pagamento").extra("parcelas", ""))}
        minInstallmentCents={minInstallmentFrom(layout.text("pagamento").extra("parcela-minima", ""))}
        savedCards={savedCards}
      />
    </CheckoutShell>
  );
}
