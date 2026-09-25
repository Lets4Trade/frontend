"use server";

import { revalidatePath } from "next/cache";
import { getSessionRole } from "@/features/auth/session";
import { apiDelete, apiGet, apiPatch } from "@/lib/serverApi";
import type { AdminUserDetail } from "./types";

/**
 * Ações do modal da linha de usuário.
 *
 * A conferência de papel aqui é a última, e a menos importante: o layout já
 * barrou a navegação e o `RolesGuard` vai barrar a chamada. Está em toda action
 * porque server action é um ENDEREÇO PÚBLICO — o Next expõe uma rota para cada
 * uma, e essa rota não passa pelo layout que protege a página.
 */

async function requireAdmin(): Promise<string | null> {
  const role = await getSessionRole();
  if (role === null) return "Sua sessão expirou. Entre de novo para continuar.";
  if (role !== "ADMIN") return "Sua conta não tem permissão para isso.";
  return null;
}

export type DetailResult =
  | { ok: true; user: AdminUserDetail }
  | { ok: false; message: string };

/**
 * Carrega os dados completos de UM usuário — o que o modal mostra.
 *
 * Buscado sob demanda, ao abrir o modal, e não junto da listagem: a lista
 * devolve sete campos de propósito, para não virar um dump da base. Os dados
 * completos saem um de cada vez, por um id específico.
 */
export async function getUserDetailAction(id: string): Promise<DetailResult> {
  const denied = await requireAdmin();
  if (denied) return { ok: false, message: denied };

  if (!isValidId(id)) return { ok: false, message: "Usuário inválido." };

  const response = await apiGet<AdminUserDetail>(`/admin/users/${encodeURIComponent(id)}`);
  if (!response.ok) {
    return {
      ok: false,
      message:
        response.status === 404
          ? "Este usuário não existe mais."
          : "Não conseguimos carregar os dados agora.",
    };
  }

  return { ok: true, user: response.data };
}

export type MutationResult = { ok: true } | { ok: false; message: string };

/** Campos que o modal edita. Credenciais NÃO estão aqui — ver `UpdateUserDto`. */
export type UserEdit = {
  name: string;
  whatsapp: string;
  discord: string;
  role: string;
  isActive: boolean;
};

export async function updateUserAction(
  id: string,
  edit: UserEdit,
): Promise<MutationResult> {
  const denied = await requireAdmin();
  if (denied) return { ok: false, message: denied };

  // Server action é endereço público: o corpo pode chegar em qualquer forma,
  // e um `.trim()` num campo que não é string viraria 500 em vez de recusa.
  if (
    !isValidId(id) ||
    typeof edit !== "object" ||
    edit === null ||
    typeof edit.name !== "string" ||
    typeof edit.whatsapp !== "string" ||
    typeof edit.discord !== "string" ||
    typeof edit.role !== "string" ||
    typeof edit.isActive !== "boolean"
  ) {
    return { ok: false, message: "Confira os campos e tente de novo." };
  }

  const name = edit.name.trim();
  if (name.length < 3) {
    return { ok: false, message: "O nome precisa ter ao menos 3 caracteres." };
  }
  // Espelha o `@Length(3, 30)` do `UpdateUserDto`: sem isto o backend recusava
  // e a tela mostrava o genérico "confira os campos", sem dizer qual.
  if (name.length > 30) {
    return { ok: false, message: "O nome pode ter no máximo 30 caracteres." };
  }

  const body: Record<string, unknown> = {
    name,
    // Vazio vira string vazia (o backend traduz para nulo), e não `undefined` —
    // que significaria "não mexa" e impediria LIMPAR um campo. Vale para os
    // dois: o `UpdateUserDto` aceita WhatsApp vazio desde 2026-09-25 — antes
    // recusava, e editar QUALQUER coisa de um usuário sem telefone voltava 400.
    whatsapp: edit.whatsapp.trim(),
    discord: edit.discord.trim(),
    role: edit.role,
    isActive: edit.isActive,
  };

  const response = await apiPatch<unknown>(`/admin/users/${encodeURIComponent(id)}`, body);

  if (!response.ok) {
    return { ok: false, message: mutationMessage(response.status) };
  }

  revalidatePath("/admin/usuarios");
  return { ok: true };
}

export async function deleteUserAction(id: string): Promise<MutationResult> {
  const denied = await requireAdmin();
  if (denied) return { ok: false, message: denied };
  if (!isValidId(id)) return { ok: false, message: "Usuário inválido." };

  const response = await apiDelete<unknown>(`/admin/users/${encodeURIComponent(id)}`);
  if (!response.ok) {
    return { ok: false, message: mutationMessage(response.status) };
  }

  revalidatePath("/admin/usuarios");
  return { ok: true };
}

/**
 * O id vai para o CAMINHO da URL. Sem conferir o formato, um `../orders` vindo
 * do cliente viraria outra rota do backend no `fetch` (que normaliza o
 * caminho) — com a sessão de admin de quem chamou.
 */
function isValidId(id: unknown): id is string {
  return typeof id === "string" && /^[A-Za-z0-9_-]{1,100}$/.test(id);
}

/**
 * O 403 daqui não é "sem permissão": quem chegou é admin. É uma das TRAVAS do
 * backend — mudar o próprio cargo, se desativar, ou derrubar o último admin
 * ativo. A mensagem precisa dizer isso, senão o admin fica olhando para um
 * "acesso negado" no próprio painel.
 *
 * O texto exato do backend não é repassado: ele pode ecoar o que foi enviado, e
 * texto do cliente renderizado de volta é como um payload chega à tela de quem
 * administra.
 */
function mutationMessage(status: number): string {
  if (status === 403) {
    return "Ação bloqueada: você não pode mudar o próprio cargo, se desativar, nem deixar a plataforma sem administrador ativo.";
  }
  if (status === 409) return "Este nome já está em uso por outra conta.";
  if (status === 400) return "Confira os campos e tente de novo.";
  if (status === 404) return "Este usuário não existe mais.";
  return "Não conseguimos salvar agora. Tente novamente em instantes.";
}
