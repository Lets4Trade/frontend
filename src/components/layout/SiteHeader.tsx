import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { GlowBar } from "./GlowBar";

/**
 * Header do tema dark (Figma 1946:1060) — 83px, preto 50% com backdrop-blur 9px
 * e a faixa de brilho laranja no topo.
 *
 * Medidas do design (header de 1904px dentro do frame de 1920px):
 *   logo   x=50   138×65      GAMES  x=212  159×50
 *   busca  x=396  219×50      CRIAR  x=1376 197×50
 *   ACESSAR x=1598 197×50     carrinho x=1820 50×50
 * Os vãos são de 25px e as larguras são FIXAS — não derivadas do padding. Com
 * padding, a largura passaria a depender do texto e qualquer tradução ou
 * mudança de cópia deslocaria a barra inteira.
 *
 * `max-w-[1920px]` + `px-[50px]` reproduz a margem de 50px dos dois lados: o
 * header do arquivo tem 1904px (16px a menos, sobra de barra de rolagem), mas
 * a distância até a borda do frame é 50px tanto à esquerda quanto à direita.
 *
 * Responsivo: o design é fixo em 1920px. Abaixo de `xl` o selo sai, abaixo de
 * `lg` a busca sai, e abaixo de `sm` sobram logo + ações.
 */
/** Dados mínimos do usuário logado para o header. */
export type HeaderUser = {
  name: string;
  avatar: string;
  /** Mostra o ponto verde de "online" sobre o avatar. */
  online?: boolean;
};

/**
 * `user` alterna o lado direito entre os dois estados do design: deslogado
 * (CRIAR CONTA + ACESSAR CONTA, nó 1946:1060) e logado (avatar + seta, nó
 * 2073:1778). O carrinho aparece nos dois.
 */
export function SiteHeader({ user }: { user?: HeaderUser } = {}) {
  return (
    <header className="relative z-20 h-[83px] w-full bg-black/50 backdrop-blur-[9px]">
      <GlowBar className="-top-[2px]" />

      <div className="relative mx-auto flex h-full max-w-[1920px] items-center gap-[25px] px-4 sm:px-6 lg:px-[50px]">
        <Link href="/" aria-label="Lets4Trade — página inicial" className="shrink-0">
          <Image
            src="/images/lets4trade-logo.png"
            alt="Lets4Trade"
            width={138}
            height={65}
            priority
            // O PNG é 1000×1000 com margens transparentes; `object-cover` na
            // caixa 138×65 recorta exatamente essas margens (igual ao Figma).
            className="h-[65px] w-[138px] object-cover"
          />
        </Link>

        <Button variant="outline" className="hidden w-[159px] shrink-0 px-0 md:inline-flex">
          GAMES
        </Button>

        <div className="relative hidden w-[219px] shrink-0 lg:block">
          <Image
            src="/icons/search.svg"
            alt=""
            width={20}
            height={20}
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-[25px] -translate-y-1/2"
          />
          <input
            type="search"
            aria-label="Buscar"
            placeholder="O que você busca?"
            // Placeholder da busca em Helvetica Neue Regular no design.
            className="h-[50px] w-full rounded-full border-2 border-[var(--brand-stroke-soft)] bg-[image:var(--brand-surface-fill)] pr-4 pl-[60px] font-helvetica text-[15px] tracking-[0.15px] text-white outline-none transition-colors placeholder:text-brand-placeholder focus:border-brand-orange"
          />
        </div>

        {/* Selo "+1000 REFERÊNCIAS" — o número usa o degradê laranja recortado
            no texto (bg-clip-text), como no design.

            Centralização: fica FORA do fluxo flex (`absolute` + `left-1/2` +
            `-translate-x-1/2`). No fluxo, `mx-auto` só o centraria no espaço
            que sobra entre os vizinhos — bastaria o texto de um botão mudar
            para o selo sair do lugar. Ancorado assim, ele cai no centro exato
            do header e não se move, seja qual for a largura dos lados. */}
        <div className="pointer-events-none absolute top-1/2 left-1/2 hidden -translate-x-1/2 -translate-y-1/2 flex-col items-center leading-none xl:flex">
          <div className="flex items-center gap-2">
            <span className="bg-gradient-to-b from-brand-orange to-brand-orange-deep bg-clip-text font-korataki text-[20px] font-bold tracking-[0.2px] text-transparent">
              +1000
            </span>
            <Image src="/icons/youtube-color.svg" alt="" width={19} height={19} aria-hidden />
          </div>
          <span className="mt-1 font-korataki text-[13px] tracking-[0.13px] text-white">
            REFERÊNCIAS
          </span>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-[25px]">
          {user ? null : (
            <>
              <Button
                variant="outline"
                className="hidden w-[197px] px-0 sm:inline-flex"
              >
                CRIAR CONTA
              </Button>
              <Button variant="cta" className="w-[197px] px-0">
                ACESSAR CONTA
              </Button>
            </>
          )}

          {/* O asset exportado (nó 1946:1074) já É o botão inteiro: 50×50 com o
              círculo de borda e gradiente embutidos no SVG. Envolver numa borda
              própria duplicaria o contorno e encolheria o glifo. */}
          <button
            type="button"
            aria-label="Carrinho"
            className="shrink-0 rounded-full transition-opacity hover:opacity-80"
          >
            <Image
              src="/icons/cart.svg"
              alt=""
              width={50}
              height={50}
              aria-hidden
              className="size-[50px]"
            />
          </button>

          {/* Estado logado: avatar de 50px com o ponto de status e a seta do
              menu. Os vãos do design são 25px (carrinho→avatar) e 15px
              (avatar→seta), por isso a seta traz `-ml-[10px]` sobre o gap de 25. */}
          {user ? (
            <button
              type="button"
              aria-label={`Menu de ${user.name}`}
              className="flex shrink-0 items-center gap-[15px] transition-opacity hover:opacity-80"
            >
              <span className="relative block size-[50px] shrink-0">
                <Image
                  src={user.avatar}
                  alt=""
                  width={50}
                  height={50}
                  aria-hidden
                  className="size-[50px] rounded-full object-cover"
                />
                {user.online ? (
                  <Image
                    src="/icons/status-dot.svg"
                    alt=""
                    width={8}
                    height={8}
                    aria-hidden
                    className="absolute bottom-[-2px] left-[4px]"
                  />
                ) : null}
              </span>

              <Image
                src="/icons/chevron-down.svg"
                alt=""
                width={18}
                height={18}
                aria-hidden
                className="-ml-[10px]"
              />
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
