"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import {
  approveCattyArtifactEnrichment,
  requestCattyArtifactEnrichment,
  updateCattyArtifactEnrichmentStatus,
} from "@/lib/catty-artifact-enrichment";
import {
  updateCattyUserArtifactStatus,
  upsertCattyUserArtifact,
} from "@/lib/catty-user-artifacts";
import { isRole } from "@/lib/roles";
import type {
  CattyArtifactEnrichmentRequestInput,
  CattyArtifactEnrichmentReviewInput,
  CattyArtifactEnrichmentStatusUpdateInput,
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

export async function enrichCattyArtifactTheme(
  input: CattyArtifactEnrichmentRequestInput,
): Promise<CattyUserArtifactActionResult & { enrichmentId?: string }> {
  const session = await requireCattyArtifactSession();

  if (!session) {
    return {
      ok: false,
      message: "Entre no AVA para enriquecer o estilo da Catty.",
    };
  }

  const result = await requestCattyArtifactEnrichment({
    ...input,
    actorRole: session.user.role,
    actorUserId: session.user.id,
  });

  if (result.ok) {
    revalidateCattyArtifacts();
  }

  return result;
}

export async function approveCattyArtifactSuggestion(
  input: CattyArtifactEnrichmentReviewInput,
): Promise<CattyUserArtifactActionResult> {
  const session = await requireCattyArtifactSession();

  if (!session) {
    return {
      ok: false,
      message: "Entre no AVA para aprovar sugestao da Catty.",
    };
  }

  const result = await approveCattyArtifactEnrichment({
    ...input,
    actorRole: session.user.role,
    actorUserId: session.user.id,
  });

  if (result.ok) {
    revalidateCattyArtifacts();
  }

  return result;
}

export async function changeCattyArtifactEnrichmentStatus(
  input: CattyArtifactEnrichmentStatusUpdateInput,
): Promise<CattyUserArtifactActionResult> {
  const session = await requireCattyArtifactSession();

  if (!session) {
    return {
      ok: false,
      message: "Entre no AVA para revisar sugestao da Catty.",
    };
  }

  const result = await updateCattyArtifactEnrichmentStatus({
    ...input,
    actorRole: session.user.role,
    actorUserId: session.user.id,
  });

  if (result.ok) {
    revalidateCattyArtifacts();
  }

  return result;
}
