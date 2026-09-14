"use client";

import { Toaster, toast } from "react-hot-toast";

/**
 * Os avisos efêmeros do painel.
 *
 * ── Por que toast e não um bloco na página ─────────────────────────────────
 * As telas do painel vinham mostrando "Página publicada", "Sessão salva" e os
 * erros de salvamento como um parágrafo empurrando o conteúdo para baixo. Isso
 * custa espaço permanente por uma informação que dura três segundos — e, pior,
 * MOVE o que a pessoa estava olhando no instante em que ela terminou uma ação.
 *
 * `react-hot-toast` já era dependência do projeto e ninguém a usava (o
 * `ToasterWrapper` saiu no enxugamento). Não é dependência nova.
 *
 * ── O que continua sendo bloco na página ───────────────────────────────────
 * CONDIÇÃO não é EVENTO. "A lista de produtos está escondida" e "escolha ao
 * menos uma categoria" descrevem o estado atual do formulário e precisam ficar
 * visíveis enquanto durarem — um toast que some deixaria a pessoa sem saber por
 * que o botão não salva. Toast é para o que aconteceu, não para o que é.
 */

/**
 * Monta a área de toasts. Vai no layout do painel, uma vez só.
 *
 * `aria-live` é responsabilidade da biblioteca: ela já renderiza a região com
 * `role="status"`, então um leitor de tela anuncia o aviso sem que ele roube o
 * foco de quem está no meio de um formulário.
 */
export function AdminToaster() {
  return (
    <Toaster
      position="bottom-right"
      // 4s para erro e 3s para sucesso: erro costuma pedir uma segunda leitura,
      // e sucesso é confirmação de algo que a pessoa acabou de fazer.
      toastOptions={{
        duration: 3000,
        error: { duration: 4000 },
        // A moldura é a MESMA das superfícies flutuantes do site (menu da conta,
        // select): raio 20, `brand-surface`, borda e sombra. Duas aparências
        // diferentes para a mesma ideia é o começo de um tema inconsistente.
        style: {
          borderRadius: "20px",
          background: "var(--brand-surface)",
          border: "1px solid var(--brand-border)",
          boxShadow: "0 16px 40px rgba(0,0,0,.5)",
          color: "var(--brand-fg)",
          fontFamily: "var(--font-poppins), system-ui, sans-serif",
          fontSize: "14px",
          maxWidth: "420px",
          padding: "14px 18px",
        },
        success: { iconTheme: { primary: "var(--brand-rating)", secondary: "#000" } },
      }}
    />
  );
}

/** Confirmação de algo que acabou de dar certo. */
export function toastOk(message: string) {
  toast.success(message);
}

/**
 * Falha de uma ação.
 *
 * A mensagem do backend chega aqui como TEXTO — nunca como HTML. É a mesma
 * regra do resto do painel: o corpo de erro vem de outro serviço e pode ecoar
 * algo que um cliente digitou.
 */
export function toastError(message: string) {
  toast.error(message);
}
