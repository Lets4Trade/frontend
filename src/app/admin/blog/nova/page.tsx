import type { Metadata } from "next";
import { AdminFormCard } from "@/features/admin/AdminFormCard";
import { BlogPostForm } from "@/features/admin/blog/BlogPostForm";
import { getAdminGames } from "@/features/admin/catalog";

export const metadata: Metadata = {
  title: "Novo post | Lets4Trade",
  robots: { index: false, follow: false },
};

/**
 * Painel → Notícias → nova (fora do Figma; contrato blog.md). ADMIN e EDITOR:
 * a guarda de painel está no layout (que já barra quem não é nenhum dos dois),
 * e as actions conferem o papel de novo — por isso sem `requireAdminPage`.
 */
export default async function NewBlogPostPage() {
  const games = await getAdminGames();
  return (
    <AdminFormCard title="NOVO POST" headingId="nova-noticia-heading">
      <BlogPostForm games={games.map((game) => ({ value: game.id, label: game.name }))} />
    </AdminFormCard>
  );
}
