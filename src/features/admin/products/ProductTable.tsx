"use client";

import * as Popover from "@radix-ui/react-popover";
import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { formatPrice } from "@/features/game/content";
import { ACTION_FAILED_MESSAGE, runAction } from "@/lib/safeAction";
import { deleteProductAction } from "./actions";
import { productImage, type AdminProduct } from "./catalog";

/**
 * A lista de Painel → Produtos (2026-10-01, "deixar clean"). Substituiu a grade
 * de cards da vitrine: no painel o que importa é ACHAR o produto, e o card
 * escondia justamente o que diferencia um do outro — o mesmo "Carry de Mapas
 * T15" aparecia quatro vezes, um por servidor, sem dizer qual era qual.
 *
 * Uma linha por produto: arte pequena, nome, jogo, aba, servidor, preço e as
 * duas ações. Abaixo de `md` jogo/aba/servidor vão para baixo do nome —
 * nenhuma coluna rola na horizontal.
 */
export function ProductTable({ products }: { products: AdminProduct[] }) {
  return (
    <div className="overflow-hidden rounded-[18px] border border-brand-border bg-[image:var(--brand-surface-fill)]">
      <table className="w-full table-fixed border-collapse text-left">
        <thead className="border-b border-white/10 font-poppins text-[12px] font-bold tracking-[0.04em] text-brand-fg-subtle uppercase">
          <tr>
            <th scope="col" className="py-[12px] pr-[12px] pl-[18px]">
              Produto
            </th>
            <th scope="col" className="hidden w-[170px] px-[12px] py-[12px] md:table-cell">
              Jogo
            </th>
            <th scope="col" className="hidden w-[150px] px-[12px] py-[12px] lg:table-cell">
              Aba
            </th>
            <th scope="col" className="hidden w-[180px] px-[12px] py-[12px] md:table-cell">
              Servidor
            </th>
            <th scope="col" className="w-[110px] px-[12px] py-[12px] text-right">
              Preço
            </th>
            <th scope="col" className="w-[110px] py-[12px] pr-[18px] pl-[12px] text-right">
              <span className="sr-only">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {products.map((product) => (
            <Row key={product.id} product={product} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Row({ product }: { product: AdminProduct }) {
  const image = productImage(product.imageUrl);
  const where = [product.game.name, product.tabLabel, product.server?.label].filter(Boolean).join(" · ");

  return (
    <tr className="transition-colors hover:bg-white/[0.03]">
      <td className="py-[10px] pr-[12px] pl-[18px]">
        <div className="flex min-w-0 items-center gap-[12px]">
          <span className="relative size-[44px] shrink-0 overflow-hidden rounded-[10px] border border-white/10 bg-[#2f2f2f]">
            {image ? <Image src={image.src} alt="" fill sizes="44px" className="object-cover" /> : null}
          </span>
          <span className="min-w-0">
            <Link
              href={`/admin/produtos/${product.id}/editar`}
              className="block truncate font-poppins text-[15px] font-semibold text-white hover:underline"
            >
              {product.name}
            </Link>
            {/* Telas estreitas: o que as colunas escondidas diriam. */}
            <span className="block truncate font-helvetica text-[12px] text-brand-fg-subtle md:hidden">{where}</span>
            {product.tabLabel ? (
              <span className="hidden truncate font-helvetica text-[12px] text-brand-fg-subtle md:block lg:hidden">
                {product.tabLabel}
              </span>
            ) : null}
          </span>
        </div>
      </td>
      <td className="hidden truncate px-[12px] font-helvetica text-[14px] text-white/80 md:table-cell">
        {product.game.name}
      </td>
      <td className="hidden truncate px-[12px] font-helvetica text-[14px] text-white/80 lg:table-cell">
        {product.tabLabel ?? "-"}
      </td>
      <td className="hidden truncate px-[12px] font-helvetica text-[14px] text-white/80 md:table-cell">
        {product.server?.label ?? "-"}
      </td>
      <td className="px-[12px] text-right font-poppins text-[14px] font-semibold whitespace-nowrap text-white">
        {formatPrice(product.priceCents)}
      </td>
      <td className="py-[10px] pr-[18px] pl-[12px]">
        <div className="flex items-center justify-end gap-[8px]">
          <Link
            href={`/admin/produtos/${product.id}/editar`}
            aria-label={`Editar ${product.name}`}
            className="flex size-[36px] items-center justify-center rounded-[10px] border border-white/10 transition-colors hover:bg-white/5"
          >
            <Image src="/icons/admin/pen.svg" alt="" width={16} height={16} aria-hidden className="size-[16px]" />
          </Link>
          <DeleteButton id={product.id} name={product.name} />
        </div>
      </td>
    </tr>
  );
}

/** Excluir com confirmação num popover (o produto sai da loja; pedidos antigos ficam). */
function DeleteButton({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [isDeleting, startDelete] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function confirmDelete() {
    startDelete(async () => {
      const result = await runAction(() => deleteProductAction(id), {
        ok: false,
        message: ACTION_FAILED_MESSAGE,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setError(null);
      setOpen(false);
    });
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        aria-label={`Excluir ${name}`}
        className="flex size-[36px] items-center justify-center rounded-[10px] border border-white/10 transition-colors hover:bg-white/5"
      >
        <Image src="/icons/admin/trash.svg" alt="" width={16} height={16} aria-hidden className="size-[16px]" />
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          side="left"
          sideOffset={8}
          className="brand-select-panel z-50 w-[260px] rounded-[20px] border border-brand-border bg-brand-surface p-[16px] shadow-[0_16px_40px_rgba(0,0,0,0.5)]"
        >
          <p className="font-helvetica text-[14px] leading-[20px] text-white">
            Excluir <span className="font-bold">{name}</span> da loja?
          </p>
          <p className="mt-[4px] font-helvetica text-[12px] text-brand-fg-subtle">
            Dá para reativar depois, na aba do jogo.
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
