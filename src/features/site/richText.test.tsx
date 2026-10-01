import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { domToRich } from "./editing/richDom";
import { RichText, escapeRich, joinAlign, parseInline, richToPlain, splitAlign } from "./richText";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe("parseInline", () => {
  it("negrito, itálico, destaque e link", () => {
    expect(parseInline("a **b** __c__ ==d== [e](/f)")).toEqual([
      "a ",
      { kind: "b", children: ["b"] },
      " ",
      { kind: "i", children: ["c"] },
      " ",
      { kind: "hl", children: ["d"] },
      " ",
      { kind: "a", href: "/f", text: "e" },
    ]);
  });

  it("aninha marcas diferentes", () => {
    expect(parseInline("==**__x__**==")).toEqual([
      { kind: "hl", children: [{ kind: "b", children: [{ kind: "i", children: ["x"] }] }] },
    ]);
  });

  it("marca sem fecho e escapes ficam literais", () => {
    expect(parseInline("5 ** 3")).toEqual(["5 ** 3"]);
    expect(parseInline("\\*\\*não\\*\\*")).toEqual(["**não**"]);
  });

  it("link perigoso vira texto sem destino", () => {
    // O destino termina no primeiro ")": sobra um ")" literal, e o link NÃO ganha href.
    expect(parseInline("[x](javascript:alert(1))")).toEqual([{ kind: "a", href: null, text: "x" }, ")"]);
    expect(parseInline("[x](//outro.site)")).toEqual([{ kind: "a", href: null, text: "x" }]);
  });
});

describe("alinhamento e texto puro", () => {
  it("prefixo de alinhamento", () => {
    expect(splitAlign("{:centro}Oi")).toEqual({ align: "center", text: "Oi" });
    expect(splitAlign("Oi")).toEqual({ align: null, text: "Oi" });
    expect(joinAlign("right", "Oi")).toBe("{:direita}Oi");
    expect(joinAlign(null, "Oi")).toBe("Oi");
    expect(joinAlign("center", "")).toBe("");
  });

  it("richToPlain tira as marcas", () => {
    expect(richToPlain("{:centro}**Muito prazer**, sou o ==Eddmax==! [vídeo](/x)")).toBe(
      "Muito prazer, sou o Eddmax! vídeo",
    );
    expect(richToPlain("+4000")).toBe("+4000");
  });
});

describe("RichText", () => {
  it("só gera elementos conhecidos — HTML no texto sai literal", () => {
    const { container } = render(<RichText value={'<img src=x onerror="alert(1)"> **ok**'} />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toBe('<img src=x onerror="alert(1)"> ok');
    expect(container.querySelector("strong")?.textContent).toBe("ok");
  });

  it("alinhamento vira bloco; sem alinhamento, fica inline", () => {
    const aligned = render(<RichText value="{:centro}Oi" />).container;
    expect(aligned.querySelector("[data-rich-align='center']")).toHaveClass("block", "text-center");
    const inline = render(<RichText value="Oi" />).container;
    expect(inline.innerHTML).toBe("Oi");
  });

  it("negrito dentro do destaque continua laranja (sem o branco do negrito)", () => {
    const inside = render(<RichText value="==**YouTube**==" />).container.querySelector("strong");
    expect(inside).not.toHaveClass("text-white");
    const outside = render(<RichText value="**Muito prazer**" />).container.querySelector("strong");
    expect(outside).toHaveClass("text-white");
  });

  it("link externo abre em nova aba com noopener", () => {
    const { container } = render(<RichText value="[site](https://exemplo.com)" />);
    const link = container.querySelector("a");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});

describe("ida e volta (guardado → tela → guardado)", () => {
  const roundTrip = (value: string) => {
    const { container } = render(<RichText value={value} />);
    return domToRich(container);
  };

  it.each([
    "Texto simples",
    "**Muito prazer, sou o Eddmax!** Quer saber se pode confiar?",
    "Linha 1\nLinha 2",
    "a **b __c__ d** ==e== [f](https://g.com)",
    "==**destaque em negrito**==",
    "preço 5\\*3 \\= 15 \\[sic\\]",
  ])("%s", (value) => {
    expect(roundTrip(value)).toBe(value);
    // Estável: salvar de novo não muda nada.
    expect(roundTrip(roundTrip(value))).toBe(value);
  });

  it("texto digitado com marcas vira literal escapado", () => {
    expect(escapeRich("a**b")).toBe("a\\*\\*b");
    expect(parseInline(escapeRich("a**b==c__d[e]"))).toEqual(["a**b==c__d[e]"]);
  });
});

describe("domToRich (o que o navegador produz ao editar)", () => {
  const html = (markup: string) => {
    const div = document.createElement("div");
    div.innerHTML = markup;
    return domToRich(div);
  };

  it("<b>/<i> do execCommand e aninhamento repetido", () => {
    expect(html("um <b>dois <b>três</b></b> <i>quatro</i>")).toBe("um **dois três** __quatro__");
  });

  it("negrito 'desligado' pelo navegador dentro de negrito", () => {
    expect(html('<strong>a<span style="font-weight: normal">b</span>c</strong>')).toBe("**a**b**c**");
  });

  it("vizinhos com marcas diferentes não ficam ambíguos", () => {
    const value = html("<b>a</b><i>b</i><b><i>c</i></b>");
    expect(value).toBe("**a**__b__**__c__**");
    expect(parseInline(value)).toEqual([
      { kind: "b", children: ["a"] },
      { kind: "i", children: ["b"] },
      { kind: "b", children: [{ kind: "i", children: ["c"] }] },
    ]);
  });

  it("qualquer outra tag/estilo vira texto; link perigoso perde o destino", () => {
    expect(html('<font color="red">x</font><script>y</script><a href="javascript:z">w</a>')).toBe("xyw");
  });

  it("<br> e <div> viram quebra de linha; marca não atravessa a linha", () => {
    expect(html("<b>a<br>b</b>")).toBe("**a**\n**b**");
    expect(html("um<div>dois</div>")).toBe("um\ndois");
  });
});
