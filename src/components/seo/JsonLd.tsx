import { serializeJsonLd } from "@/lib/structuredData";

/**
 * `<script type="application/ld+json">` com o objeto serializado de forma
 * segura (`serializeJsonLd` neutraliza `</script>` vindo de texto do painel).
 * Server component: o JSON-LD é para o robô e não precisa de JavaScript.
 */
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}
