/**
 * Os quatro atalhos da home (desktop e celular). Arquivo próprio, sem nada
 * de servidor (2026-10-15): a fileira flutuante do celular virou global e é
 * client — importar de `HomeNav` levaria a leitura de jogos para o navegador.
 *
 * `active` é o destaque da HOME (a página onde a fileira nasceu); fora dela,
 * o destaque vem da URL (`navActiveHref`).
 */
export const NAV_ITEMS = [
  // `iconIdle`: o ícone da casa é PRETO (feito para o ladrilho laranja de
  // ativo). Fora da home o HOME fica apagado e precisa do branco (2026-10-15).
  { label: "HOME", icon: "/icons/home/nav-home.svg", iconIdle: "/icons/home/nav-home-light.svg", href: "/", left: 679, active: true, dropdown: false },
  // "JOGOS" desde 2026-10-23 (era GAMES). `key` é quem decide que este atalho
  // abre o menu de jogos — o rótulo pode mudar sem quebrar o menu.
  { key: "games", label: "JOGOS", icon: "/icons/home/nav-games.svg", href: "/games", left: 784, active: false, dropdown: true },
  { label: "FIDELIDADE", icon: "/icons/home/nav-fidelidade.svg", href: "/fidelidade", left: 905, active: false, dropdown: false },
  { label: "VENDA PRA NÓS", icon: "/icons/home/nav-venda.svg", href: "/venda", left: 1047, active: false, dropdown: false },
];

/** O atalho que corresponde à URL. JOGOS não tem página própria (é dropdown). */
export function navActiveHref(pathname: string): string | null {
  const match = NAV_ITEMS.find(
    (item) => !item.dropdown && (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)),
  );
  return match?.href ?? null;
}
