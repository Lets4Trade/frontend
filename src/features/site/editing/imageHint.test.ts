import { describe, expect, it } from "vitest";
import { imageHintFor } from "./imageHint";

describe("imageHintFor", () => {
  it("arte da sessão usa o imageHint do catálogo", () => {
    expect(imageHintFor({ editImage: "home:video" })).toContain("1146×609");
  });

  it("arte de item usa os rótulos da lista (image e secondaryImage)", () => {
    expect(imageHintFor({ editItem: "home:guias|g1|image" })).toContain("834×876");
    expect(imageHintFor({ editItem: "home:guias|g1|secondaryImage" })).toContain("180×116");
  });

  it("banner do hero e foto do CEO têm texto próprio", () => {
    expect(imageHintFor({ editItem: "home:hero-banner|b1|image" })).toContain("859×643");
    expect(imageHintFor({ editAdd: "home:hero-banner|imagem do banner" })).toContain("859×643");
    expect(imageHintFor({ editImage: "home:video", editSlot: "secondary" })).toContain("120×120");
  });

  it("texto não ganha dica", () => {
    expect(imageHintFor({ editItem: "home:guias|g1|title" })).toBeNull();
    expect(imageHintFor({})).toBeNull();
  });
});
