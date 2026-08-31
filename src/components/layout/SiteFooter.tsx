import Image from "next/image";
import Link from "next/link";
import { GlowBar } from "./GlowBar";

/**
 * Ícones sociais: cada um mantém o tamanho próprio do design (não há um
 * tamanho único — o do YouTube é 23px, o do LinkedIn 21px, etc.). Uma regra
 * global de tamanho achataria essa diferença e distorceria os glifos.
 */
const SOCIAL_LINKS = [
  { name: "WhatsApp", icon: "/icons/social/whatsapp.svg", size: 23, href: "#" },
  { name: "Discord", icon: "/icons/social/discord.svg", size: 20, href: "#" },
  { name: "TikTok", icon: "/icons/social/tiktok.svg", size: 20, href: "#" },
  { name: "YouTube", icon: "/icons/social/youtube.svg", size: 23, href: "#" },
  { name: "LinkedIn", icon: "/icons/social/linkedin.svg", size: 21, href: "#" },
  { name: "Instagram", icon: "/icons/social/instagram.svg", size: 20, href: "#" },
] as const;

/** Colunas de links. Conteúdo é placeholder no Figma — trocar quando definido. */
const LINK_COLUMNS = [
  { title: "CATEGORIA", links: ["NOME DA PAGE 1", "NOME DA PAGE 2", "NOME DA PAGE 3"] },
  { title: "CATEGORIA", links: ["NOME DA PAGE 1", "NOME DA PAGE 2", "NOME DA PAGE 3"] },
  { title: "CATEGORIA", links: ["NOME DA PAGE 1", "NOME DA PAGE 2", "NOME DA PAGE 3"] },
];

const FOOTER_TEXT =
  "There are many variations of passages of Lorem Ipsum available, but the majority have suffered alteration in some form, by injected humour, or randomised words which don't look even slightly believable. If you are going to use a passage of Lorem Ipsum, you need to be sure there isn't anything embarrassing hidden in the middle of text.";

export function SiteFooter() {
  return (
    <footer className="relative w-full border-t border-white/20 bg-gradient-to-br from-black via-[#020202] to-black">
      <div className="mx-auto max-w-[1720px] px-4 py-11 sm:px-6 lg:px-[100px]">
        <div className="flex flex-wrap items-center justify-between gap-8">
          <Image
            src="/images/lets4trade-logo.png"
            alt="Lets4Trade"
            width={174}
            height={82}
            className="h-[82px] w-[174px] object-cover"
          />

          <ul className="flex flex-wrap items-center gap-[25px]">
            {SOCIAL_LINKS.map(({ name, icon, size, href }) => (
              <li key={name}>
                <Link
                  href={href}
                  aria-label={name}
                  className="flex size-[60px] items-center justify-center rounded-[12px] border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] transition-colors hover:border-white/30"
                >
                  <Image src={icon} alt="" width={size} height={size} aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <hr className="mt-10 border-0 border-t border-brand-hairline" />

        <div className="mt-11 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-[122px] lg:[grid-template-columns:repeat(3,174px)]">
          {LINK_COLUMNS.map((column, columnIndex) => (
            <nav key={columnIndex} aria-label={`${column.title} ${columnIndex + 1}`}>
              <h2 className="font-poppins text-[16px] font-bold tracking-[0.16px] text-white">
                {column.title}
              </h2>
              <ul className="mt-6 flex flex-col gap-[27px]">
                {column.links.map((label) => (
                  <li key={label}>
                    <Link
                      href="#"
                      className="font-poppins text-[15px] font-medium tracking-[0.15px] text-brand-fg-muted transition-colors hover:text-white"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <hr className="mt-11 border-0 border-t border-brand-hairline" />

        {/* Parágrafo em Helvetica Neue Medium no design — não Poppins. */}
        <p className="mt-10 max-w-[772px] font-helvetica text-[16px] font-medium tracking-[0.16px] text-brand-fg-subtle">
          {FOOTER_TEXT}
        </p>
      </div>

      <GlowBar className="bottom-0" />
    </footer>
  );
}
