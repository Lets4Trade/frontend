"use client";

import * as Popover from "@radix-ui/react-popover";
import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { formatPrice } from "@/features/game/content";
import { ProductCardShell } from "@/features/game/ProductCardShell";
import { deleteProductAction } from "./actions";
import { productImage, type AdminProduct } from "./catalog";

/**
 * Card do produto na listagem do painel (Figma 3805:3364).
 *
 * É o MESMO card da vitrine — mesma arte, mesmo degradê, mesmo nome e preço nas
 * mesmas coordenadas (ver `ProductCardShell`). O que muda é a fileira de y=342:
 * no lugar do contador e do carrinho, dois botões de 50px com 15px de vão,
 * centrados.
 *
 * Client component por causa da confirmação de exclusão. O resto da listagem
 * continua no servidor.
 */
export function AdminProductCard({ product }: { product: AdminProduct }) {
  return (
    <ProductCardShell
      name={product.name}
      price={formatPrice(product.priceCents)}
      image={productImage(product.imageUrl)}
      actions={
        <div className="flex items-center justify-center gap-[15px]">
          <DeleteButton id={product.id} name={product.name} />

          <Link
            href={`/admin/produtos/${product.id}/editar`}
            aria-label={`Editar ${product.name}`}
            className="flex size-[50px] items-center justify-center rounded-[8px] border border-white/10 bg-[image:var(--brand-surface-fill)] transition-opacity hover:opacity-90"
          >
            <Image
              src="/icons/admin/pen.svg"
              alt=""
              width={22}
              height={22}
              aria-hidden
              className="size-[22px]"
            />
          </Link>
        </div>
      }
    />
  );
}

/**
 * A lixeira pede confirmação antes de excluir.
 *
 * Popover e não `window.confirm()`: o diálogo nativo é do sistema operacional,
 * ignora o tema do site e — mais importante — bloqueia a página inteira. O
 * Radix cuida do que é chato à mão (foco preso, Esc, clique fora, devolver o
 * foco ao botão) e já é a base de todo overlay do projeto.
 *
 * O botão fica a 50px do lápis, e os dois são iguais: sem a confirmação, um
 * clique um centímetro à esquerda apagaria um produto sem aviso.
 *
 * A exclusão é SUAVE — o backend marca `isActive = false`. O texto diz
 * "excluir" porque é o que a ação significa para quem administra: o produto sai
 * da loja. O que ele não faz é destruir o registro que os pedidos citam.
 */
function DeleteButton({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [isDeleting, startDelete] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function confirmDelete() {
    startDelete(async () => {
      const result = await deleteProductAction(id);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      // Sem `setOpen(false)`: o `revalidatePath` da action desmonta este card
      // junto com o popover. Fechar aqui só criaria um piscar antes disso.
      setError(null);
    });
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        aria-label={`Excluir ${name}`}
        className="flex size-[50px] items-center justify-center rounded-[8px] border border-white/10 bg-[image:var(--brand-surface-fill)] transition-opacity hover:opacity-90"
      >
        <Image
          src="/icons/admin/trash.svg"
          alt=""
          width={22}
          height={22}
          aria-hidden
          className="size-[22px]"
        />
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          side="top"
          sideOffset={8}
          className="brand-select-panel z-50 w-[260px] rounded-[20px] border border-brand-border bg-brand-surface p-[16px] shadow-[0_16px_40px_rgba(0,0,0,0.5)]"
        >
          <p className="font-helvetica text-[14px] leading-[20px] text-white">
            Excluir <span className="font-bold">{name}</span> da loja?
          </p>

          {error ? (
            <p role="alert" className="mt-2 font-helvetica text-[13px] text-red-9">
              {error}
            </p>
          ) : null}

          <div className="mt-[14px] flex gap-[10px]">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-[36px] flex-1 rounded-full border border-white/10 bg-[image:var(--brand-surface-fill)] font-poppins text-[13px] font-bold text-white transition-opacity hover:opacity-90"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              disabled={isDeleting}
              className="h-[36px] flex-1 rounded-full border border-white/15 bg-brand-orange font-poppins text-[13px] font-bold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDeleting ? "Excluindo…" : "Excluir"}
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
