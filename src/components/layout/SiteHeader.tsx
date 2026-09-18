import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/Button";
import { getSessionUser, type SessionUser } from "@/features/auth/session";
import { CartButton } from "@/features/cart/CartButton";
import { getMenuGames } from "@/features/game/menuGames";
import { getLoyaltyTiers } from "@/features/loyalty/publicTiers";
import { getLayoutContent } from "@/features/site/layoutContent";
import { cn } from "@/lib/cn";
import { GamesMenu } from "./GamesMenu";
import { GlowBar } from "./GlowBar";
import { HeaderSearch } from "./HeaderSearch";
import { MobileMenu } from "./MobileMenu";
import { UserMenu } from "./UserMenu";

/**
 * Header do tema dark (Figma 1946:1060) — 83px, preto 50% com backdrop-blur 9px
 * e a faixa de brilho laranja no topo.
 *
 * Medidas do design (header de 1904px dentro do frame de 1920px):
 *   logo   x=50   138×65      GAMES  x=212  159×50
 *   busca  x=396  219×50      CRIAR  x=1376 197×50
 *   ACESSAR x=1598 197×50     carrinho x=1820 50×50
 * Os vãos são de 25px. As larguras eram FIXAS pelo motivo acima: derivadas de
 * padding, elas passariam a depender do texto e qualquer mudança de cópia
 * deslocaria a barra. Desde que os rótulos viraram conteúdo de banco
 * (2026-09-14) elas são MÍNIMAS: o padrão desenha os mesmos 159 e 197px, porque
 * o texto é menor que a caixa, mas um rótulo maior cresce em vez de ser cortado
 * no meio da palavra. O selo do centro não se move — está ancorado ao header,
 * não ao espaço que sobra.
 *
 * ── O que é editável, e onde ──────────────────────────────────────────────
 * Logo, rótulos dos três botões, texto de exemplo da busca e o selo saem da
 * página "Cabeçalho e rodapé" em `/admin/sessoes`. A leitura é cacheada com
 * invalidação por etiqueta (`features/site/layoutContent.ts`): o cabeçalho
 * renderiza em TODA requisição do site e não pode custar uma ida ao backend por
 * página.
 *
 * `max-w-[1920px]` + `px-[50px]` reproduz a margem de 50px dos dois lados: o
 * header do arquivo tem 1904px (16px a menos, sobra de barra de rolagem), mas
 * a distância até a borda do frame é 50px tanto à esquerda quanto à direita.
 *
 * Responsivo: o design é fixo em 1920px. Abaixo de `xl` o selo sai, abaixo de
 * `lg` a busca sai, e abaixo de `sm` sobram logo + ações.
 */
/**
 * O lado direito alterna entre os dois estados do design: deslogado (CRIAR
 * CONTA + ACESSAR CONTA, nó 1946:1060) e logado (avatar + seta, nó 2073:1778).
 * O carrinho aparece nos dois.
 *
 * A sessão é LIDA AQUI, não recebida por prop. Antes cada página decidia o que
 * passar, e o resultado era o cabeçalho sempre deslogado na loja e sempre
 * logado (com perfil fixo) no painel — não importava quem estivesse acessando.
 * Como é server component, ele consulta a sessão direto; `getSessionUser` é
 * memorizado por requisição, então montar o header em várias páginas não
 * multiplica chamadas ao backend.
 *
 * `user` continua aceito para sobrepor a sessão em telas de exemplo. Deixe
 * vazio em qualquer tela real.
 */
