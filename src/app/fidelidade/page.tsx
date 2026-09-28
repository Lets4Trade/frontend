import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { LOYALTY_ORDER, loyaltyNodes } from "@/features/loyalty/loyaltyNodes";
import { composeBlocks } from "@/features/pages/compose";
import { BlockColumn, WideFrame } from "@/features/pages/frames";
import { getPublishedPage } from "@/features/pages/public";
import { getLoyalty } from "@/features/loyalty/data";
import { getSectionsFor } from "@/features/site/content";

export const metadata: Metadata = {
  title: "Fidelidade | Lets4Trade",
  description:
    "Acompanhe seu nível, cashback e saldo de Lets Coins no programa de fidelidade.",
  robots: { index: false, follow: false },
};

/**
 * Tela de Fidelidade — Figma nó 2176:2241.
 *
 * Diferente das outras do painel: NÃO tem o card de perfil na lateral. É um
 * layout de largura cheia — painel-resumo de 1612×549 no topo, o título "Todos
 * os Níveis" e a faixa com os cinco cards de 302×450 (vão de 25px).
 *
 * Vãos verticais do design: resumo termina em 700, título em 750 (50), cards
 * em 801 (25 após o título).
 *
 * ── O que mudou em 2026-09-10 ──────────────────────────────────────────────
 * Era a última tela do projeto presa em mock: desenhava `MOCK_LOYALTY`, uma
 * constante com os números do arquivo do Figma (1750 coins, 88% de progresso),
 * e a rota abria para qualquer visitante. Agora lê `GET /me/loyalty` e EXIGE
 * sessão — saldo é dado de conta, e uma tela de saldo sem dono não tem o que
 * mostrar.
 *
 * A guarda é `redirect` para o login com retorno, e não 404: diferente do
 * painel admin, aqui não há nada a esconder de quem não está logado — a pessoa
 * só precisa entrar. É o mesmo tratamento de `/conta/pedidos`.
 */
export default async function FidelidadePage() {
  const [section, loyalty, page] = await Promise.all([
    getSectionsFor("fidelidade"),
    getLoyalty(),
    getPublishedPage("fidelidade"),
  ]);

  if (!loyalty.ok) {
    if (loyalty.reason === "unauthenticated") {
      redirect("/login?redirect=/fidelidade");
    }
    // Backend fora do ar: a tela inteira depende dele. Mostrar o esqueleto com
    // zeros seria informar um saldo que ninguém leu.
    throw new Error("Não foi possível carregar o programa de fidelidade");
  }

  const { summary, entries } = loyalty;
  const nodes = loyaltyNodes(summary, entries, section);

  // Construtor de páginas (2026-09-25): publicada, a lista de blocos manda —
  // ordem das três seções do desenho e blocos novos entre elas. Sem
  // publicação, as três na ordem do arquivo.
  const items = page
    ? composeBlocks(page.blocks, page.refs, nodes)
    : LOYALTY_ORDER.map((key) => ({ key, gap: nodes[key]!.gap, node: nodes[key]!.node }));

  return (
    <div className="flex min-h-dvh flex-col bg-brand-bg">
      <SiteHeader />

      {/* Largura do Figma vira TETO, não medida (regra do projeto): era
          `w-max` com o conteúdo de 1612px fixos, e a página rolava na
          horizontal em qualquer tela menor que 1920 (2026-09-25). */}
      <main className="flex-1">
        <WideFrame>
          <BlockColumn items={items} />
        </WideFrame>
      </main>

      <SiteFooter />
    </div>
  );
}
