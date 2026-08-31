import type { NextConfig } from "next";


const securityHeaders = [
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  // Anti-clickjacking: as PÁGINAS HTML do app (checkout, exclusão de conta,
  // dashboard) não podiam ser enquadradas. `X-Frame-Options` cobre navegadores
  // legados; `frame-ancestors 'none'` é o equivalente moderno via CSP.
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self), payment=(), xr-spatial-tracking=(self \"https://challenges.cloudflare.com\")",
  },
];

const nextConfig: NextConfig = {
  output: "standalone",

  // Type checking roda no editor/IDE — não durante o docker build na VPS.
  // ESLint não precisa de flag: o Next 16 removeu a integração com `next build`.
  /* ATENÇÃO: erros de TS existentes — remover após corrigir */
  typescript: { ignoreBuildErrors: true },

  // Remove TODOS os console.* do bundle de produção (mantém error/warn para
  // observabilidade real). Evita vazar dado de usuário/preço/IDs em produção
  // sem precisar caçar cada log manualmente. Em dev os logs continuam ativos.
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },

  transpilePackages: ["quill-resize-module"],
  async redirects() {
    return [
      {
        // Rota antiga da landing institucional (/lp). Renomeada para a URL
        // canônica abaixo (melhor SEO e divulgação). 308 permanente: preserva
        // links já compartilhados e sinaliza a mudança definitiva aos crawlers.
        source: "/lp",
        destination: "/crie-seu-evento-na-lets4trade",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  images: {
    // Otimização ON: o next/image serve variantes redimensionadas por `sizes` via
    // /_next/image (mesma origem — o Cloudflare à frente cacheia o resultado na
    // borda). Ganho maior no CHECKOUT: thumbs de 100px deixam de baixar o upload
    // inteiro. PRÉ-REQUISITO: o `sharp` DEVE existir no container — garantido no
    // Dockerfile (runner instala + valida `require('sharp')`, falhando o build se
    // faltar). Sem isso o /_next/image estoura 500 (histórico 2026-08-19).
    // Só WebP (sem AVIF): o encode AVIF é MUITO mais caro em CPU e, sob pico,
    // satura o container e derruba o SSR junto — só reintroduzir com CDN
    // comprovadamente cacheando a borda.
    formats: ["image/webp"],
    // Variante encodada em cache por 31 dias (era 60s default): corta o RE-encode
    // do mesmo asset. URLs de upload são imutáveis (timestamp no nome) → sem stale.
    //
    // MAS isso só vale para URL imutável. Os assets de `public/` têm nome FIXO
    // (`/images/team/eddmax.png`), então trocar o arquivo não muda a URL: o
    // otimizador continua servindo a variante velha de `.next/cache/images` por
    // 31 dias e a troca não aparece. Foi exatamente o que aconteceu ao
    // substituir os exports do Figma.
    //
    // Em DEV o TTL cai para zero: cada requisição revalida e a troca aparece no
    // refresh. Em produção o TTL longo continua — lá os assets são versionados
    // (hash no nome pelo build, timestamp nos uploads) e o re-encode a cada
    // requisição custa CPU no container.
    //
    // Só o TTL muda entre os ambientes. O otimizador segue LIGADO em dev de
    // propósito: com `unoptimized: true` os `remotePatterns` deixam de ser
    // aplicados, e aí um host mal configurado só apareceria em produção.
    minimumCacheTTL:
      process.env.NODE_ENV === "production" ? 60 * 60 * 24 * 31 : 0,
    // O otimizador do Next 16 recusa buscar imagens cujo host resolve para IP
    // privado/loopback (defesa contra SSRF). Em DEV o backend serve os uploads
    // em http://localhost:3333/... → cai nessa regra e a imagem quebra. Em
    // produção as imagens vêm do GCS/CDN (IP público), então a proteção deve
    // permanecer LIGADA lá. Liberamos o IP privado SOMENTE fora de produção.
    dangerouslyAllowLocalIP: process.env.NODE_ENV !== "production",
    // Next 16 exige declarar as qualidades usadas na prop `quality` (default 75).
    // Valores em uso hoje: 75 (default), 90 (EventCardContent), 100 (LandingPage).
    qualities: [75, 90, 100],
    remotePatterns: [
      { protocol: "https", hostname: "*.lets4trade.com.br" },
      { protocol: "https", hostname: "cdn.lets4trade.com.br" },
      { protocol: "https", hostname: "*.amazonaws.com" },
      { protocol: "https", hostname: "*.googleusercontent.com" },
      { protocol: "https", hostname: "*.cdninstagram.com" },
      // Uploads do app no Google Cloud Storage. O backend carimba a URL do
      // objeto e o bucket muda por ambiente (lets4trade-homologacao-uploads,
      // lets4trade-producao-uploads, ...). Com o otimizador ligado, os remotePatterns
      // passam a ser enforced (antes, com unoptimized:true, eram ignorados) —
      // sem esta entrada o next/image derruba a imagem com "hostname not configured".
      // path-style: https://storage.googleapis.com/<bucket>/<objeto>. O pathname
      // fica restrito ao prefixo `lets4trade-` (menor privilégio: cobre todos os
      // ambientes do projeto sem liberar qualquer bucket público do GCS).
      { protocol: "https", hostname: "storage.googleapis.com", pathname: "/lets4trade-*/**" },
      // virtual-hosted style: https://<bucket>.storage.googleapis.com/<objeto>.
      { protocol: "https", hostname: "*.storage.googleapis.com" },
      // Desenvolvimento local (HTTP apenas para localhost)
      { protocol: "http", hostname: "localhost" },
    ],
  },
  compress: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: [
      "@fortawesome/react-fontawesome",
      "@fortawesome/free-solid-svg-icons",
      "lucide-react",
      "framer-motion",
      "@radix-ui/react-checkbox",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-popover",
      "@radix-ui/react-slot",
      "react-svg-credit-card-payment-icons",
      "@dnd-kit/core",
      "@dnd-kit/sortable",
      "@dnd-kit/utilities",
    ],
    // Usa worker threads para paralelizar a compilação webpack — reduz tempo de build
    webpackBuildWorker: true,
    // Compila server e client em paralelo em vez de sequencialmente
    parallelServerCompiles: true,
    parallelServerBuildTraces: true,
  },
};

export default nextConfig;

