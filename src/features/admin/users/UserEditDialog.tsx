"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import { cn } from "@/lib/cn";
import {
  deleteUserAction,
  getUserDetailAction,
  updateUserAction,
} from "./actions";
import {
  ROLE_OPTIONS,
  formatCents,
  formatDateTime,
  phoneOrDash,
  type AdminUser,
  type AdminUserDetail,
} from "./types";

const STATUS_OPTIONS = [
  { value: "true", label: "Funcional" },
  { value: "false", label: "Banida" },
] as const;

/**
 * Modal de edição do usuário — o lápis no fim da linha.
 *
 * ⚠️ NÃO ESTÁ NO FIGMA. O arquivo desenha a tabela sem nenhuma ação; o botão e
 * este modal foram pedidos depois. As decisões de comportamento estão aqui e no
 * `AdminUsersService`.
 *
 * ── Por que os dados são buscados AO ABRIR ──────────────────────────────────
 * A listagem devolve sete campos de propósito, para não virar um dump da base.
 * A ficha completa sai por `GET /admin/users/:id`, um usuário por vez — que é
 * uma ação deliberada do admin, e não efeito colateral de paginar. O custo é um
 * "carregando" de um instante ao abrir; o ganho é que percorrer a lista não
 * baixa e-mail e saldo de todo mundo.
 *
 * Como o token é cookie `httpOnly`, quem busca é uma server action, não o
 * navegador.
 *
 * ── O que dá para editar ────────────────────────────────────────────────────
 * Nome, WhatsApp, Discord, cargo e status. E-MAIL E SENHA NÃO: são credenciais,
 * e nem o dono da conta as troca sem confirmação neste projeto (ver
 * `UpdateMeDto`). Um admin trocando a credencial de terceiro sem confirmação
 * nenhuma seria um caminho pronto para tomar qualquer conta.
 *
 * Fidelidade e datas são só leitura — são derivadas de pedidos, e editá-las à
 * mão criaria saldo sem compra correspondente.
 */
