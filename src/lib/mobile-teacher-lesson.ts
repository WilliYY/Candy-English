import type { Prisma } from "@/generated/prisma/client";
import { normalizeExternalMaterialUrl } from "@/lib/mobile-lesson";
import { getPrisma } from "@/lib/prisma";

const teacherLessonSelect = {
  description: true,
  homeworks: {
    orderBy: { createdAt: "desc" },
    select: {
      dueDate: true,
      id: true,
      status: true,
      title: true,
    },
    take: 100,
  },
  id: true,
  materials: {
    orderBy: { sortOrder: "asc" },
    select: {
      content: true,
      id: true,
      title: true,
      type: true,
      url: true,
    },
    take: 100,
  },
  scheduledAt: true,
  status: true,
  studentProfile: {
    select: { user: { select: { name: true } } },
  },
  teacherProfile: {
    select: { user: { select: { name: true } } },
  },
  title: true,
  vocabularyItems: {
    orderBy: { sortOrder: "asc" },
    select: {
      example: true,
      id: true,
      term: true,
      translation: true,
    },
    take: 200,
  },
} satisfies Prisma.LessonSelect;

type TeacherLessonRow = Prisma.LessonGetPayload<{
  select: typeof teacherLessonSelect;
}>;

export type MobileTeacherLessonStore = Pick<
  ReturnType<typeof getPrisma>,
  "lesson" | "teacherProfile"
>;

type MobileTeacherLessonOptions = {
  store?: MobileTeacherLessonStore;
};

export type MobileTeacherLesson = {
  description: string | null;
  homeworks: {
    dueDate: string | null;
    id: string;
    status: "ARCHIVED" | "DRAFT" | "PUBLISHED";
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
  status: "ARCHIVED" | "DRAFT" | "PUBLISHED";
  studentName: string | null;
  teacherName: string;
  title: string;
  vocabularyItems: {
    example: string | null;
    id: string;
    term: string;
    translation: string;
  }[];
};

type MobileTeacherLessonResult = {
  data?: MobileTeacherLesson;
  message: string;
  ok: boolean;
};

function toMobileTeacherLesson(lesson: TeacherLessonRow): MobileTeacherLesson {
  return {
    description: lesson.description,
    homeworks: lesson.homeworks.map((homework) => ({
      dueDate: homework.dueDate?.toISOString() ?? null,
      id: homework.id,
      status: homework.status,
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
    status: lesson.status,
    studentName: lesson.studentProfile?.user.name ?? null,
    teacherName: lesson.teacherProfile.user.name,
    title: lesson.title,
    vocabularyItems: lesson.vocabularyItems,
  };
}

export async function getMobileTeacherLesson(
  userId: string,
  lessonId: string,
  options: MobileTeacherLessonOptions = {},
): Promise<MobileTeacherLessonResult> {
  const store = options.store ?? getPrisma();
  const profile = await store.teacherProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!profile) {
    return { message: "Perfil de teacher não encontrado.", ok: false };
  }

  const lesson = await store.lesson.findFirst({
    where: {
      id: lessonId,
      teacherProfileId: profile.id,
    },
    select: teacherLessonSelect,
  });

  if (!lesson) {
    return { message: "Aula não encontrada ou indisponível.", ok: false };
  }

  return {
    data: toMobileTeacherLesson(lesson),
    message: "Aula da teacher carregada.",
    ok: true,
  };
}
