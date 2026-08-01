import {
  updateCattyUserArtifactStatus,
  upsertCattyUserArtifact,
} from "@/lib/catty-user-artifacts";
import { getPrisma } from "@/lib/prisma";
import {
  cattyLearningCreateSchema,
  type CattyLearningCategoryInput,
} from "@/lib/validations/catty-learning";
import {
  cattyUserArtifactStatusUpdateSchema,
  cattyUserArtifactUpsertSchema,
  type CattyUserArtifactStatusUpdateInput,
  type CattyUserArtifactUpsertInput,
} from "@/lib/validations/catty-artifacts";

const MAX_MOBILE_TEACHER_CATTY_STUDENTS = 100;
const MAX_MOBILE_TEACHER_CATTY_ARTIFACTS = 100;
const MAX_MOBILE_TEACHER_CATTY_LEARNINGS = 50;

export const MOBILE_TEACHER_CATTY_LEARNING_CATEGORIES = [
  "IDEAL_REPLY",
  "BAD_REPLY",
  "VOCABULARY",
  "COMMON_QUESTION",
  "HOMEWORK_EXAMPLE",
  "TEACHER_GUIDANCE",
  "STUDENT_GUIDANCE",
  "CATTY_PHRASE",
  "APPROVED_CORRECTION",
] as const satisfies readonly CattyLearningCategoryInput[];

const mobileTeacherCategorySet = new Set<CattyLearningCategoryInput>(
  MOBILE_TEACHER_CATTY_LEARNING_CATEGORIES,
);
type MobileTeacherCattyLearningCategory =
  (typeof MOBILE_TEACHER_CATTY_LEARNING_CATEGORIES)[number];

export type MobileTeacherCattyStore = Pick<
  ReturnType<typeof getPrisma>,
  | "cattyLearningItem"
  | "cattyUserArtifact"
  | "studentTeacherAssignment"
  | "teacherProfile"
>;

type MobileTeacherCattyOptions = {
  store?: MobileTeacherCattyStore;
  updateArtifact?: typeof updateCattyUserArtifactStatus;
  upsertArtifact?: typeof upsertCattyUserArtifact;
};

export type MobileTeacherCattyManagement = {
  approvedLearningCount: number;
  artifacts: Array<{
    catchphrases: string[];
    emojis: string[];
    example: string | null;
    id: string;
    isPrimary: boolean;
    label: string;
    sounds: string[];
    status: "ACTIVE" | "PENDING" | "DISABLED" | "ARCHIVED";
    studentId: string;
    themeId: string;
    toneRule: string | null;
    updatedAt: string;
  }>;
  learningCategories: typeof MOBILE_TEACHER_CATTY_LEARNING_CATEGORIES;
  learningItems: Array<{
    badReply: string | null;
    category: MobileTeacherCattyLearningCategory;
    createdAt: string;
    id: string;
    idealReply: string | null;
    intent: string | null;
    notes: string | null;
    status: "PENDING" | "APPROVED" | "REJECTED" | "ARCHIVED";
    tags: string[];
    title: string;
    updatedAt: string;
    userPrompt: string | null;
  }>;
  students: Array<{
    id: string;
    name: string;
  }>;
  themeOptions: Array<{
    catchphrases: string[];
    emojis: string[];
    id: string;
    label: string;
    sounds: string[];
  }>;
};

export type MobileTeacherCattyMutationResult =
  | { message: string; ok: true }
  | {
      code:
        | "CATEGORY_FORBIDDEN"
        | "INVALID_INPUT"
        | "TARGET_FORBIDDEN"
        | "TEACHER_PROFILE_UNAVAILABLE";
      message: string;
      ok: false;
    };

function cleanName(name: string | null) {
  return name?.trim() || "Aluno Candy";
}

