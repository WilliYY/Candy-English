"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import {
  updateCattyUserMemoryStatus,
  updateCattyUserMemoryValue,
  upsertCattyUserMemory,
} from "@/lib/catty-user-memory";
import { isRole } from "@/lib/roles";
import type {
  CattyUserMemoryStatusUpdateInput,
  CattyUserMemoryUpsertInput,
  CattyUserMemoryValueUpdateInput,
} from "@/lib/validations/catty-user-memory";

export type CattyUserMemoryActionResult = {
  memoryId?: string;
  message: string;
  ok: boolean;
};

async function requireCattyMemorySession() {
  const session = await auth();

  if (!session?.user?.id || !isRole(session.user.role)) {
    return null;
  }

  return session;
}

function revalidateCattyMemory() {
  revalidatePath("/ava/admin");
  revalidatePath("/ava/teacher");
  revalidatePath("/ava/student");
}

export async function saveCattyUserMemory(
  input: CattyUserMemoryUpsertInput,
): Promise<CattyUserMemoryActionResult> {
  const session = await requireCattyMemorySession();

  if (!session) {
    return {
      ok: false,
      message: "Entre no AVA para ajustar memoria pessoal da Catty.",
    };
  }

  const result = await upsertCattyUserMemory({
    ...input,
    actorRole: session.user.role,
    actorUserId: session.user.id,
  });

  if (result.ok) {
    revalidateCattyMemory();
  }

  return result;
}

export async function changeCattyUserMemoryStatus(
  input: CattyUserMemoryStatusUpdateInput,
): Promise<CattyUserMemoryActionResult> {
  const session = await requireCattyMemorySession();

  if (!session) {
    return {
      ok: false,
      message: "Entre no AVA para alterar memoria pessoal da Catty.",
    };
  }

  const result = await updateCattyUserMemoryStatus({
    ...input,
    actorRole: session.user.role,
    actorUserId: session.user.id,
  });

  if (result.ok) {
    revalidateCattyMemory();
  }

  return result;
}

export async function correctCattyUserMemory(
  input: CattyUserMemoryValueUpdateInput,
): Promise<CattyUserMemoryActionResult> {
  const session = await requireCattyMemorySession();

  if (!session) {
    return {
      ok: false,
      message: "Entre no AVA para corrigir memoria pessoal da Catty.",
    };
  }

  const result = await updateCattyUserMemoryValue({
    ...input,
    actorRole: session.user.role,
    actorUserId: session.user.id,
  });

  if (result.ok) {
    revalidateCattyMemory();
  }

  return result;
}
