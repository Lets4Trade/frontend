import type { Metadata } from "next";
import Link from "next/link";
import { AdminFormCard } from "@/features/admin/AdminFormCard";
import { getAdminGames } from "@/features/admin/catalog";
import { getGameTabs } from "@/features/admin/games/tabs/list";
import {
  RETURN_PARAM,
  parseProductPrefill,
  resolvePrefillTab,
  safeReturnPath,
} from "@/features/admin/products/links";
import { ProductForm } from "@/features/admin/products/ProductForm";
import { requireAdminPage } from "@/features/admin/guard";

export const metadata: Metadata = {
  title: "Cadastro de produto | Lets4Trade",
  robots: { index: false, follow: false },
};

/**
 * Painel → Produtos → "CADASTRO DE PRODUTO" (Figma 3806:6735).
 *
 * A moldura é a mesma da tela de jogo (`AdminFormCard`); o cabeçalho, o rodapé
 * e a guarda de ADMIN vivem em `app/admin/layout.tsx`.
 *
 * Os jogos são lidos NO SERVIDOR e entregues prontos ao formulário. O
 * alternativa — buscar no cliente ao abrir o select — custaria um "carregando"
 * em cima de um dado que o servidor já tinha na mão ao renderizar a página.
 */
export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const [games, params] = await Promise.all([getAdminGames(), searchParams]);

  // Pré-preenchimento pela URL (admin-games-ux.md, Etapa 1): `?jogo&aba&servidor
  // &plataforma`, cada um conferido contra o que foi carregado — inválido cai.
  // Com jogo escolhido, as abas dele já vêm do servidor (o formulário as leria
  // por action logo em seguida; aqui economiza a ida e volta e o "carregando").
  const parsed = parseProductPrefill(params, games);
  const tabs = parsed.gameId ? await getGameTabs(parsed.gameId) : null;
  const prefill = resolvePrefillTab(parsed, tabs);
  // `?volta=` (Etapa 2): só caminho do painel — ver `safeReturnPath`.
  const returnTo = safeReturnPath(params[RETURN_PARAM]);

  return (
    <AdminFormCard title="CADASTRO DE PRODUTO" headingId="cadastro-produto-heading">
      {games.length === 0 ? (
        <NoGames />
      ) : (
        <ProductForm games={games} prefill={prefill} initialTabs={tabs} returnTo={returnTo} />
      )}
    </AdminFormCard>
  );
}

/**
 * Todo campo desta tela depende de um jogo existir: o produto pertence a um, e
 * plataforma, servidor e tipo saem do que ele declarou. Mostrar o formulário
 * inteiro desabilitado seria um enigma; o caminho para resolver é um clique.
 *
 * Este estado também cobre a queda do backend — `getAdminGames()` devolve lista
 * vazia em qualquer imprevisto. O texto funciona nos dois casos porque não
 * afirma que o catálogo está vazio, só que não recebemos nenhum jogo.
 */
function NoGames() {
  return (
    <div className="px-[50px] pt-[33px] pb-[50px]">
      <p className="font-helvetica text-[18px] leading-[27px] text-brand-fg-muted">
        Nenhum jogo disponível para receber produtos.
      </p>
      <Link
        href="/admin/jogos/novo"
        className="mt-4 inline-block font-poppins text-[16px] font-bold tracking-[0.16px] text-brand-orange transition-opacity hover:opacity-80"
      >
        Cadastrar um jogo primeiro →
      </Link>
    </div>
  );
}
