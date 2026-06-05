"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import {
  updateCattyUserArtifactStatus,
  upsertCattyUserArtifact,
} from "@/lib/catty-user-artifacts";
import { isRole } from "@/lib/roles";
import type {
  CattyUserArtifactStatusUpdateInput,
  CattyUserArtifactUpsertInput,
} from "@/lib/validations/catty-artifacts";

export type CattyUserArtifactActionResult = {
  artifactId?: string;
  message: string;
  ok: boolean;
};

async function requireCattyArtifactSession() {
  const session = await auth();

  if (!session?.user?.id || !isRole(session.user.role)) {
    return null;
  }

  return session;
}

function revalidateCattyArtifacts() {
  revalidatePath("/ava/admin");
  revalidatePath("/ava/teacher");
  revalidatePath("/ava/student");
}

export async function saveCattyUserArtifact(
  input: CattyUserArtifactUpsertInput,
): Promise<CattyUserArtifactActionResult> {
  const session = await requireCattyArtifactSession();

  if (!session) {
    return {
      ok: false,
      message: "Entre no AVA para ajustar o estilo da Catty.",
    };
  }

  const result = await upsertCattyUserArtifact({
    ...input,
    actorRole: session.user.role,
    actorUserId: session.user.id,
  });

  if (result.ok) {
    revalidateCattyArtifacts();
  }

  return result;
}

export async function changeCattyUserArtifactStatus(
  input: CattyUserArtifactStatusUpdateInput,
): Promise<CattyUserArtifactActionResult> {
  const session = await requireCattyArtifactSession();

  if (!session) {
    return {
      ok: false,
      message: "Entre no AVA para alterar o estilo da Catty.",
    };
  }

  const result = await updateCattyUserArtifactStatus({
    ...input,
    actorRole: session.user.role,
    actorUserId: session.user.id,
  });

  if (result.ok) {
    revalidateCattyArtifacts();
  }

  return result;
}
