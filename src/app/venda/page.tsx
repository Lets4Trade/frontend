import type { Metadata } from "next";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { composeBlocks } from "@/features/pages/compose";
import { BlockColumn, NarrowFrame } from "@/features/pages/frames";
import { usesHomeShared } from "@/features/pages/homeShared";
import { homeSharedNodes } from "@/features/pages/homeSharedNodes";
import { getPublishedPage } from "@/features/pages/public";
import { SellPageBody } from "@/features/sell/SellPageBody";

export const metadata: Metadata = {
  title: "Venda pra nós | Lets4Trade",
  description:
    "Venda suas gamecoins, contas e itens para a Lets4Trade. Envie seus dados e entramos em contato.",
};

/**
 * Tela "Venda pra nós" — Figma nó 2030:995.
 *
 * O nó é um frame de 1295×995 com o conteúdo já enquadrado; header e footer não
 * fazem parte dele, então reuso os do site para a página ficar consistente com
 * /login e /criar-conta. O fundo do frame (Rectangle 17) é um retângulo com
 * backdrop-blur sem fill visível — sobre o preto da página ele não muda nada,
 * por isso não virou asset. O "Efeito 15" também ficou de fora: no design ele
 * está inteiramente fora da área visível (x de -610 a -111) e é recortado pelo
 * `overflow-clip` do frame.
 *
 * Diferença de borda em relação aos cards de autenticação: aqui é branco a
 * **10%**, lá é 15%.
 */
export default async function VendaPage() {
  // Construtor de páginas (2026-09-25): publicada por blocos, a página é a lista
  // de blocos com o formulário como "seção do desenho"; sem publicação, é o
  // desenho de sempre.
  const page = await getPublishedPage("venda");
  const body = <SellPageBody />;
  // Seções da home usadas prontas: lidas só quando a página publicada usa alguma.
  const shared = page && usesHomeShared(page.blocks) ? await homeSharedNodes() : {};

  return (
    <div className="flex min-h-dvh flex-col bg-brand-bg">
      <SiteHeader />

      <main className="flex-1">
        <NarrowFrame>
          {page ? (
            <BlockColumn items={composeBlocks(page.blocks, page.refs, { formulario: { node: body, gap: 0 }, ...shared })} />
          ) : (
            body
          )}
        </NarrowFrame>
      </main>

      <SiteFooter />
    </div>
  );
}
