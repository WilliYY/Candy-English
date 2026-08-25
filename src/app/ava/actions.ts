"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { sendAuthorizedChatMessage } from "@/lib/chat-service";
import { getContractDocumentDeletionScope } from "@/lib/contract-documents";
import {
  getLiveClassJitsiOrigin,
  LIVE_CLASS_MAINTENANCE_ENABLED,
  LIVE_CLASS_MAINTENANCE_MESSAGE,
} from "@/lib/live-class";
import { persistOwnProfile } from "@/lib/profile-service";
import { getPrisma } from "@/lib/prisma";
import { isRole, type Role } from "@/lib/roles";
import { deleteContractPdf, saveContractPdf } from "@/lib/storage";
import {
  createLiveSessionSchema,
  deleteContractSchema,
  sendChatMessageSchema,
  toggleLiveSessionSchema,
  updateStudentLevelSchema,
  updateProfileSchema,
  uploadContractSchema,
  type CreateLiveSessionInput,
  type DeleteContractInput,
  type SendChatMessageInput,
  type ToggleLiveSessionInput,
  type UpdateStudentLevelInput,
  type UpdateProfileInput,
  type UploadContractInput,
} from "@/lib/validations/ava-operations";

type ActionResult<TInput extends Record<string, unknown>> = {
  errors?: Partial<Record<keyof TInput, string>>;
  message: string;
  ok: boolean;
};

type Actor = {
  email: string;
  role: Role;
  userId: string;
};

function fieldErrors<TInput extends Record<string, unknown>>(
  issues: { message: string; path: PropertyKey[] }[],
) {
  return issues.reduce<Partial<Record<keyof TInput, string>>>(
    (accumulator, issue) => {
      const fieldName = issue.path[0];

      if (typeof fieldName === "string") {
        accumulator[fieldName as keyof TInput] = issue.message;
      }

      return accumulator;
    },
    {},
  );
}

async function getActor(): Promise<Actor | null> {
  const session = await auth();

  if (!session?.user?.id || !session.user.email || !isRole(session.user.role)) {
    return null;
  }

  return {
    email: session.user.email,
    role: session.user.role,
    userId: session.user.id,
  };
}

async function getTeacherActor(actor: Actor) {
  if (actor.role === "ADMIN") {
    return {
      isAdmin: true,
      teacherProfileId: null,
    };
  }

  if (actor.role !== "TEACHER") {
    return null;
  }

  const prisma = getPrisma();
  const teacherProfile = await prisma.teacherProfile.findUnique({
    where: { userId: actor.userId },
    select: { id: true },
  });

  if (!teacherProfile) {
    return null;
  }

  return {
    isAdmin: false,
    teacherProfileId: teacherProfile.id,
  };
}

async function teacherCanAccessStudent(
  teacherProfileId: string,
  studentProfileId: string,
) {
  const prisma = getPrisma();
  const assignment = await prisma.studentTeacherAssignment.findUnique({
    where: {
      teacherProfileId_studentProfileId: {
        studentProfileId,
        teacherProfileId,
      },
    },
    select: { id: true },
  });

  return Boolean(assignment);
}

function createJitsiMeetUrl(title: string) {
  const slug = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  const suffix = randomBytes(6).toString("hex");

  return `${getLiveClassJitsiOrigin()}/CandyEnglish-${slug || "aula"}-${suffix}`;
}

export async function updateMyProfile(
  input: UpdateProfileInput,
): Promise<ActionResult<UpdateProfileInput>> {
  const actor = await getActor();

  if (!actor) {
    return {
      ok: false,
      message: "Entre no AVA para atualizar seu perfil.",
    };
  }

  const parsed = updateProfileSchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: fieldErrors<UpdateProfileInput>(parsed.error.issues),
      ok: false,
      message: "Revise os dados do perfil.",
    };
  }

  await persistOwnProfile(actor, parsed.data);

  revalidatePath("/ava/student");
  revalidatePath("/ava/teacher");
  revalidatePath("/ava/admin");

  return {
    ok: true,
    message: "Perfil atualizado com sucesso.",
  };
}

