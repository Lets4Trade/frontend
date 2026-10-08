// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSessionRole } from "@/features/auth/session";
import { savePageAction } from "@/features/admin/builder/actions";
import { apiGet, apiPost } from "@/lib/serverApi";
import { duplicateServerAction, updateGameAction } from "./editActions";

vi.mock("@/features/auth/session", () => ({ getSessionRole: vi.fn() }));
vi.mock("@/lib/serverApi", () => ({ apiGet: vi.fn(), apiPost: vi.fn() }));
vi.mock("@/features/admin/builder/actions", () => ({ savePageAction: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const role = vi.mocked(getSessionRole);
const get = vi.mocked(apiGet);
const post = vi.mocked(apiPost);
const save = vi.mocked(savePageAction);

const CURRENT = {
  id: "g1",
  slug: "diablo",
  name: "Diablo",
  platforms: ["BATTLE_NET"],
  heading: "Compre gold",
  serversLabel: null,
  categoriesLabel: "Categorias",
  descriptionGroups: [{ title: "Sobre", items: [{ subtitle: "O que é?", text: "Texto da página" }] }],
  servers: [{ id: "s1", label: "Softcore", slug: "softcore", position: 0 }],
  categories: [
    { id: "c1", label: "Armas", slug: "armas", position: 0, parentId: null },
    { id: "c2", label: "Espadas", slug: "espadas", position: 0, parentId: "c1" },
    // De escopo (servidor + aba): NÃO pode voltar no PUT como global.
    { id: "c3", label: "Runas", slug: "runas", position: 1, parentId: null, serverId: "s1", tabId: "t1" },
  ],
  banners: [],
  sectionOrder: ["catalog", "faq"],
};

const INPUT = {
  name: "  Diablo IV ",
  slug: "diablo-4",
  servers: [{ id: "s1", label: "Softcore" }, { label: "Hardcore" }],
};

beforeEach(() => {
  vi.clearAllMocks();
  role.mockResolvedValue("ADMIN");
  get.mockResolvedValue({ ok: true, status: 200, data: CURRENT } as never);
  save.mockResolvedValue({ ok: true, data: CURRENT } as never);
});

describe("updateGameAction", () => {
  it("EDITOR → forbidden, sem ler nem gravar", async () => {
    role.mockResolvedValue("EDITOR");
    expect(await updateGameAction("g1", INPUT)).toEqual({ ok: false, reason: "forbidden" });
    expect(get).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });

  it("id com caminho → inválido, sem chamar a API", async () => {
    const result = await updateGameAction("../users", INPUT);
    expect(result.ok).toBe(false);
    expect(get).not.toHaveBeenCalled();
  });

  it("nome curto → inválido, sem gravar", async () => {
    const result = await updateGameAction("g1", { ...INPUT, name: "x" });
    expect(result).toMatchObject({ ok: false, reason: "invalid" });
    expect(save).not.toHaveBeenCalled();
  });

  it("troca só o cadastro e devolve a página do Builder como estava", async () => {
    await updateGameAction("g1", INPUT);
    expect(save).toHaveBeenCalledWith("g1", {
      name: "Diablo IV",
      slug: "diablo-4",
      servers: [{ id: "s1", label: "Softcore" }, { id: undefined, label: "Hardcore" }],
      heading: "Compre gold",
      serversLabel: "",
      categoriesLabel: "Categorias",
      // A descrição volta como estava: salvar o cadastro não pode apagá-la.
      descriptionGroups: [{ title: "Sobre", items: [{ subtitle: "O que é?", text: "Texto da página" }] }],
      categories: [{ id: "c1", label: "Armas", children: [{ id: "c2", label: "Espadas" }] }],
      // Omitir faria o backend gravar `[]` e perder a ordem do Builder.
      sectionOrder: ["catalog", "faq"],
    });
  });

  it("jogo sumido → mensagem de 404", async () => {
    get.mockResolvedValue({ ok: false, status: 404, reason: "error" } as never);
    expect(await updateGameAction("g1", INPUT)).toMatchObject({
      ok: false,
      message: "Este game já não existe.",
    });
    expect(save).not.toHaveBeenCalled();
  });
});

describe("duplicateServerAction", () => {
  const copy = { server: { id: "s9", label: "Softcore (cópia)", slug: "softcore-copia", position: 1 }, categories: 2, products: 30 };

  it("só ADMIN; ids com cara de caminho são recusados sem API", async () => {
    role.mockResolvedValue("EDITOR");
    expect(await duplicateServerAction("g1", "s1")).toEqual({ ok: false, reason: "forbidden" });
    role.mockResolvedValue("ADMIN");
    expect(await duplicateServerAction("g1", "../x")).toMatchObject({ ok: false, reason: "invalid" });
    expect(post).not.toHaveBeenCalled();
  });

  it("chama a rota do servidor e devolve a cópia", async () => {
    role.mockResolvedValue("ADMIN");
    post.mockResolvedValue({ ok: true, status: 201, data: copy } as never);
    expect(await duplicateServerAction("g1", "s1")).toEqual({ ok: true, data: copy });
    expect(post).toHaveBeenCalledWith("/admin/games/g1/servers/s1/duplicate", {});
  });

  it("teto (400) repassa a frase do backend; 500 não", async () => {
    role.mockResolvedValue("ADMIN");
    post.mockResolvedValue({ ok: false, status: 400, reason: "error", message: "O jogo já tem 50 servidores, o máximo." } as never);
    expect(await duplicateServerAction("g1", "s1")).toEqual({
      ok: false,
      reason: "invalid",
      message: "O jogo já tem 50 servidores, o máximo.",
    });
    post.mockResolvedValue({ ok: false, status: 500, reason: "error", message: "stack trace" } as never);
    expect(await duplicateServerAction("g1", "s1")).toEqual({ ok: false, reason: "error", message: undefined });
  });
});