export function UserEditDialog({ user }: { user: AdminUser }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      // Zera tudo ao fechar: reabrir noutra linha com a ficha anterior na tela
      // seria mostrar dados de OUTRA pessoa por um instante.
      setDetail(null);
      setLoadError(null);
      setFormError(null);
      setConfirmingDelete(false);
      return;
    }

    startTransition(async () => {
      const result = await getUserDetailAction(user.id);
      if (!result.ok) {
        setLoadError(result.message);
        return;
      }
      setDetail(result.user);
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail) return;

    const data = new FormData(event.currentTarget);
    setFormError(null);

    startTransition(async () => {
      const result = await updateUserAction(detail.id, {
        name: String(data.get("name") ?? ""),
        whatsapp: String(data.get("whatsapp") ?? ""),
        discord: String(data.get("discord") ?? ""),
        role: String(data.get("role") ?? detail.role),
        isActive: String(data.get("isActive") ?? "true") === "true",
      });

      if (!result.ok) {
        setFormError(result.message);
        return;
      }

      setOpen(false);
      // `revalidatePath` na action invalida o cache da rota; o `refresh` é o
      // que faz ESTA árvore re-renderizar com a linha já atualizada.
      router.refresh();
    });
  }

  function handleDelete() {
    if (!detail) return;
    setFormError(null);

    startTransition(async () => {
      const result = await deleteUserAction(detail.id);
      if (!result.ok) {
        setFormError(result.message);
        setConfirmingDelete(false);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger
        aria-label={`Editar ${user.name}`}
        className="flex size-[36px] items-center justify-center rounded-[8px] border border-white/10 bg-[image:var(--brand-surface-fill)] transition-opacity hover:opacity-90"
      >
        <Image
          src="/icons/admin/pen.svg"
          alt=""
          width={18}
          height={18}
          aria-hidden
          className="size-[18px]"
        />
      </Dialog.Trigger>

      <Dialog.Portal>
        {/* O overlay escurece e captura o clique fora; o Radix cuida do foco
            preso, do Esc e de devolver o foco ao lápis. */}
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px]" />

        <Dialog.Content
          className={cn(
            "fixed top-1/2 left-1/2 z-50 w-[760px] max-w-[calc(100vw-40px)]",
            "max-h-[calc(100vh-80px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto",
            "scrollbar-orange rounded-[30px] border border-brand-border bg-brand-surface p-[40px]",
            "shadow-[0_24px_60px_rgba(0,0,0,0.6)]",
          )}
        >
          <Dialog.Title className="font-helvetica text-[25px] leading-[24px] font-bold tracking-[0.25px] text-white">
            {user.name}
          </Dialog.Title>
          <Dialog.Description className="mt-[10px] font-helvetica text-[15px] text-brand-placeholder">
            Editar cadastro, cargo e status da conta.
          </Dialog.Description>

          {loadError ? (
            <p role="alert" className="mt-[24px] font-helvetica text-[15px] text-red-9">
              {loadError}
            </p>
          ) : detail === null ? (
            <p className="mt-[24px] font-helvetica text-[15px] text-brand-fg-muted">
              Carregando dados…
            </p>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="mt-[28px]">
              <div className="grid grid-cols-2 gap-x-[25px] gap-y-[22px]">
                <TextField
                  label="Nome"
                  name="name"
                  defaultValue={detail.username ?? detail.name}
                  autoComplete="off"
                  maxLength={30}
                />
                <TextField
                  label="WhatsApp"
                  name="whatsapp"
                  defaultValue={detail.whatsapp ?? ""}
                  placeholder="Sem telefone"
                  autoComplete="off"
                />
                <TextField
                  label="Discord"
                  name="discord"
                  defaultValue={detail.discordId ?? ""}
                  placeholder="Sem Discord"
                  autoComplete="off"
                  maxLength={64}
                />
                <SelectField
                  label="Cargo"
                  name="role"
                  defaultValue={detail.role}
                  options={ROLE_OPTIONS.map((option) => ({ ...option }))}
                />
                <SelectField
                  label="Status da conta"
                  name="isActive"
                  defaultValue={detail.isActive ? "true" : "false"}
                  options={STATUS_OPTIONS.map((option) => ({ ...option }))}
                />
              </div>

              <ReadOnlyPanel detail={detail} />

              {formError ? (
                <p role="alert" className="mt-[20px] font-helvetica text-[14px] text-red-9">
                  {formError}
                </p>
              ) : null}

              <div className="mt-[28px] flex items-center gap-[15px]">
                <Button type="submit" variant="primary" disabled={isPending} className="w-[200px] px-0">
                  {isPending ? "SALVANDO…" : "SALVAR"}
                </Button>

                <Dialog.Close asChild>
                  <Button variant="outline" className="w-[130px] px-0">
                    CANCELAR
                  </Button>
                </Dialog.Close>

                {/* Excluir fica à direita e separado dos outros dois: é a única
                    ação destrutiva do modal, e vizinha de "Salvar" ela vira um
                    clique errado. Vermelho e com confirmação em dois passos. */}
                <div className="ml-auto">
                  {confirmingDelete ? (
                    <div className="flex items-center gap-[10px]">
                      <span className="font-helvetica text-[14px] text-white">
                        Excluir esta conta?
                      </span>
                      <button
                        type="button"
                        onClick={() => setConfirmingDelete(false)}
                        className="h-[36px] rounded-full border border-white/10 bg-[image:var(--brand-surface-fill)] px-[16px] font-poppins text-[13px] font-bold text-white transition-opacity hover:opacity-90"
                      >
                        Não
                      </button>
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={isPending}
                        className="h-[36px] rounded-full border border-red-9/40 bg-[#350507] px-[16px] font-poppins text-[13px] font-bold text-[#ff2828] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isPending ? "Excluindo…" : "Sim, excluir"}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmingDelete(true)}
                      disabled={Boolean(detail.deletedAt)}
                      className="h-[50px] rounded-full border border-red-9/40 bg-[#350507] px-[24px] font-poppins text-[14px] font-bold text-[#ff2828] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {detail.deletedAt ? "CONTA EXCLUÍDA" : "EXCLUIR CONTA"}
                    </button>
                  )}
                </div>
              </div>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * O resto da ficha: o que existe sobre a pessoa e NÃO se edita por aqui.
 *
 * E-mail aparece porque o admin precisa saber com quem está falando — mas é
 * leitura: trocá-lo é fluxo com confirmação, não campo de formulário.
 */
function ReadOnlyPanel({ detail }: { detail: AdminUserDetail }) {
  const rows: { label: string; value: string }[] = [
    { label: "E-mail", value: detail.email },
    { label: "E-mail verificado", value: detail.emailVerified ? "Sim" : "Não" },
    { label: "Entra pelo Google", value: detail.hasGoogle ? "Sim" : "Não" },
    { label: "Autenticação em 2 fatores", value: detail.mfaEnabled ? "Ativa" : "Inativa" },
    { label: "Aceitou os termos", value: detail.acceptedTerms ? "Sim" : "Não" },
    { label: "Idioma", value: detail.language },
    { label: "Nível de fidelidade", value: detail.tier },
    { label: "Lets Coins", value: String(detail.letsCoins) },
    { label: "Pontos", value: String(detail.points) },
    { label: "Total gasto", value: formatCents(detail.totalSpentCents) },
    { label: "Total economizado", value: formatCents(detail.totalSavedCents) },
    { label: "Compras", value: String(detail.orderCount) },
    { label: "WhatsApp atual", value: phoneOrDash(detail.whatsapp) },
    { label: "Último acesso", value: formatDateTime(detail.lastLoginAt) },
    { label: "Criado em", value: formatDateTime(detail.createdAt) },
    { label: "Excluído em", value: formatDateTime(detail.deletedAt) },
  ];

  return (
    <section className="mt-[28px] rounded-[20px] border border-brand-hairline bg-[image:var(--brand-surface-fill)] p-[25px]">
      <h3 className="font-helvetica text-[16px] leading-none font-bold tracking-[0.16px] text-white">
        Dados da conta
      </h3>
      <p className="mt-[8px] font-helvetica text-[13px] text-brand-fg-subtle">
        Somente leitura. E-mail e senha têm fluxo próprio, com confirmação.
      </p>

      <dl className="mt-[20px] grid grid-cols-2 gap-x-[25px] gap-y-[12px]">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between gap-[10px]">
            <dt className="shrink-0 font-helvetica text-[14px] text-brand-fg-subtle">
              {row.label}
            </dt>
            <dd className="truncate font-helvetica text-[14px] text-white">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