export async function getMobileTeacherCattyManagement(
  teacherUserId: string,
  options: MobileTeacherCattyOptions = {},
): Promise<MobileTeacherCattyManagement | null> {
  const store = options.store ?? getPrisma();
  const teacher = await store.teacherProfile.findFirst({
    where: { userId: teacherUserId, user: { isActive: true } },
    select: { id: true },
  });

  if (!teacher) return null;

  const assignments = await store.studentTeacherAssignment.findMany({
    where: { teacherProfileId: teacher.id },
    orderBy: { studentProfile: { user: { name: "asc" } } },
    take: MAX_MOBILE_TEACHER_CATTY_STUDENTS + 1,
    select: {
      studentProfile: {
        select: {
          user: {
            select: { id: true, isActive: true, name: true },
          },
        },
      },
    },
  });

  if (assignments.length > MAX_MOBILE_TEACHER_CATTY_STUDENTS) {
    throw new Error("TEACHER_CATTY_STUDENT_LIMIT_EXCEEDED");
  }

  const students = assignments
    .map((assignment) => assignment.studentProfile.user)
    .filter((user) => user.isActive)
    .map((user) => ({ id: user.id, name: cleanName(user.name) }));
  const studentIds = students.map((student) => student.id);

  const [artifacts, learningItems, approvedLearningCount] = await Promise.all([
    studentIds.length
      ? store.cattyUserArtifact.findMany({
          where: { userId: { in: studentIds } },
          orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
          take: MAX_MOBILE_TEACHER_CATTY_ARTIFACTS + 1,
          select: {
            catchphrases: true,
            emojis: true,
            example: true,
            id: true,
            isPrimary: true,
            label: true,
            sounds: true,
            status: true,
            themeId: true,
            toneRule: true,
            updatedAt: true,
            userId: true,
          },
        })
      : Promise.resolve([]),
    store.cattyLearningItem.findMany({
      where: {
        category: { in: [...MOBILE_TEACHER_CATTY_LEARNING_CATEGORIES] },
        createdByUserId: teacherUserId,
      },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      take: MAX_MOBILE_TEACHER_CATTY_LEARNINGS + 1,
      select: {
        badReply: true,
        category: true,
        createdAt: true,
        id: true,
        idealReply: true,
        intent: true,
        notes: true,
        status: true,
        tags: true,
        title: true,
        updatedAt: true,
        userPrompt: true,
      },
    }),
    store.cattyLearningItem.count({ where: { status: "APPROVED" } }),
  ]);

  if (artifacts.length > MAX_MOBILE_TEACHER_CATTY_ARTIFACTS) {
    throw new Error("TEACHER_CATTY_ARTIFACT_LIMIT_EXCEEDED");
  }
  if (learningItems.length > MAX_MOBILE_TEACHER_CATTY_LEARNINGS) {
    throw new Error("TEACHER_CATTY_LEARNING_LIMIT_EXCEEDED");
  }

  const { CATTY_ARTIFACT_THEMES } = await import("@/lib/catty-artifacts");

  return {
    approvedLearningCount,
    artifacts: artifacts.map((artifact) => ({
      catchphrases: artifact.catchphrases,
      emojis: artifact.emojis,
      example: artifact.example,
      id: artifact.id,
      isPrimary: artifact.isPrimary,
      label: artifact.label,
      sounds: artifact.sounds,
      status: artifact.status,
      studentId: artifact.userId,
      themeId: artifact.themeId,
      toneRule: artifact.toneRule,
      updatedAt: artifact.updatedAt.toISOString(),
    })),
    learningCategories: MOBILE_TEACHER_CATTY_LEARNING_CATEGORIES,
    learningItems: learningItems.map((item) => ({
      badReply: item.badReply,
      category: item.category as MobileTeacherCattyLearningCategory,
      createdAt: item.createdAt.toISOString(),
      id: item.id,
      idealReply: item.idealReply,
      intent: item.intent,
      notes: item.notes,
      status: item.status,
      tags: item.tags,
      title: item.title,
      updatedAt: item.updatedAt.toISOString(),
      userPrompt: item.userPrompt,
    })),
    students,
    themeOptions: CATTY_ARTIFACT_THEMES.map((theme) => ({
      catchphrases: theme.catchphrases,
      emojis: theme.emojis,
      id: theme.id,
      label: theme.label,
      sounds: theme.sounds,
    })),
  };
}

export async function createMobileTeacherCattyLearning(
  teacherUserId: string,
  input: unknown,
  options: MobileTeacherCattyOptions = {},
): Promise<MobileTeacherCattyMutationResult> {
  const parsed = cattyLearningCreateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      code: "INVALID_INPUT",
      message: parsed.error.issues[0]?.message ?? "Revise o aprendizado.",
      ok: false,
    };
  }
  if (!mobileTeacherCategorySet.has(parsed.data.category)) {
    return {
      code: "CATEGORY_FORBIDDEN",
      message: "Esta categoria e reservada para administracao da Catty.",
      ok: false,
    };
  }

  const store = options.store ?? getPrisma();
  const teacher = await store.teacherProfile.findFirst({
    where: { userId: teacherUserId, user: { isActive: true } },
    select: { id: true },
  });
  if (!teacher) {
    return {
      code: "TEACHER_PROFILE_UNAVAILABLE",
      message: "Perfil de teacher nao encontrado.",
      ok: false,
    };
  }

  await store.cattyLearningItem.create({
    data: {
      badReply: parsed.data.badReply ?? null,
      category: parsed.data.category,
      createdByUserId: teacherUserId,
      idealReply: parsed.data.idealReply ?? null,
      intent: parsed.data.intent ?? null,
      notes: parsed.data.notes ?? null,
      status: "PENDING",
      tags: parsed.data.tags,
      title: parsed.data.title,
      userPrompt: parsed.data.userPrompt ?? null,
    },
  });

  return {
    message: "Sugestao enviada. Um admin precisa aprovar antes da Catty usar.",
    ok: true,
  };
}

export async function saveMobileTeacherCattyArtifact(
  teacherUserId: string,
  input: unknown,
  options: MobileTeacherCattyOptions = {},
): Promise<MobileTeacherCattyMutationResult> {
  if (!cattyUserArtifactUpsertSchema.safeParse(input).success) {
    return {
      code: "INVALID_INPUT",
      message: "Revise o artefato da Catty antes de salvar.",
      ok: false,
    };
  }
  const validatedInput = input as CattyUserArtifactUpsertInput;
  const result = await (options.upsertArtifact ?? upsertCattyUserArtifact)({
    ...validatedInput,
    actorRole: "TEACHER",
    actorUserId: teacherUserId,
  });
  return result.ok
    ? { message: result.message, ok: true }
    : { code: "TARGET_FORBIDDEN", message: result.message, ok: false };
}

export async function changeMobileTeacherCattyArtifactStatus(
  teacherUserId: string,
  input: unknown,
  options: MobileTeacherCattyOptions = {},
): Promise<MobileTeacherCattyMutationResult> {
  if (!cattyUserArtifactStatusUpdateSchema.safeParse(input).success) {
    return {
      code: "INVALID_INPUT",
      message: "Status invalido para o artefato da Catty.",
      ok: false,
    };
  }
  const validatedInput = input as CattyUserArtifactStatusUpdateInput;
  const result = await (
    options.updateArtifact ?? updateCattyUserArtifactStatus
  )({
    ...validatedInput,
    actorRole: "TEACHER",
    actorUserId: teacherUserId,
  });
  return result.ok
    ? { message: result.message, ok: true }
    : { code: "TARGET_FORBIDDEN", message: result.message, ok: false };
}
