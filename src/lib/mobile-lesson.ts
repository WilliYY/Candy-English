import { getPrisma } from "@/lib/prisma";

export type MobileStudentLesson = {
  description: string | null;
  homeworks: {
    dueDate: string | null;
    id: string;
    submissionStatus: "DRAFT" | "RETURNED" | "REVIEWED" | "SUBMITTED" | null;
    title: string;
  }[];
  id: string;
  materials: {
    content: string | null;
    id: string;
    title: string;
    type: "LINK" | "TEXT";
    url: string | null;
  }[];
  scheduledAt: string | null;
  teacherName: string;
  title: string;
  vocabularyItems: {
    example: string | null;
    id: string;
    term: string;
    translation: string;
  }[];
};

type MobileLessonResult = {
  data?: MobileStudentLesson;
  message: string;
  ok: boolean;
};

export function normalizeExternalMaterialUrl(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);

    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

export function getMobileStudentLessonScope(
  studentProfileId: string,
  lessonId?: string,
) {
  return {
    ...(lessonId ? { id: lessonId } : {}),
    status: "PUBLISHED" as const,
    studentProfileId,
  };
}

export async function getMobileStudentLesson(
  userId: string,
  lessonId: string,
): Promise<MobileLessonResult> {
  const profile = await getPrisma().studentProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!profile) {
    return { message: "Perfil de aluno não encontrado.", ok: false };
  }

  const lesson = await getPrisma().lesson.findFirst({
    where: getMobileStudentLessonScope(profile.id, lessonId),
    select: {
      description: true,
      homeworks: {
        where: { status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          dueDate: true,
          id: true,
          submissions: {
            where: { studentProfileId: profile.id },
            take: 1,
            select: { status: true },
          },
          title: true,
        },
      },
      id: true,
      materials: {
        orderBy: { sortOrder: "asc" },
        take: 100,
        select: {
          content: true,
          id: true,
          title: true,
          type: true,
          url: true,
        },
      },
      scheduledAt: true,
      teacherProfile: {
        select: { user: { select: { name: true } } },
      },
      title: true,
      vocabularyItems: {
        orderBy: { sortOrder: "asc" },
        take: 200,
        select: {
          example: true,
          id: true,
          term: true,
          translation: true,
        },
      },
    },
  });

  if (!lesson) {
    return { message: "Aula não encontrada ou indisponível.", ok: false };
  }

  return {
    data: {
      description: lesson.description,
      homeworks: lesson.homeworks.map((homework) => ({
        dueDate: homework.dueDate?.toISOString() ?? null,
        id: homework.id,
        submissionStatus: homework.submissions[0]?.status ?? null,
        title: homework.title,
      })),
      id: lesson.id,
      materials: lesson.materials.map((material) => ({
        content: material.content,
        id: material.id,
        title: material.title,
        type: material.type,
        url:
          material.type === "LINK"
            ? normalizeExternalMaterialUrl(material.url)
            : null,
      })),
      scheduledAt: lesson.scheduledAt?.toISOString() ?? null,
      teacherName: lesson.teacherProfile.user.name,
      title: lesson.title,
      vocabularyItems: lesson.vocabularyItems,
    },
    message: "Aula carregada.",
    ok: true,
  };
}
