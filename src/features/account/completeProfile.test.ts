import { describe, expect, it } from "vitest";
import { completeProfileSchema } from "./schema";

describe("completeProfileSchema (2026-10-28)", () => {
  it("aceita WhatsApp com DDD e qualquer uma das três opções de gênero", () => {
    for (const gender of ["MALE", "FEMALE", "UNDISCLOSED"]) {
      expect(completeProfileSchema.safeParse({ whatsapp: "(11) 91234-5678", gender }).success).toBe(true);
    }
  });

  it("recusa telefone vazio/curto e gênero não escolhido", () => {
    const result = completeProfileSchema.safeParse({ whatsapp: "1234", gender: "" });
    expect(result.success).toBe(false);
    const errors = result.success ? {} : result.error.flatten().fieldErrors;
    expect(errors.whatsapp?.[0]).toBe("Número inválido. Inclua DDD.");
    expect(errors.gender?.[0]).toBe("Escolha uma opção.");
  });
});
