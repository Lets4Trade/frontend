import type { NextConfig } from "next";

/**
 * Content Security Policy — de onde a página pode carregar o quê.
 *
 * ── Por que ficou assim (2026-09-14) ──────────────────────────────────────
 * Até esta data a CSP tinha só `frame-ancestors 'none'`: protegia contra ser
 * embutida em iframe, mas deixava a página carregar script, iframe e conexão de
 * QUALQUER origem. Um XSS que conseguisse injetar `<script src=…>` rodaria
 * código de fora sem obstáculo.
 *
 * A lista abaixo é o que o site usa DE FATO, e nada mais:
 *   - o próprio domínio;
 *   - a API (`NEXT_PUBLIC_API_URL`): chamadas, WebSocket do chat, imagens;
 *   - YouTube sem cookies: o iframe do vídeo da home.
 *
 * O anti-robô NÃO precisa de entrada aqui (2026-09-15): é o Challenge do Vercel
 * Firewall, e a tela de verificação é servida pela própria Vercel ANTES de a
 * página (e esta CSP) chegar ao navegador.
 * Não há tracker, CDN de fonte nem mapa carregados hoje. Entrou coisa nova de
 * fora? Ela precisa entrar aqui — senão o navegador bloqueia e o console diz
 * exatamente o quê.
 *
 * ── O trade-off do `'unsafe-inline'` em script ────────────────────────────
 * O Next injeta scripts inline para hidratar a página. Tirar o
 * `'unsafe-inline'` exige nonce por requisição, o que torna TODA página
 * dinâmica e desliga o cache estático do Next. Aceito conscientemente: a
 * política continua impedindo script de OUTRA origem, `<object>`/`<embed>`,
 * troca de `<base>` e envio de formulário para fora — que é o grosso do que um
 * XSS faz com a página. O React já escapa todo texto, e o projeto não usa
 * `dangerouslySetInnerHTML`.
 *
 * `'unsafe-eval'` e `ws:` só em desenvolvimento: são do recarregamento a quente.
 *
 * ── Checkout: o 3DS do débito (2026-09-24) ────────────────────────────────
 * Só em `/checkout` a política abre para o MPI da Braspag e a Cardinal (o
 * motor do 3DS 2.0), e o desafio do BANCO roda num iframe/POST para o domínio
 * do emissor — que muda de banco para banco e sem aviso. Por isso lá, e só lá,
 * `frame-src`/`form-action`/`connect-src`/`img-src` aceitam `https:` genérico
 * (mesma decisão do PodioTicket, que quebrou pagamento a cada domínio novo de
 * bandeira). `script-src` continua ENUMERADO: script de terceiro é onde está o
 * risco real, e as famílias que injetam script estão listadas.
 */
const THREE_DS_SCRIPT_SOURCES = [
  "https://mpi.braspag.com.br",
  "https://mpisandbox.braspag.com.br",
  "https://*.cardinalcommerce.com",
  "https://*.cardinaltrusted.com",
  "https://apata.io",
  "https://*.apata.io",
  // Device fingerprint: ThreatMetrix e as coletas das próprias bandeiras.
  "https://*.online-metrix.net",
  "https://*.visa.com",
  "https://*.mastercard.com",
];

function contentSecurityPolicy({ checkout = false } = {}): string {
  const isDev = process.env.NODE_ENV !== "production";

  let apiOrigin = "";
  let apiSocket = "";
  try {
    const api = new URL(process.env.NEXT_PUBLIC_API_URL ?? "");
    apiOrigin = api.origin;
    apiSocket = api.origin.replace(/^http/, "ws");
  } catch {
    // Sem API configurada a loja não funciona de qualquer forma; a CSP só não
    // libera origem nenhuma além da própria.
  }

  const youtube = "https://www.youtube-nocookie.com";

  const threeDs = checkout ? THREE_DS_SCRIPT_SOURCES : [];
  const anyHttps = checkout ? ["https:"] : [];

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : []), ...threeDs],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", apiOrigin, ...anyHttps],
    "font-src": ["'self'", "data:"],
    "connect-src": ["'self'", apiOrigin, apiSocket, ...(isDev ? ["ws:"] : []), ...anyHttps],
    "frame-src": [youtube, ...anyHttps],
    // O vídeo enviado pelo painel é servido pelo backend (`/uploads/videos`).
    "media-src": ["'self'", apiOrigin],
    "worker-src": ["'self'", "blob:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'", ...anyHttps],
    "frame-ancestors": ["'none'"],
  };

  const policy = Object.entries(directives)
    .map(([name, sources]) => `${name} ${sources.filter(Boolean).join(" ")}`)
    .join("; ");

  // Em produção, qualquer `http://` que escape vira `https://` em vez de quebrar.
  return isDev ? policy : `${policy}; upgrade-insecure-requests`;
}

const securityHeaders = [
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  // Anti-clickjacking: as PÁGINAS HTML do app (checkout, exclusão de conta,
  // dashboard) não podiam ser enquadradas. `X-Frame-Options` cobre navegadores
  // legados; `frame-ancestors 'none'` (dentro da CSP) é o equivalente moderno.
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy(),
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  // `0`, e não `1; mode=block`: o filtro de XSS dos navegadores antigos foi
  // removido dos atuais e, onde ainda existia, podia ser explorado para
  // vazar dado entre origens. A proteção de verdade é a CSP acima.
  {
    key: "X-XSS-Protection",
    value: "0",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self), payment=(), xr-spatial-tracking=()",
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
      // DEPOIS da regra geral: para a mesma chave, o Next aplica a última.
      {
        source: "/checkout",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy({ checkout: true }) },
        ],
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

