import Image from "next/image";
import Link from "next/link";
import {
  formatCnpj,
  parseEmail,
  parsePhone,
  resolveCopyright,
  type ContactChannel,
} from "@/features/site/contacts";
import { getLayoutContent } from "@/features/site/layoutContent";
import { GlowBar } from "./GlowBar";

/**
 * O rodapé da loja.
 *
 * ── Todo o conteúdo vem do BANCO ──────────────────────────────────────────
 * Até 2026-09-14 este arquivo carregava o placeholder do Figma direto para
 * produção: três colunas de "CATEGORIA" com "NOME DA PAGE 1/2/3" apontando para
 * `#`, as seis redes sociais igualmente sem link, e um parágrafo de Lorem Ipsum.
 * Trocar qualquer um deles exigia alterar este arquivo e implantar.
 *
 * Agora são sessões da página `layout` do catálogo (`features/site/sections.ts`),
 * editáveis em `/admin/sessoes`. A leitura é CACHEADA com invalidação por
 * etiqueta — o rodapé renderiza em toda requisição do site e não pode custar uma
 * ida ao backend por página. Ver `features/site/layoutContent.ts`.
 *
 * ── Lista vazia é vazia mesmo ─────────────────────────────────────────────
 * Sem queda para conteúdo de código, a mesma regra das listas da home: com o
 * admin podendo apagar itens, "apaguei tudo e voltou sozinho" é pior que uma
 * seção vazia. O conteúdo inicial entra pela semente
 * (`pnpm db:seed:site-content`), não por um array aqui.
 */

/**
 * A caixa do ícone social.
 *
 * O arquivo dá um tamanho POR GLIFO (WhatsApp 23px, LinkedIn 21, Discord 20…).
 * Com o ícone virando upload — que é o que permite adicionar uma rede nova —
 * não há de onde tirar esse número por item, então a caixa é única e o
 * `object-contain` preserva a proporção de cada arte.
 *
 * 21px é o valor de menor desvio em relação ao arquivo (é o tamanho exato do
 * LinkedIn, e os outros cinco ficam a 1–2px). A moldura de 60px não muda, então
 * o rodapé não se desloca.
 */
const ICON_BOX = 21;

/** As três colunas de links. Coluna sem link nenhum não é desenhada. */
const LINK_COLUMNS = [
  "footer-coluna-1",
  "footer-coluna-2",
  "footer-coluna-3",
] as const;

