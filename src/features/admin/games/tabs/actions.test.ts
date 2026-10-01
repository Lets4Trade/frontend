// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { getSessionRole } from "@/features/auth/session";
import { apiDelete, apiGet, apiPatch, apiPost, apiPut, apiPutFormData } from "@/lib/serverApi";
import { apiFail, apiOk, bigImage, formEntries, smallImage } from "@/test/actionFixtures";
import {
  createTabAction,
  deleteTabAction,
  listGameTabsAction,
  reorderTabsAction,
  saveTabCategoriesAction,
  updateTabAction,
  uploadTabIconAction,
} from "./actions";

vi.mock("@/features/auth/session", () => ({ getSessionRole: vi.fn() }));
vi.mock("@/lib/serverApi", () => ({
  apiDelete: vi.fn(),
  apiGet: vi.fn(),
  apiPatch: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiPutFormData: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), updateTag: vi.fn() }));

const role = vi.mocked(getSessionRole);
const get = vi.mocked(apiGet);
const post = vi.mocked(apiPost);
const patch = vi.mocked(apiPatch);
const put = vi.mocked(apiPut);
const putForm = vi.mocked(apiPutFormData);
const del = vi.mocked(apiDelete);

const TAB = {
  id: "t1",
  slug: "boosting",
  label: "Boosting",
  iconUrl: null,
  layout: "SERVICE",
  linkHref: null,
  content: null,
  position: 0,
  isActive: true,
  productCount: 0,
};

function iconForm(file: File | null) {
  const form = new FormData();
  if (file) form.set("image", file);
  form.set("extra", "injetado");
  return form;
}

beforeEach(() => {
  vi.clearAllMocks();
  role.mockResolvedValue("ADMIN");
  get.mockResolvedValue(apiOk([{ ...TAB, id: "t2", position: 1 }, TAB]));
  post.mockResolvedValue(apiOk(TAB));
  patch.mockResolvedValue(apiOk(TAB));
  put.mockResolvedValue(apiOk([TAB]));
  putForm.mockResolvedValue(apiOk({ iconUrl: "/uploads/tabs/x.webp" }));
  del.mockResolvedValue(apiOk({ id: "t1" }));
});

describe("guarda de papel", () => {
  const calls = [
    ["listGameTabsAction", () => listGameTabsAction("g1")],
    ["createTabAction", () => createTabAction("g1", { label: "X", layout: "CATALOG" })],
    ["updateTabAction", () => updateTabAction("g1", "t1", { label: "X" })],
    ["reorderTabsAction", () => reorderTabsAction("g1", ["t1"])],
    ["uploadTabIconAction", () => uploadTabIconAction("g1", "t1", iconForm(smallImage()))],
    ["deleteTabAction", () => deleteTabAction("g1", "t1")],
    ["saveTabCategoriesAction", () => saveTabCategoriesAction("g1", "t1", null, [])],
  ] as const;

  it.each(calls)("%s: EDITOR → forbidden, sem API", async (_n, call) => {
    role.mockResolvedValue("EDITOR");
    expect(await call()).toEqual({ ok: false, reason: "forbidden" });
    for (const fn of [get, post, patch, put, putForm, del]) expect(fn).not.toHaveBeenCalled();
  });

  it.each(calls)("%s: sem sessão → unauthenticated", async (_n, call) => {
    role.mockResolvedValue(null);
    expect(await call()).toEqual({ ok: false, reason: "unauthenticated" });
  });
});

describe("ids no caminho", () => {
  it.each([
    ["jogo com ../", () => createTabAction("../users", { label: "X", layout: "CATALOG" })],
    ["aba com /", () => updateTabAction("g1", "a/b", { label: "X" })],
    ["aba vazia", () => deleteTabAction("g1", "")],
    ["servidor com ?", () => saveTabCategoriesAction("g1", "t1", "s1?x=1", [])],
    ["ordem com id ruim", () => reorderTabsAction("g1", ["t1", "../x"])],
  ])("%s → invalid, sem API", async (_l, call) => {
    expect(await call()).toMatchObject({ ok: false, reason: "invalid" });
    for (const fn of [get, post, patch, put, putForm, del]) expect(fn).not.toHaveBeenCalled();
  });
});

describe("listGameTabsAction", () => {
  it("devolve por posição", async () => {
    const result = await listGameTabsAction("g1");
    expect(get).toHaveBeenCalledWith("/admin/games/g1/tabs");
    expect(result.ok && result.data.map((tab) => tab.id)).toEqual(["t1", "t2"]);
  });
});

