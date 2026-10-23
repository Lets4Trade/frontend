import Image from "next/image";
import type { Purchase } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

/** Pago = a cobrança passou; antes disso (ou cancelado) não há o que comprovar. */
const PAID: ReadonlySet<Purchase["status"]> = new Set(["aprovado", "em_andamento", "entregue"]);

/**
 * Os dois comprovantes na tela do pedido (2026-10-23, pedido do usuário):
 *
 *   - PAGAMENTO: o mesmo recibo que o painel baixa, agora também para o dono
 *     (`GET /orders/:ref/receipt`, só depois de pago). Até aqui o botão "VER
 *     COMPROVANTE" existia desativado.
 *   - ENTREGA: os prints que a equipe enviou pelo painel. PRIVADOS: `<img>`
 *     direto na rota do backend com login — o cookie de sessão viaja por ser
 *     same-site, e o backend confere que o pedido é desta conta. `next/image`
 *     não serve: o otimizador busca do servidor do Next, sem o cookie.
 *
 * Links para o backend (outra origem) e não `<Link>`: o recibo é um download.
 */
export function OrderProofs({ purchase }: { purchase: Purchase }) {
  const ref = encodeURIComponent(purchase.reference);
  const paid = PAID.has(purchase.status) && API_URL !== "";
  const proofs = purchase.deliveryProofs;

  return (
    <div className="mt-[40px] flex flex-col gap-[16px] lg:mt-[60px]">
      {paid ? (
        <a
          href={`${API_URL}/orders/${ref}/receipt`}
          className="brand-ring flex h-[60px] w-full items-center gap-[16px] rounded-full sm:gap-[25px] bg-[image:var(--brand-surface-fill)] px-[25px] text-left transition-opacity hover:opacity-90"
        >
          <ProofRowContent label="COMPROVANTE DE PAGAMENTO" />
        </a>
      ) : (
        <div
          aria-disabled
          title="Disponível depois que o pagamento for aprovado"
          className="brand-ring flex h-[60px] w-full cursor-not-allowed items-center gap-[16px] rounded-full sm:gap-[25px] bg-[image:var(--brand-surface-fill)] px-[25px] opacity-60"
        >
          <ProofRowContent label="COMPROVANTE DE PAGAMENTO" />
        </div>
      )}

      {proofs.length > 0 ? (
        <section aria-labelledby="delivery-proofs-title" className="rounded-[24px] border border-white/15 p-[18px]">
          <h3 id="delivery-proofs-title" className="font-poppins text-[16px] font-bold tracking-[0.16px] text-white">
            COMPROVANTE DE ENTREGA
          </h3>
          <p className="mt-[4px] font-helvetica text-[13px] text-brand-fg-subtle">
            Enviado pela equipe. Toque na imagem para ver em tamanho real.
          </p>
          <ul className="mt-[12px] grid grid-cols-2 gap-[10px] sm:grid-cols-3">
            {proofs.map((proof, index) => {
              const url = `${API_URL}/orders/${ref}/delivery-proofs/${encodeURIComponent(proof.id)}/file`;
              return (
                <li key={proof.id}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="block overflow-hidden rounded-[14px] border border-white/10 transition-opacity hover:opacity-90"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- imagem privada, ver o topo */}
                    <img
                      src={url}
                      alt={`Comprovante de entrega ${index + 1}`}
                      loading="lazy"
                      className="h-[110px] w-full bg-black/30 object-cover"
                    />
                  </a>
                  <p className="mt-[4px] font-helvetica text-[11px] text-brand-fg-subtle">{proof.date}</p>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function ProofRowContent({ label }: { label: string }) {
  return (
    <>
      <Image src="/icons/order/bill.svg" alt="" width={22} height={22} aria-hidden className="size-[22px] shrink-0" />
      <span className="flex-1 truncate font-poppins text-[14px] font-bold tracking-[0.16px] text-white sm:text-[16px]">{label}</span>
      <Image
        src="/icons/order/arrow.svg"
        alt=""
        width={18}
        height={18}
        aria-hidden
        className="size-[18px] shrink-0 -rotate-90"
      />
    </>
  );
}
