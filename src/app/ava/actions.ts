"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { isRole, type Role } from "@/lib/roles";
import { saveAvatarImage, saveContractPdf } from "@/lib/storage";
import {
  createLiveSessionSchema,
  sendChatMessageSchema,
  toggleLiveSessionSchema,
  updateProfileSchema,
  uploadContractSchema,
  type CreateLiveSessionInput,
  type SendChatMessageInput,
  type ToggleLiveSessionInput,
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

  const prisma = getPrisma();
  const {
    address,
    birthDate,
    guardianDocument,
    level,
    motherName,
    motherPhone,
    name,
    notes,
    phone,
    studentPhone,
    studentPhoneAlt,
  } = parsed.data;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: actor.userId },
      data: {
        address,
        name,
        phone,
      },
    });

    if (actor.role === "STUDENT") {
      await tx.studentProfile.upsert({
        where: { userId: actor.userId },
        create: {
          birthDate,
          guardianDocument,
          level,
          motherName,
          motherPhone,
          notes,
          studentPhone,
          studentPhoneAlt,
          userId: actor.userId,
        },
        update: {
          birthDate,
          guardianDocument,
          level,
          motherName,
          motherPhone,
          notes,
          studentPhone,
          studentPhoneAlt,
        },
      });
    }
  });

  revalidatePath("/ava/student");
  revalidatePath("/ava/teacher");
  revalidatePath("/ava/admin");

  return {
    ok: true,
    message: "Perfil atualizado com sucesso.",
  };
}

export async function uploadMyAvatar(formData: FormData) {
  const actor = await getActor();

  if (!actor) {
    return {
      ok: false,
      message: "Entre no AVA para atualizar sua foto.",
    };
  }

  const file = formData.get("avatar");

  if (!(file instanceof File)) {
    return {
      ok: false,
      message: "Selecione uma imagem para enviar.",
    };
  }

  try {
    const avatar = await saveAvatarImage(file);
    const prisma = getPrisma();

    await prisma.user.update({
      where: { id: actor.userId },
      data: {
        avatarMimeType: avatar.mimeType,
        avatarPath: avatar.relativePath,
      },
    });
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Nao foi possivel enviar a foto.",
    };
  }

  revalidatePath("/ava/student");
  revalidatePath("/ava/teacher");
  revalidatePath("/ava/admin");

  return {
    ok: true,
    message: "Foto atualizada com sucesso.",
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
      meetUrl: data.meetUrl,
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

  const prisma = getPrisma();
  const { body, studentProfileId, teacherProfileId } = parsed.data;
  const assignment = await prisma.studentTeacherAssignment.findUnique({
    where: {
      teacherProfileId_studentProfileId: {
        studentProfileId,
        teacherProfileId,
      },
    },
    select: { id: true },
  });

  if (!assignment) {
    return {
      ok: false,
      message:
        "Vincule este aluno a esta teacher antes de iniciar a conversa.",
    };
  }

  if (actor.role === "TEACHER") {
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: actor.userId },
      select: { id: true },
    });

    if (!teacherProfile || teacherProfile.id !== teacherProfileId) {
      return {
        ok: false,
        message: "Voce so pode enviar mensagens como sua propria teacher.",
      };
    }
  }

  if (actor.role === "STUDENT") {
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: actor.userId },
      select: { id: true },
    });

    if (!studentProfile || studentProfile.id !== studentProfileId) {
      return {
        ok: false,
        message: "Voce so pode enviar mensagens do seu proprio perfil.",
      };
    }
  }

  if (actor.role !== "ADMIN" && actor.role !== "TEACHER" && actor.role !== "STUDENT") {
    return {
      ok: false,
      message: "Voce nao tem permissao para enviar mensagens.",
    };
  }

  const thread = await prisma.chatThread.upsert({
    where: {
      teacherProfileId_studentProfileId: {
        studentProfileId,
        teacherProfileId,
      },
    },
    create: {
      studentProfileId,
      teacherProfileId,
    },
    update: {
      updatedAt: new Date(),
    },
    select: { id: true },
  });

  await prisma.chatMessage.create({
    data: {
      body,
      senderUserId: actor.userId,
      threadId: thread.id,
    },
  });

  revalidatePath("/ava/teacher");
  revalidatePath("/ava/student");
  revalidatePath("/ava/admin");

  return {
    ok: true,
    message: "Mensagem enviada.",
  };
}
