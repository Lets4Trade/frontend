import Image from "next/image";
import Link from "next/link";
import type { BlockPropsMap, PageRefs } from "../types";
import { assetUrl, resolveHref } from "./shared";

/**
 * "Banner": uma arte larga, opcionalmente clicável. Com arte de celular, o
 * `<picture>` troca a imagem abaixo de 768px — recortes diferentes para telas
 * diferentes, sem esticar a mesma arte.
 */
export function BannerBlock({ props, refs }: { props: BlockPropsMap["banner"]; refs: PageRefs }) {
  const desktop = assetUrl(props.image);
  if (!desktop) return null;
  const mobile = assetUrl(props.mobileImage);
  const href = resolveHref(props.link, refs);

  const art = (
    <span className="relative block overflow-hidden rounded-[30px] border border-brand-border">
      {mobile ? (
        <>
          <Image
            src={mobile}
            alt={props.alt}
            width={800}
            height={800}
            sizes="100vw"
            className="block h-auto w-full md:hidden"
          />
          <Image
            src={desktop}
            alt={props.alt}
            width={1820}
            height={500}
            sizes="(min-width: 1920px) 1820px, 100vw"
            className="hidden h-auto w-full md:block"
          />
        </>
      ) : (
        <Image
          src={desktop}
          alt={props.alt}
          width={1820}
          height={500}
          sizes="(min-width: 1920px) 1820px, 100vw"
          className="block h-auto w-full"
        />
      )}
    </span>
  );

  if (!href) return <section>{art}</section>;
  return (
    <section>
      {href.startsWith("https://") ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="block transition-opacity hover:opacity-95">
          {art}
        </a>
      ) : (
        <Link href={href} className="block transition-opacity hover:opacity-95">
          {art}
        </Link>
      )}
    </section>
  );
}
