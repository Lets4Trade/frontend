import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/structuredData";

/**
 * `/robots.txt` (2026-11-27, troca do site antigo).
 *
 * Fecha só as áreas que não são vitrine: painel, conta, checkout, pagamento,
 * prévias do editor e rotas internas. Os filtros da página de jogo (`?ordem=`,
 * `?pagina=`, `?servidor=`) ficam ABERTOS de propósito: bloqueados aqui, o robô
 * não leria o canonical deles e poderia indexar o endereço sem conteúdo; com o
 * canonical apontando para a aba, eles se juntam a ela sozinhos.
 *
 * Bloquear aqui NÃO é segurança (o arquivo é público e só robô educado
 * obedece) — o painel continua protegido pela sessão e pelo `noindex`.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/conta", "/checkout", "/pagamento", "/previa", "/api/"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