export async function SiteHeader({ user }: { user?: SessionUser } = {}) {
  /**
   * Sessão e níveis em PARALELO.
   *
   * A tabela de níveis é pública e cacheada por uma hora — na prática esta
   * chamada quase nunca sai da máquina. Em série, o cabeçalho de TODA página
   * pagaria a soma das duas latências na primeira renderização de cada hora.
   */
  const [sessao, { tiers }, layout, games] = await Promise.all([
    user ? Promise.resolve(user) : getSessionUser(),
    getLoyaltyTiers(),
    getLayoutContent(),
    // Jogos do menu GAMES — cacheada como o layout, ver `menuGames.ts`.
    getMenuGames(),
  ]);

  // Os rótulos e a marca vêm do painel ("Cabeçalho e rodapé" em
  // `/admin/sessoes`). A leitura é cacheada com invalidação por etiqueta — ver
  // `features/site/layoutContent.ts`.
  const brand = layout.text("marca");
  const badge = layout.text("header-selo");
  const search = layout.text("header-busca");
  const actions = layout.text("header-acoes");
  return (
    <header className="relative z-20 h-[83px] w-full bg-black/50 backdrop-blur-[9px]">
      <GlowBar className="-top-[2px]" />

      <div className="relative mx-auto flex h-full max-w-[1920px] items-center gap-[12px] px-[25px] md:gap-[25px] md:px-6 lg:px-[50px]">
        <Link href="/" aria-label="Lets4Trade — página inicial" className="shrink-0">
          <Image
            src={brand.imageUrl ?? "/images/lets4trade-logo.png"}
            alt="Lets4Trade"
            width={138}
            height={65}
            priority
            // O PNG é 1000×1000 com margens transparentes; `object-cover` na
            // caixa 138×65 recorta exatamente essas margens (igual ao Figma).
            // Mobile (Figma 2667:1864): logo menor, para caber selo, carrinho e
            // menu na mesma linha de ~400px.
            className="h-[41px] w-[88px] object-cover md:h-[65px] md:w-[138px]"
          />
        </Link>

        {/* As larguras dos botões deixaram de ser FIXAS e viraram MÍNIMAS
            quando os rótulos passaram a ser editáveis pelo painel. Com
            `w-[159px]` + `px-0`, um rótulo maior que a caixa era simplesmente
            cortado no meio da palavra. Com `min-w` + recuo, o padrão continua
            desenhando exatamente os 159px do arquivo (o texto é menor que a
            caixa) e um rótulo longo cresce em vez de sumir.

            Crescer é seguro aqui: o selo do centro é posicionado em relação ao
            header inteiro, não ao espaço que sobra, então ele não se move. */}
        {/* GAMES abre a lista de todos os jogos ativos. É o único pedaço
            client desta metade do header — ver `GamesMenu`. */}
        <GamesMenu label={actions.title} games={games} />

        {/* Busca com sugestões de jogos e produtos — client, ver `HeaderSearch`. */}
        <HeaderSearch placeholder={search.title} />

        {/* Selo "+1000 REFERÊNCIAS" — o número usa o degradê laranja recortado
            no texto (bg-clip-text), como no design.

            Centralização: fica FORA do fluxo flex (`absolute` + `left-1/2` +
            `-translate-x-1/2`). No fluxo, `mx-auto` só o centraria no espaço
            que sobra entre os vizinhos — bastaria o texto de um botão mudar
            para o selo sair do lugar. Ancorado assim, ele cai no centro exato
            do header e não se move, seja qual for a largura dos lados. */}
        {/* No celular o selo volta (o desenho mobile o tem no centro, menor); só
            some na faixa md–xl, onde os botões do desktop ocupam o meio. */}
        <div className="pointer-events-none absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center leading-none md:hidden xl:flex">
          <div className="flex items-center gap-2">
            <span className="bg-gradient-to-b from-brand-orange to-brand-orange-deep bg-clip-text font-korataki text-[15px] font-bold tracking-[0.2px] text-transparent md:text-[20px]">
              {badge.title}
            </span>
            <Image src="/icons/youtube-color.svg" alt="" width={19} height={19} aria-hidden />
          </div>
          <span className="mt-1 font-korataki text-[10px] tracking-[0.13px] text-white md:text-[13px]">
            {badge.subtitle}
          </span>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-[10px] md:gap-[25px]">
          {sessao ? null : (
            <>
              {/* `Link` com as classes do botão, e não `Button`: eles PRECISAM
                  navegar. Como <button> sem handler, não faziam nada — era o
                  motivo de o cabeçalho parecer "morto" para login e cadastro. */}
              <Link
                href="/criar-conta"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "hidden min-w-[197px] px-[20px] lg:inline-flex",
                )}
              >
                {actions.subtitle}
              </Link>
              <Link
                href="/login"
                className={cn(
                  buttonVariants({ variant: "cta" }),
                  // No celular o login vai para dentro do menu (`MobileMenu`).
                  "hidden min-w-[197px] px-[20px] md:inline-flex",
                )}
              >
                {actions.footnote}
              </Link>
            </>
          )}

          {/* O botão e a gaveta do carrinho vivem juntos em `CartButton`, que é
              client component — o cabeçalho continua no servidor. */}
          <CartButton tiers={tiers} />

          {/* Estado logado: avatar + seta, que abre o menu da conta. Os vãos
              do design são 25px (carrinho→avatar) e 15px (avatar→seta). */}
          {sessao ? (
            <div className="hidden md:block">
              <UserMenu user={sessao} />
            </div>
          ) : null}

          {/* Celular: busca, jogos, links e conta ficam dentro do menu. */}
          <MobileMenu
            games={games}
            loggedIn={Boolean(sessao)}
            searchPlaceholder={search.title}
            signupLabel={actions.subtitle}
            loginLabel={actions.footnote}
          />
        </div>
      </div>
    </header>
  );
}
