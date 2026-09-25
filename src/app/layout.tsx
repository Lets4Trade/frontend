// build bump
import type { Metadata } from "next";
import { Manrope, DM_Sans } from "next/font/google";
import localFont from "next/font/local";
import { PageViewTracker } from "@/features/admin/PageViewTracker";
import { getContacts } from "@/features/site/contacts";
import { getLayoutContent } from "@/features/site/layoutContent";
import { ContactBubble } from "@/features/support/ContactBubble";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

// Poppins é a fonte do design do Lets4Trade (Figma). Os arquivos ficam no
// repositório (`public/fonts/`, subset latin) em vez de virem do Google no
// build: tira uma dependência de rede do `next build`, elimina a chamada a um
// terceiro e deixa a fonte versionada junto do código que a usa.
//
// Os quatro pesos são os que o design realmente pede — cada peso extra é mais
// um arquivo para o browser baixar. 600 (SemiBold) é o dos títulos de seção
// ("NOSSAS REVIEWS", "CLIENTES 100% SATISFEITOS", ...): sem ele o navegador
// engorda o 400 por conta própria e o traço sai diferente do arquivo.
const poppins = localFont({
  variable: "--font-poppins",
  display: "swap",
  src: [
    { path: "../../public/fonts/poppins-400.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/poppins-500.woff2", weight: "500", style: "normal" },
    { path: "../../public/fonts/poppins-600.woff2", weight: "600", style: "normal" },
    { path: "../../public/fonts/poppins-700.woff2", weight: "700", style: "normal" },
  ],
});

// Helvetica Neue é a fonte de texto do design (corpo dos depoimentos, respostas
// do FAQ, labels de formulário, título dos guias). Só entram os TRÊS pesos que
// as telas usam de fato — 400 no corpo, 500 num rótulo, 700 nos destaques.
// Nenhum itálico é usado em lugar nenhum.
//
// `adjustFontFallback` desligado: o Next tentaria derivar uma fonte de ajuste a
// partir de métricas conhecidas, e Helvetica Neue não está na tabela dele.
const helveticaNeue = localFont({
  variable: "--font-helvetica-neue",
  display: "swap",
  adjustFontFallback: false,
  // A pilha de reserva vive aqui, junto da fonte, e não repetida no CSS: assim
  // o token `--font-helvetica` é um `var()` só e existe um único lugar para
  // mudar a ordem de fallback.
  fallback: ["Helvetica Neue", "Helvetica", "Arial", "sans-serif"],
  src: [
    { path: "../../public/fonts/helvetica-neue-400.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/helvetica-neue-500.woff2", weight: "500", style: "normal" },
    { path: "../../public/fonts/helvetica-neue-700.woff2", weight: "700", style: "normal" },
  ],
});

// Korataki aparece em UM lugar só: o selo "+1000 REFERÊNCIAS" do cabeçalho
// (400 no rótulo, 700 no número). Por isso `preload: false` — carregar uma
// família inteira no caminho crítico por causa de dois textos não se paga; ela
// entra quando o navegador chegar nesse trecho.
const korataki = localFont({
  variable: "--font-korataki-local",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  fallback: ["Helvetica Neue", "Helvetica", "Arial", "sans-serif"],
  src: [
    { path: "../../public/fonts/korataki-400.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/korataki-700.woff2", weight: "700", style: "normal" },
  ],
});

const BASE_METADATA: Metadata = {
  metadataBase: new URL(
    (process.env.NEXT_PUBLIC_ROOT_SITE_URL || "http://localhost:3000").replace(
      /\/$/,
      "",
    ),
  ),
  title: "Lets4Trade",
  description:
    "Lets4Trade",
  keywords: ["lets4trade", "tickets", "events", "management"],
  authors: [{ name: "Lets4Trade Team" }],
  creator: "Lets4Trade",
  publisher: "Lets4Trade",
  openGraph: {
    title: "Lets4Trade",
    description:
      "Lets4Trade",
    type: "website",
    locale: "pt-BR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lets4Trade",
    description:
      "Lets4Trade",
  },
};

/** O ícone de fábrica, enquanto o painel não tiver um. */
const DEFAULT_ICON = "/images/logo.png";

/**
 * O ícone da aba (favicon) sai do painel (2026-09-24, rebranding): Edição de
 * sessões → Cabeçalho e rodapé → "Ícone do site". Vazio, fica o de fábrica.
 *
 * Mesma leitura cacheada do cabeçalho (1h, derrubada pelo painel ao salvar), então
 * não é uma ida a mais ao backend. O arquivo enviado passa pelo backend, que o
 * re-codifica (WebP) — navegadores atuais aceitam WebP como ícone.
 *
 * ⚠️ Navegadores guardam favicon em cache por conta própria, e por bastante
 * tempo: quem já visitou pode demorar a ver o ícone novo.
 */
export async function generateMetadata(): Promise<Metadata> {
  const icon = (await getLayoutContent()).text("icone").imageUrl;
  const url = icon ?? DEFAULT_ICON;
  const type = icon ? undefined : "image/png";

  return {
    ...BASE_METADATA,
    icons: {
      icon: [{ url, ...(type ? { type } : {}) }],
      apple: [{ url }],
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Leitura cacheada (1h, invalidada pelo painel) — a mesma que o cabeçalho e o
  // rodapé já fazem; não soma ida ao backend.
  const contacts = await getContacts();

  return (
    <html
      lang="pt-BR"
      className={`${manrope.variable} ${dmSans.variable} ${poppins.variable} ${helveticaNeue.variable} ${korataki.variable}`}
    >
      <body suppressHydrationWarning className="scroll-smooth antialiased">
        {/* Registra cada TELA aberta na loja — navegação, não clique. Fica no
            layout raiz para cobrir toda rota sem que cada página precise
            lembrar. O painel tem o seu, declarando `surface="admin"`; quem
            decide a categoria é o backend, pela sessão. */}
        <PageViewTracker surface="store" />
        {children}
        {/* Contato flutuante em toda a loja; ele mesmo some no checkout e no
            painel. Ver `features/support/ContactBubble.tsx`. */}
        <ContactBubble whatsappHref={contacts.whatsapp?.href} />
      </body>
    </html>
  );
}
