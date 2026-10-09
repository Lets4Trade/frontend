import Image from "next/image";

/**
 * Miniatura do jogo nos menus GAMES (cabeçalho, home desktop e celular).
 *
 * A arte cadastrada é o LOGO do jogo, quase sempre bem mais largo que alto
 * (ARC Raiders 372×106, Diablo 437×182). Histórico (2026-10-09, relatos do
 * usuário):
 * - quadrado 36px + `object-cover`: mostrava só um recorte do meio;
 * - quadrado 36px + `object-contain`: inteiro, mas um logo 3,5:1 ficava com
 *   ~10px de altura — ilegível.
 * Por isso a moldura é HORIZONTAL (76×40, ~1,9:1): logo largo usa a largura,
 * arte quadrada usa a altura, e nada é cortado.
 *
 * `sizes` = largura real da caixa; o `next/image` já multiplica pela densidade
 * da tela no `srcset`, então em tela 2x vem o arquivo de 256px, nítido.
 */
export function MenuGameThumb({ src }: { src: string | null }) {
  return (
    <span
      aria-hidden
      className="relative h-[40px] w-[76px] shrink-0 overflow-hidden rounded-[8px] border border-white/10 bg-white/5"
    >
      {src ? (
        <Image src={src} alt="" fill sizes="76px" className="object-contain p-[3px]" />
      ) : null}
    </span>
  );
}
