// build bump
import type { Metadata } from "next";
import { Manrope, DM_Sans } from "next/font/google";
import localFont from "next/font/local";
import { headers } from "next/headers";
import Script from "next/script";
import { Suspense } from "react";
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
  // A pilha de reserva vive aqui, junto da fonte, e não no CSS: o compilador
  // de CSS remove um `var()` seguido de lista dentro de outra custom property.
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

export const metadata: Metadata = {
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
  icons: {
    icon: [
      { url: "/images/logo.png", sizes: "64x64", type: "image/png" },
      { url: "/images/logo.png", sizes: "192x192", type: "image/png" },
      { url: "/images/logo.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/images/logo.png", sizes: "180x180", type: "image/png" }],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${manrope.variable} ${dmSans.variable} ${poppins.variable} ${helveticaNeue.variable} ${korataki.variable}`}
    >
      <head>
        <link rel="icon" href="/images/logo.png" />
      </head>

      <body suppressHydrationWarning className="scroll-smooth antialiased">
        {children}
      </body>
    </html>
  );
}