export async function createLiveSession(
  input: CreateLiveSessionInput,
): Promise<ActionResult<CreateLiveSessionInput>> {
  const actor = await getActor();

  if (!actor) {
    return {
      ok: false,
      message: "Entre no AVA para abrir aula ao vivo.",
    };
  }

  const teacherActor = await getTeacherActor(actor);

  if (!teacherActor) {
    return {
      ok: false,
      message: "Voce nao tem permissao para abrir aula ao vivo.",
    };
  }

  if (LIVE_CLASS_MAINTENANCE_ENABLED) {
    return {
      ok: false,
      message: LIVE_CLASS_MAINTENANCE_MESSAGE,
    };
  }

  const parsed = createLiveSessionSchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: fieldErrors<CreateLiveSessionInput>(parsed.error.issues),
      ok: false,
      message: "Revise os dados da aula ao vivo.",
    };
  }

  const prisma = getPrisma();
  const data = parsed.data;
  const teacherProfileId = teacherActor.isAdmin
    ? data.teacherProfileId
    : teacherActor.teacherProfileId;

  if (!teacherProfileId || teacherProfileId !== data.teacherProfileId) {
    return {
      ok: false,
      message: "Teacher invalida para esta aula ao vivo.",
    };
  }

  if (data.studentProfileId && !teacherActor.isAdmin) {
    const canAccess = await teacherCanAccessStudent(
      teacherProfileId,
      data.studentProfileId,
    );

    if (!canAccess) {
      return {
        errors: {
          studentProfileId: "Aluno nao esta vinculado a sua area teacher.",
        },
        ok: false,
        message: "Voce so pode abrir aula para alunos vinculados a voce.",
      };
    }
  }

  await prisma.liveSession.create({
    data: {
      endsAt: data.endsAt,
      meetUrl: data.meetUrl ?? createJitsiMeetUrl(data.title),
      startsAt: data.startsAt,
      studentProfileId: data.studentProfileId,
      teacherProfileId,
      title: data.title,
    },
  });

  revalidatePath("/ava/teacher");
  revalidatePath("/ava/student");
  revalidatePath("/ava/admin");

  return {
    ok: true,
    message: "Aula ao vivo aberta com sucesso.",
  };
}

export async function toggleLiveSession(
  input: ToggleLiveSessionInput,
): Promise<ActionResult<ToggleLiveSessionInput>> {
  const actor = await getActor();

  if (!actor) {
    return {
      ok: false,
      message: "Entre no AVA para alterar aula ao vivo.",
    };
  }

  const teacherActor = await getTeacherActor(actor);

  if (!teacherActor) {
    return {
      ok: false,
      message: "Voce nao tem permissao para alterar aula ao vivo.",
    };
  }

  if (LIVE_CLASS_MAINTENANCE_ENABLED) {
    return {
      ok: false,
      message: LIVE_CLASS_MAINTENANCE_MESSAGE,
    };
  }

  const parsed = toggleLiveSessionSchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: fieldErrors<ToggleLiveSessionInput>(parsed.error.issues),
      ok: false,
      message: "Revise a aula ao vivo.",
    };
  }

  const prisma = getPrisma();
  const liveSession = await prisma.liveSession.findUnique({
    where: { id: parsed.data.liveSessionId },
    select: { id: true, teacherProfileId: true },
  });

  if (!liveSession) {
    return {
      ok: false,
      message: "Aula ao vivo nao encontrada.",
    };
  }

  if (
    !teacherActor.isAdmin &&
    liveSession.teacherProfileId !== teacherActor.teacherProfileId
  ) {
    return {
      ok: false,
      message: "Voce so pode alterar suas aulas ao vivo.",
    };
  }

  await prisma.liveSession.update({
    where: { id: liveSession.id },
    data: { isLive: parsed.data.isLive },
  });

  revalidatePath("/ava/teacher");
  revalidatePath("/ava/student");
  revalidatePath("/ava/admin");

  return {
    ok: true,
    message: parsed.data.isLive
      ? "Aula ao vivo reaberta."
      : "Aula ao vivo encerrada.",
  };
}

export async function updateStudentLevel(
  input: UpdateStudentLevelInput,
): Promise<ActionResult<UpdateStudentLevelInput>> {
  const actor = await getActor();

  if (!actor) {
    return {
      ok: false,
      message: "Entre no AVA para atualizar o nivel.",
    };
  }

  const teacherActor = await getTeacherActor(actor);

  if (!teacherActor) {
    return {
      ok: false,
      message: "Voce nao tem permissao para atualizar nivel de aluno.",
    };
  }

  const parsed = updateStudentLevelSchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: fieldErrors<UpdateStudentLevelInput>(parsed.error.issues),
      ok: false,
      message: "Revise o nivel do aluno.",
    };
  }

  const prisma = getPrisma();
  const { level, studentProfileId } = parsed.data;

  if (!teacherActor.isAdmin) {
    const teacherProfileId = teacherActor.teacherProfileId;

    if (!teacherProfileId) {
      return {
        ok: false,
        message: "Teacher invalida para atualizar nivel.",
      };
    }

    const canAccess = await teacherCanAccessStudent(
      teacherProfileId,
      studentProfileId,
    );

    if (!canAccess) {
      return {
        ok: false,
        message: "Voce so pode alterar alunos vinculados a sua teacher.",
      };
    }
  }

  await prisma.studentProfile.update({
    where: { id: studentProfileId },
    data: { level },
  });

  revalidatePath("/ava/teacher");
  revalidatePath("/ava/student");
  revalidatePath("/ava/admin");

  return {
    ok: true,
    message: "Nivel atualizado.",
  };
}

