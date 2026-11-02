import { describe, expect, it } from "vitest";
import { fromSectionDrafts, toSectionDrafts } from "./ServiceSectionsEditor";
import type { TabSection } from "./types";

describe("toSectionDrafts / fromSectionDrafts", () => {
  // 2026-11-02: o interceptor do backend apaga texto vazio da resposta — a
  // descrição só com texto chega SEM `title`, e o editor do produto quebrava.
  it("seção sem título (apagado pela API) abre e salva sem perder o texto", () => {
    const fromApi = [{ items: [], body: "- Bancada do Armeiro\n- Itens" }] as unknown as TabSection[];

    const drafts = toSectionDrafts(fromApi);
    expect(drafts[0]).toMatchObject({ title: "", body: "- Bancada do Armeiro\n- Itens", marker: "dot" });

    expect(fromSectionDrafts(drafts)).toEqual([
      { title: "", items: [], body: "- Bancada do Armeiro\n- Itens" },
    ]);
  });

  it("seção sem itens também abre", () => {
    const fromApi = [{ title: "Como funciona", body: "Texto" }] as unknown as TabSection[];
    expect(toSectionDrafts(fromApi)[0]).toMatchObject({ title: "Como funciona", body: "Texto" });
  });
});
