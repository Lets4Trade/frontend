import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminFormCard } from "@/features/admin/AdminFormCard";
import { BlogPostForm } from "@/features/admin/blog/BlogPostForm";
import { getAdminBlogPost } from "@/features/admin/blog/list";
import { getAdminGames } from "@/features/admin/catalog";

export const metadata: Metadata = {
  title: "Editar notícia | Lets4Trade",
  robots: { index: false, follow: false },
};

/** Painel → Notícias → lápis. Post inexistente ou leitura que falhou: 404. */
export default async function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [post, games] = await Promise.all([getAdminBlogPost(id), getAdminGames()]);
  if (post === null) notFound();

  return (
    <AdminFormCard title="EDITAR NOTÍCIA" headingId="editar-noticia-heading">
      {/* `key` pelo id: trocar de notícia remonta o formulário com o estado novo. */}
      <BlogPostForm key={post.id} post={post} games={games.map((game) => ({ value: game.id, label: game.name }))} />
    </AdminFormCard>
  );
}
