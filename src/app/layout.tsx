// build bump
import type { Metadata } from "next";
import { Manrope, DM_Sans, Poppins } from "next/font/google";
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

// Poppins é a fonte do design do Lets4Trade (Figma). Declaramos só os pesos
// realmente usados — cada peso extra é mais um arquivo para o browser baixar.
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
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
      className={`${manrope.variable} ${dmSans.variable} ${poppins.variable}`}
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
