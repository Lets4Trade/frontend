import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/Button";
import { CountUp } from "@/components/ui/CountUp";
import { getSessionUser, type SessionUser } from "@/features/auth/session";
import { CartButton } from "@/features/cart/CartButton";
import { getMenuGames } from "@/features/game/menuGames";
import { getLoyaltyTiers } from "@/features/loyalty/publicTiers";
import { getPublicGifts } from "@/features/gifts/publicGifts";
import { getLayoutContent } from "@/features/site/layoutContent";
import { scheduleLines } from "@/features/support/hours";
import { getSupportPresence } from "@/features/support/presence";
import { cn } from "@/lib/cn";
import { GamesMenu } from "./GamesMenu";
import { GlowBar } from "./GlowBar";
import { HeaderSearch } from "./HeaderSearch";
import { MobileMenu } from "./MobileMenu";
import { HeaderHours, HeaderHoursStrip } from "./HeaderHours";
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
 * página "Cabeçalho" em `/admin/paginas` e em Configurações da loja. A leitura é cacheada com
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
  const [sessao, { tiers }, layout, games, gifts, presence] = await Promise.all([
    user ? Promise.resolve(user) : getSessionUser(),
    getLoyaltyTiers(),
    getLayoutContent(),
    // Jogos do menu GAMES — cacheada como o layout, ver `menuGames.ts`.
    getMenuGames(),
    // Brindes por jogo da gaveta do carrinho (2026-10-12) — público e
    // cacheado como os níveis, ver `gifts/publicGifts.ts`.
    getPublicGifts(),
    // Atendentes online (2026-10-16) — só para o cartão do menu do celular;
    // cacheada 30 s, a mesma leitura do botão do chat (o Next deduplica).
    getSupportPresence(),
  ]);

  // Os rótulos e a marca vêm do painel ("Cabeçalho e rodapé" em
  // Páginas → Cabeçalho). A leitura é cacheada com invalidação por etiqueta — ver
  // `features/site/layoutContent.ts`.
  const brand = layout.text("marca");
  const badge = layout.text("header-selo");
  const search = layout.text("header-busca");
  const actions = layout.text("header-acoes");
  // Horário de atendimento (Configurações → Atendimento), já em linhas curtas.
  const hours = layout.text("horario");
  const schedule = scheduleLines((day) => hours.extra(day, ""));
  // O cabeçalho acompanha a rolagem: no celular desde 2026-09-24 (menu, busca e
  // carrinho sempre à mão) e no desktop desde 2026-10-09 (pedido do usuário).
  // `sticky` e não `fixed`: continua ocupando os 83px no fluxo, então nada da
  // página sobe por baixo dele.
  return (
    <header className="sticky top-0 z-40 w-full bg-black/50 backdrop-blur-[9px]">
      <GlowBar className="-top-[2px]" />

      {/* Do `xl` em diante, GRADE de 3 colunas (1fr · selo · 1fr): o selo fica no
          centro exato (as duas laterais têm a mesma largura) e a coluna da
          direita é [horário de atendimento | botões] — o horário centraliza no
          vão entre o selo e os botões (pedido do usuário, 2026-10-16). Abaixo
          do `xl` o selo some (md–xl) e o horário ocupa o meio livre do flex. */}
      <div className="relative mx-auto flex h-[83px] max-w-[1920px] items-center gap-[12px] px-[25px] md:gap-[25px] md:px-6 lg:px-[50px] xl:grid xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        {/* Lado esquerdo: `contents` no flex (cada peça é filho direto, como
            antes); bloco único na grade do `xl`. */}
        <div className="contents xl:flex xl:min-w-0 xl:items-center xl:gap-[25px]">
          {/* `data-admin-section`: na prévia do painel, clicar aqui abre o campo
            certo (ver `features/pages/editor/previewPick.ts`). Na loja é inerte. */}
          <Link
            href="/"
            aria-label="Lets4Trade, página inicial"
            className="shrink-0"
            data-admin-section="layout:marca"
          >
            <Image
              src={brand.imageUrl ?? "/images/lets4trade-logo.png"}
              alt="Lets4Trade"
              width={138}
              height={65}
              priority
              // O PNG de fábrica é 1000×1000 com margens transparentes; `object-cover`
              // na caixa 138×65 recorta exatamente essas margens (igual ao Figma).
              // Logo ENVIADA pelo painel (rebranding) usa `contain`: outro formato
              // seria cortado. Mobile (Figma 2667:1864): logo menor, para caber
              // selo, carrinho e menu na mesma linha de ~400px.
              className={`h-[41px] w-[88px] md:h-[65px] md:w-[138px] ${brand.imageUrl ? "object-contain" : "object-cover"}`}
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
          <div className="contents" data-admin-section="layout:header-acoes">
            <GamesMenu label={actions.title} games={games} />
          </div>

          {/* Busca com sugestões de jogos e produtos — client, ver `HeaderSearch`. */}
          <div className="contents" data-admin-section="layout:header-busca">
            <HeaderSearch placeholder={search.title} />
          </div>
        </div>

        {/* Selo "+1000 REFERÊNCIAS" — o número usa o degradê laranja recortado
            no texto (bg-clip-text), como no design.

            Centralização: fica FORA do fluxo flex (`absolute` + `left-1/2` +
            `-translate-x-1/2`). No fluxo, `mx-auto` só o centraria no espaço
            que sobra entre os vizinhos — bastaria o texto de um botão mudar
            para o selo sair do lugar. Ancorado assim, ele cai no centro exato
            do header e não se move, seja qual for a largura dos lados. */}
        {/* No celular o selo volta (o desenho mobile o tem no centro, menor); só
            some na faixa md–xl, onde os botões do desktop ocupam o meio. */}
        <div
          data-admin-section="layout:header-selo"
          className="pointer-events-none absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center leading-none md:hidden xl:static xl:flex xl:translate-x-0 xl:translate-y-0"
        >
          {/* Celular menor (2026-10-15, pedido do usuário): o selo disputava a
              linha com a logo, o carrinho e o menu. */}
          <div className="flex items-center gap-[5px] md:gap-2">
            <span className="bg-gradient-to-b from-brand-orange to-brand-orange-deep bg-clip-text font-korataki text-[12px] font-bold tracking-[0.2px] text-transparent md:text-[20px]">
              <CountUp value={badge.title} />
            </span>
            <Image
              src="/icons/youtube-color.svg"
              alt=""
              width={19}
              height={19}
              aria-hidden
              className="size-[14px] md:size-[19px]"
            />
          </div>
          <span className="mt-[3px] font-korataki text-[8px] tracking-[0.13px] text-white md:mt-1 md:text-[13px]">
            {badge.subtitle}
          </span>
        </div>

        {/* Lado direito: horário (ocupa o vão, some se não couber) + botões. */}
        <div className="flex min-w-0 flex-1 items-center gap-[12px] md:gap-[25px]">
          <HeaderHours title={hours.title} schedule={schedule} />

          <div className="ml-auto flex shrink-0 items-center gap-[10px] md:gap-[25px]">
            {sessao ? null : (
              <>
                {/* `Link` com as classes do botão, e não `Button`: eles PRECISAM
                  navegar. Como <button> sem handler, não faziam nada — era o
                  motivo de o cabeçalho parecer "morto" para login e cadastro. */}
                <Link
                  href="/criar-conta"
                  data-admin-section="layout:header-acoes"
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "hidden min-w-[197px] px-[20px] lg:inline-flex",
                  )}
                >
                  {actions.subtitle}
                </Link>
                <Link
                  href="/login"
                  data-admin-section="layout:header-acoes"
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
            <CartButton tiers={tiers} gifts={gifts} />

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
              support={{ presence, title: hours.title, schedule }}
            />
          </div>
        </div>
      </div>

      {/* Celular: horário numa faixa abaixo da barra, dentro do cabeçalho. */}
      <HeaderHoursStrip title={hours.title} schedule={schedule} />
    </header>
  );
}