export async function uploadContractDocument(formData: FormData) {
  const actor = await getActor();

  if (!actor || (actor.role !== "ADMIN" && actor.role !== "TEACHER")) {
    return {
      ok: false,
      message: "Voce nao tem permissao para enviar contratos.",
    };
  }

  const studentProfileValue = formData.get("studentProfileId");
  const titleValue = formData.get("title");
  const parsed = uploadContractSchema.safeParse({
    studentProfileId:
      typeof studentProfileValue === "string" ? studentProfileValue : "",
    title: typeof titleValue === "string" ? titleValue : "",
  } satisfies UploadContractInput);

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Revise o contrato.",
    };
  }

  const file = formData.get("contract");

  if (!(file instanceof File)) {
    return {
      ok: false,
      message: "Selecione um PDF para enviar.",
    };
  }

  const prisma = getPrisma();

  if (parsed.data.studentProfileId && actor.role === "TEACHER") {
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: actor.userId },
      select: { id: true },
    });

    if (
      !teacherProfile ||
      !(await teacherCanAccessStudent(
        teacherProfile.id,
        parsed.data.studentProfileId,
      ))
    ) {
      return {
        ok: false,
        message: "Voce so pode enviar contrato para alunos vinculados a voce.",
      };
    }
  }

  try {
    const saved = await saveContractPdf(file);

    await prisma.contractDocument.create({
      data: {
        fileName: saved.originalName,
        mimeType: saved.mimeType,
        sizeBytes: saved.sizeBytes,
        storagePath: saved.relativePath,
        studentProfileId: parsed.data.studentProfileId,
        title: parsed.data.title,
        uploadedByUserId: actor.userId,
      },
    });
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Nao foi possivel enviar o contrato.",
    };
  }

  revalidatePath("/ava/teacher");
  revalidatePath("/ava/student");
  revalidatePath("/ava/admin");

  return {
    ok: true,
    message: "Contrato enviado com sucesso.",
  };
}

export async function deleteContractDocument(
  input: DeleteContractInput,
): Promise<ActionResult<DeleteContractInput>> {
  const actor = await getActor();

  if (!actor || (actor.role !== "ADMIN" && actor.role !== "TEACHER")) {
    return {
      ok: false,
      message: "Voce nao tem permissao para excluir contratos.",
    };
  }

  const parsed = deleteContractSchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: fieldErrors<DeleteContractInput>(parsed.error.issues),
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Contrato invalido.",
    };
  }

  const deletionScope = getContractDocumentDeletionScope(
    { id: actor.userId, role: actor.role },
    parsed.data.contractId,
  );

  if (!deletionScope) {
    return {
      ok: false,
      message: "Voce nao tem permissao para excluir este contrato.",
    };
  }

  const prisma = getPrisma();
  const contract = await prisma.contractDocument.findFirst({
    where: deletionScope,
    select: {
      id: true,
      storagePath: true,
    },
  });

  if (!contract) {
    return {
      ok: false,
      message: "Contrato nao encontrado ou sem permissao para exclusao.",
    };
  }

  const deletion = await prisma.contractDocument.deleteMany({
    where: deletionScope,
  });

  if (deletion.count !== 1) {
    return {
      ok: false,
      message: "O contrato ja foi excluido ou o vinculo foi alterado.",
    };
  }

  let cleanupWarning = false;

  try {
    await deleteContractPdf(contract.storagePath);
  } catch {
    cleanupWarning = true;
    console.error("Falha ao limpar o arquivo de um contrato excluido.", {
      contractId: contract.id,
    });
  }

  revalidatePath("/ava/teacher");
  revalidatePath("/ava/student");
  revalidatePath("/ava/admin");

  return {
    ok: true,
    message: cleanupWarning
      ? "Contrato excluido. O arquivo residual precisa de revisao tecnica."
      : "Contrato excluido com sucesso.",
  };
}

export async function sendChatMessage(
  input: SendChatMessageInput,
): Promise<ActionResult<SendChatMessageInput>> {
  const actor = await getActor();

  if (!actor) {
    return {
      ok: false,
      message: "Entre no AVA para enviar mensagens.",
    };
  }

  const parsed = sendChatMessageSchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: fieldErrors<SendChatMessageInput>(parsed.error.issues),
      ok: false,
      message: "Revise a mensagem.",
    };
  }

  const { body, studentProfileId, teacherProfileId } = parsed.data;
  const result = await sendAuthorizedChatMessage(
    { role: actor.role, userId: actor.userId },
    { body, studentProfileId, teacherProfileId },
  );

  if (!result.ok) {
    return result;
  }

  revalidatePath("/ava/teacher");
  revalidatePath("/ava/student");
  revalidatePath("/ava/admin");

  return {
    ok: true,
    message: result.message,
  };
}
