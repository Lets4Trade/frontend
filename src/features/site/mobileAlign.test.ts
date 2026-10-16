import { describe, expect, it } from "vitest";
import { MOBILE_ALIGN_EXTRA, mobileAlignField, mobileAlignOf } from "./mobileAlign";

const extra = (values: Record<string, string>) => (name: string, fallback: string) => values[name] || fallback;

describe("alinhamento no celular (2026-10-15)", () => {
  it("padrão centralizado; só 'esquerda' alinha à esquerda; lixo cai no padrão", () => {
    expect(mobileAlignOf(extra({}))).toBe("center");
    expect(mobileAlignOf(extra({ [MOBILE_ALIGN_EXTRA]: "esquerda" }))).toBe("left");
    expect(mobileAlignOf(extra({ [MOBILE_ALIGN_EXTRA]: "<script>" }))).toBe("center");
  });

  it("campo do painel: nome aceito pelo backend e padrão entre as opções", () => {
    const field = mobileAlignField();
    expect(field.name).toMatch(/^[a-z][a-z0-9-]{0,39}$/);
    expect(field.options?.map((option) => option.value)).toContain(field.defaultValue);
  });
});