describe("createTabAction", () => {
  it.each([
    ["nome vazio", { label: "  ", layout: "CATALOG" }],
    ["nome longo", { label: "x".repeat(61), layout: "CATALOG" }],
    ["slug com maiúscula", { label: "X", layout: "CATALOG", slug: "Abc" }],
    ["LINK sem endereço", { label: "X", layout: "LINK" }],
    ["LINK javascript:", { label: "X", layout: "LINK", linkHref: "javascript:alert(1)" }],
    ["LINK //externo", { label: "X", layout: "LINK", linkHref: "//evil.com" }],
    ["LINK http://", { label: "X", layout: "LINK", linkHref: "http://evil.com" }],
    ["CATALOG com link", { label: "X", layout: "CATALOG", linkHref: "/venda" }],
    ["CATALOG com textos", { label: "X", layout: "CATALOG", content: { sections: [] } }],
    ["layout inventado", { label: "X", layout: "HTML" }],
    [
      "11 seções",
      { label: "X", layout: "SERVICE", content: { sections: Array.from({ length: 11 }, () => ({ title: "t", items: [] })) } },
    ],
    [
      "item de 301",
      { label: "X", layout: "SERVICE", content: { sections: [{ title: "t", items: ["x".repeat(301)] }] } },
    ],
  ])("%s → invalid, sem API", async (_l, input) => {
    expect(await createTabAction("g1", input as never)).toMatchObject({ ok: false, reason: "invalid" });
    expect(post).not.toHaveBeenCalled();
  });

  it("LINK: remonta o corpo (campo extra não viaja) e revalida a vitrine", async () => {
    await createTabAction("g1", {
      label: " Venda ",
      layout: "LINK",
      linkHref: "/venda",
      evil: "x",
    } as never);
    expect(post).toHaveBeenCalledWith("/admin/games/g1/tabs", {
      label: "Venda",
      layout: "LINK",
      linkHref: "/venda",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/games/[slug]", "page");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/jogos", "layout");
  });

  it("SERVICE: leva slug e textos", async () => {
    await createTabAction("g1", {
      label: "Boosting",
      slug: "boost",
      layout: "SERVICE",
      content: { sections: [{ title: " Como funciona ", items: [" a ", "b"] }] },
    });
    expect(post).toHaveBeenCalledWith("/admin/games/g1/tabs", {
      label: "Boosting",
      slug: "boost",
      layout: "SERVICE",
      content: { sections: [{ title: "Como funciona", items: ["a", "b"] }] },
    });
  });

  it("409 (endereço repetido) repassa a mensagem do backend", async () => {
    post.mockResolvedValue(apiFail(409, "Já existe uma aba com esse endereço."));
    expect(await createTabAction("g1", { label: "X", layout: "CATALOG" })).toEqual({
      ok: false,
      reason: "invalid",
      message: "Já existe uma aba com esse endereço.",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("updateTabAction", () => {
  it("manda só o que veio; null limpa", async () => {
    await updateTabAction("g1", "t1", { isActive: false, linkHref: null });
    expect(patch).toHaveBeenCalledWith("/admin/games/g1/tabs/t1", { isActive: false, linkHref: null });
  });

  it("corpo vazio → invalid", async () => {
    expect(await updateTabAction("g1", "t1", {})).toMatchObject({ ok: false, reason: "invalid" });
    expect(patch).not.toHaveBeenCalled();
  });

  it("500 vira erro genérico (sem mensagem do backend)", async () => {
    patch.mockResolvedValue(apiFail(500, "stack trace"));
    expect(await updateTabAction("g1", "t1", { label: "Y" })).toEqual({ ok: false, reason: "error" });
  });
});

describe("reorderTabsAction", () => {
  it("ids repetidos → invalid", async () => {
    expect(await reorderTabsAction("g1", ["t1", "t1"])).toMatchObject({ ok: false });
    expect(put).not.toHaveBeenCalled();
  });

  it("PUT order com a lista", async () => {
    await reorderTabsAction("g1", ["t2", "t1"]);
    expect(put).toHaveBeenCalledWith("/admin/games/g1/tabs/order", { ids: ["t2", "t1"] });
  });
});

describe("uploadTabIconAction", () => {
  it("sem arquivo / acima de 5 MB / SVG → invalid, sem API", async () => {
    expect(await uploadTabIconAction("g1", "t1", iconForm(null))).toMatchObject({ ok: false });
    expect(await uploadTabIconAction("g1", "t1", iconForm(bigImage()))).toMatchObject({
      message: "A imagem precisa ter no máximo 5 MB.",
    });
    const svg = new File(["<svg/>"], "x.svg", { type: "image/svg+xml" });
    expect(await uploadTabIconAction("g1", "t1", iconForm(svg))).toMatchObject({ ok: false });
    expect(putForm).not.toHaveBeenCalled();
  });

  it("manda só `image` no PUT icon", async () => {
    const result = await uploadTabIconAction("g1", "t1", iconForm(smallImage()));
    expect(result).toEqual({ ok: true, data: { iconUrl: "/uploads/tabs/x.webp" } });
    const [path, body] = putForm.mock.calls[0];
    expect(path).toBe("/admin/games/g1/tabs/t1/icon");
    expect(Object.keys(formEntries(body))).toEqual(["image"]);
  });
});

describe("deleteTabAction", () => {
  it("409 mostra a mensagem do backend", async () => {
    del.mockResolvedValue(apiFail(409, "Há 3 produtos ativos nesta aba."));
    expect(await deleteTabAction("g1", "t1")).toEqual({
      ok: false,
      reason: "invalid",
      message: "Há 3 produtos ativos nesta aba.",
    });
  });

  it("409 sem mensagem cai no texto nosso", async () => {
    del.mockResolvedValue(apiFail(409));
    expect(await deleteTabAction("g1", "t1")).toMatchObject({
      message: expect.stringContaining("produtos ativos"),
    });
  });

  it("caminho feliz", async () => {
    expect(await deleteTabAction("g1", "t1")).toEqual({ ok: true, data: { id: "t1" } });
    expect(del).toHaveBeenCalledWith("/admin/games/g1/tabs/t1");
  });
});

describe("saveTabCategoriesAction", () => {
  it("limpa como o Builder e manda o escopo", async () => {
    await saveTabCategoriesAction("g1", "t1", "s1", [
      { id: "c1", label: " Armas ", key: "k", children: [{ label: "Espadas", key: "k2" }, { label: " " }] },
      { label: "" },
    ]);
    expect(put).toHaveBeenCalledWith("/admin/games/g1/tabs/t1/categories", {
      serverId: "s1",
      categories: [{ id: "c1", label: "Armas", children: [{ id: undefined, label: "Espadas" }] }],
    });
  });

  it("todos os servidores = serverId null", async () => {
    await saveTabCategoriesAction("g1", "t1", null, []);
    expect(put).toHaveBeenCalledWith("/admin/games/g1/tabs/t1/categories", { serverId: null, categories: [] });
  });

  it("pai sem nome com filhas → invalid", async () => {
    const result = await saveTabCategoriesAction("g1", "t1", null, [{ label: "", children: [{ label: "x" }] }]);
    expect(result).toMatchObject({ ok: false, reason: "invalid" });
    expect(put).not.toHaveBeenCalled();
  });

  it("400 (categoria com produto) repassa a contagem", async () => {
    put.mockResolvedValue(apiFail(400, "2 produtos ainda estão ligados a categorias removidas."));
    expect(await saveTabCategoriesAction("g1", "t1", null, [])).toMatchObject({
      ok: false,
      message: "2 produtos ainda estão ligados a categorias removidas.",
    });
  });
});

describe("layouts v2 (QUANTITY, PACKAGES, SELL)", () => {
  it.each(["QUANTITY", "PACKAGES", "SELL"] as const)("%s é aceito no cadastro", async (layout) => {
    expect(await createTabAction("g1", { label: "X", layout })).toMatchObject({ ok: true });
    expect(post).toHaveBeenCalledWith("/admin/games/g1/tabs", { label: "X", layout });
  });

  it.each(["QUANTITY", "PACKAGES"] as const)("%s leva os textos da esquerda", async (layout) => {
    await createTabAction("g1", {
      label: "Gold",
      layout,
      content: { sections: [{ title: " Sobre ", items: [" a "] }] },
    });
    expect(post).toHaveBeenCalledWith("/admin/games/g1/tabs", {
      label: "Gold",
      layout,
      content: { sections: [{ title: "Sobre", items: ["a"] }] },
    });
  });

  it.each([
    ["SELL com textos", { label: "X", layout: "SELL", content: { sections: [] } }],
    ["SELL com link", { label: "X", layout: "SELL", linkHref: "/venda" }],
    ["QUANTITY com link", { label: "X", layout: "QUANTITY", linkHref: "/venda" }],
  ])("%s → invalid, sem API", async (_l, input) => {
    expect(await createTabAction("g1", input as never)).toMatchObject({ ok: false, reason: "invalid" });
    expect(post).not.toHaveBeenCalled();
  });

  it("troca de layout viaja no PATCH com a limpeza junto", async () => {
    await updateTabAction("g1", "t1", { layout: "SELL", linkHref: null, content: null });
    expect(patch).toHaveBeenCalledWith("/admin/games/g1/tabs/t1", {
      layout: "SELL",
      linkHref: null,
      content: null,
    });
  });

  it.each([
    ["layout inventado", { layout: "HTML" }],
    ["virar LINK limpando o link", { layout: "LINK", linkHref: null }],
    ["virar CATALOG com textos", { layout: "CATALOG", content: { sections: [] } }],
    ["virar SELL com link", { layout: "SELL", linkHref: "/venda" }],
  ])("PATCH %s → invalid, sem API", async (_l, input) => {
    expect(await updateTabAction("g1", "t1", input as never)).toMatchObject({ ok: false, reason: "invalid" });
    expect(patch).not.toHaveBeenCalled();
  });

  it("backend recusa virar LINK com produtos: a mensagem dele chega à tela", async () => {
    patch.mockResolvedValue(apiFail(400, "Esta aba tem 3 produtos. Mova-os antes de trocar o layout."));
    expect(await updateTabAction("g1", "t1", { layout: "LINK", linkHref: "/venda" })).toEqual({
      ok: false,
      reason: "invalid",
      message: "Esta aba tem 3 produtos. Mova-os antes de trocar o layout.",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
