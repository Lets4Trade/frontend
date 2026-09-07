import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminFormCard } from "@/features/admin/AdminFormCard";
import { getAdminGames } from "@/features/admin/catalog";
import { ProductForm } from "@/features/admin/products/ProductForm";
import { getAdminProduct } from "@/features/admin/products/list";

export const metadata: Metadata = {
  title: "Editar produto | Lets4Trade",
  robots: { index: false, follow: false },
};

/**
 * Painel → Produtos → lápis do card.
 *
 * ⚠️ ESTA TELA NÃO ESTÁ NO FIGMA. O arquivo desenha o lápis (3805:6639) e não
 * desenha o destino dele. A leitura adotada é a mais previsível: o mesmo
 * formulário do cadastro, preenchido. Deixar o lápis sem ação seria um botão
 * morto, que é o que o painel evita nas abas que ainda não existem.
 *
 * O que muda em relação ao cadastro está no `ProductForm`: o jogo fica travado
 * (o backend não aceita trocá-lo), o botão diz "SALVAR ALTERAÇÕES" e o sucesso
 * volta para a listagem em vez de limpar o formulário.
 */
export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [product, games] = await Promise.all([
    getAdminProduct(id),
    getAdminGames(),
  ]);

  // Produto inexistente, já desativado, ou leitura que falhou: 404. Renderizar
  // o formulário vazio faria a edição parecer um cadastro novo.
  if (product === null) notFound();

  return (
    <AdminFormCard title="EDITAR PRODUTO" headingId="editar-produto-heading">
      <ProductForm games={games} product={product} />
    </AdminFormCard>
  );
}