export async function SiteFooter() {
  const { text, items } = await getLayoutContent();

  const brand = text("marca");
  const social = items("footer-redes");
  const about = text("footer-sobre").body;

  // Dados da empresa: cada linha só aparece se foi preenchida no painel.
  // Telefone e e-mail viram link MONTADO (`tel:`/`mailto:`), nunca o texto do
  // campo — ver `contacts.ts`.
  const company = text("footer-empresa");
  const cnpj = formatCnpj(company.title);
  const phone = parsePhone(company.subtitle);
  const email = parseEmail(company.footnote);
  const copyright = resolveCopyright(company.body, new Date().getFullYear());
  const hasCompany = Boolean(cnpj || phone || email || copyright);

  const columns = LINK_COLUMNS.map((key) => ({
    key,
    title: text(key).title,
    links: items(key),
  })).filter((column) => column.links.length > 0);

  return (
    <footer className="relative w-full border-t border-white/20 bg-gradient-to-br from-black via-[#020202] to-black">
      <div className="mx-auto max-w-[1720px] px-4 py-11 sm:px-6 lg:px-[100px]">
        <div className="flex flex-wrap items-center justify-between gap-8">
          <Image
            // A arte padrão continua no `public/`: ela é a identidade da loja e
            // precisa desenhar mesmo com o backend fora do ar.
            src={brand.imageUrl ?? "/images/lets4trade-logo.png"}
            alt="Lets4Trade"
            width={174}
            height={82}
            className="h-[82px] w-[174px] object-cover"
          />

          {social.length > 0 ? (
            <ul className="flex flex-wrap items-center gap-[25px]">
              {social.map((network) => (
                <li key={network.id}>
                  <Link
                    href={network.href}
                    aria-label={network.label}
                    className="flex size-[60px] items-center justify-center rounded-[12px] border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] transition-colors hover:border-white/30"
                  >
                    {network.image ? (
                      <Image
                        src={network.image}
                        alt=""
                        width={ICON_BOX}
                        height={ICON_BOX}
                        aria-hidden
                        // Caixa FIXA de 21×21 + `object-contain`: a arte cabe
                        // inteira e mantém a proporção dentro dela. Não usar
                        // `width/height: auto` — imagem com carregamento
                        // preguiçoso fica com caixa 0×0 e o navegador nunca a
                        // baixa (reproduzido em 2026-09-14).
                        className="size-[21px] object-contain"
                      />
                    ) : (
                      // Rede cadastrada sem ícone mostra a inicial em vez de um
                      // quadrado vazio — o link continua clicável e o rótulo
                      // continua legível por leitor de tela.
                      <span
                        aria-hidden
                        className="font-poppins text-[16px] font-bold text-white"
                      >
                        {network.label.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {columns.length > 0 ? (
          <>
            <hr className="mt-10 border-0 border-t border-brand-hairline" />

            <div className="mt-11 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-[122px] lg:[grid-template-columns:repeat(3,174px)]">
              {columns.map((column) => (
                <nav key={column.key} aria-label={column.title}>
                  <h2 className="font-poppins text-[16px] font-bold tracking-[0.16px] text-white">
                    {column.title}
                  </h2>
                  <ul className="mt-6 flex flex-col gap-[27px]">
                    {column.links.map((link) => (
                      <li key={link.id}>
                        <Link
                          href={link.href}
                          className="font-poppins text-[15px] font-medium tracking-[0.15px] text-brand-fg-muted transition-colors hover:text-white"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              ))}
            </div>
          </>
        ) : null}

        {about ? (
          <>
            <hr className="mt-11 border-0 border-t border-brand-hairline" />

            {/* Parágrafo em Helvetica Neue Medium no design — não Poppins.
                `whitespace-pre-line` porque o campo do painel é um `textarea`:
                quem escreve em dois parágrafos espera ver dois parágrafos. */}
            <p className="mt-10 max-w-[772px] font-helvetica text-[16px] font-medium tracking-[0.16px] whitespace-pre-line text-brand-fg-subtle">
              {about}
            </p>
          </>
        ) : null}

        {hasCompany ? (
          <>
            <hr className="mt-11 border-0 border-t border-brand-hairline" />

            <div className="mt-8 flex flex-col gap-4 font-poppins text-[14px] tracking-[0.14px] text-brand-fg-subtle lg:flex-row lg:items-center lg:justify-between">
              {copyright ? <p>{copyright}</p> : <span />}

              <ul className="flex flex-wrap items-center gap-x-[25px] gap-y-2">
                {cnpj ? <li>CNPJ {cnpj}</li> : null}
                {phone ? (
                  <li>
                    <CompanyContact channel={phone} label="Telefone" />
                  </li>
                ) : null}
                {email ? (
                  <li>
                    <CompanyContact channel={email} label="E-mail" />
                  </li>
                ) : null}
              </ul>
            </div>
          </>
        ) : null}
      </div>

      <GlowBar className="bottom-0" />
    </footer>
  );
}

/** Telefone ou e-mail: link quando o valor é válido, texto quando não. */
function CompanyContact({ channel, label }: { channel: ContactChannel; label: string }) {
  return channel.href ? (
    <a
      href={channel.href}
      aria-label={`${label}: ${channel.value}`}
      className="transition-colors hover:text-white"
    >
      {channel.value}
    </a>
  ) : (
    <span>{channel.value}</span>
  );
}
