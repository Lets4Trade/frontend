import { describe, expect, it } from "vitest";
import { youtubeEmbedUrl, youtubeId } from "./youtube";

/**
 * O link do vídeo vem de um campo do painel e termina num `<iframe>` na home.
 * Estes testes são a garantia de que só um ID de vídeo do YouTube atravessa —
 * nunca uma URL arbitrária.
 */
describe("youtubeId", () => {
  const ID = "dQw4w9WgXcQ";

  it.each([
    `https://www.youtube.com/watch?v=${ID}`,
    `https://youtube.com/watch?v=${ID}&t=42s`,
    `https://m.youtube.com/watch?v=${ID}`,
    `https://youtu.be/${ID}`,
    `https://youtu.be/${ID}?si=abc`,
    `https://www.youtube.com/shorts/${ID}`,
    `https://www.youtube.com/embed/${ID}`,
    `https://www.youtube.com/live/${ID}`,
    `  https://youtu.be/${ID}  `,
  ])("aceita %s", (url) => {
    expect(youtubeId(url)).toBe(ID);
  });

  it.each([
    ["vazio", ""],
    ["ausente", undefined],
    ["texto solto", "meu vídeo"],
    ["outro host", `https://vimeo.com/${ID}`],
    ["host parecido", `https://youtube.com.evil.example/watch?v=${ID}`],
    ["subdomínio forjado", `https://youtube.evil.example/watch?v=${ID}`],
    ["javascript:", `javascript:alert(1)//youtube.com/watch?v=${ID}`],
    ["data:", "data:text/html,<script>alert(1)</script>"],
    ["ID curto", "https://youtu.be/abc"],
    ["ID com caractere fora do alfabeto", "https://youtu.be/dQw4w9WgX<Q"],
    ["ID com barra injetada", `https://www.youtube.com/watch?v=${ID}/../../x`],
    ["canal, não vídeo", "https://www.youtube.com/@lets4trade"],
  ])("recusa %s", (_label, url) => {
    expect(youtubeId(url)).toBeUndefined();
  });

  it("monta o embed no host sem cookies, nunca a URL digitada", () => {
    expect(youtubeEmbedUrl(ID)).toBe(
      `https://www.youtube-nocookie.com/embed/${ID}?autoplay=1&rel=0`,
    );
  });
});
