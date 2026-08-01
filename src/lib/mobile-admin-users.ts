import type { Prisma } from "@/generated/prisma/client";
import type { MobileAuthUser } from "@/lib/mobile-auth/contracts";
import { getPrisma } from "@/lib/prisma";
import { z } from "zod";

const MAX_PAGE_SIZE = 50;
const MAX_TEACHERS_PER_STUDENT = 20;

const listInputSchema = z
  .object({
    cursor: z.string().trim().min(1).max(200).optional(),
    limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(25),
    query: z
      .string()
      .trim()
      .max(80)
      .optional()
      .transform((value) => value || undefined),
    role: z.enum(["ADMIN", "TEACHER", "STUDENT"]).optional(),
    status: z.enum(["ACTIVE", "INACTIVE", "ALL"]).default("ALL"),
  })
  .strict();

const userIdSchema = z.string().trim().min(1).max(200);

const userListSelect = {
  createdAt: true,
  email: true,
  id: true,
  isActive: true,
  name: true,
  role: true,
  studentProfile: { select: { id: true } },
  teacherProfile: { select: { id: true } },
  updatedAt: true,
} satisfies Prisma.UserSelect;

const userDetailSelect = {
  address: true,
  createdAt: true,
  email: true,
  id: true,
  isActive: true,
  name: true,
  phone: true,
  role: true,
  studentProfile: {
    select: {
      _count: { select: { contracts: true, lessons: true, submissions: true } },
      id: true,
      level: true,
      teacherAssignments: {
        orderBy: { createdAt: "asc" },
        select: {
          teacherProfile: { select: { user: { select: { name: true } } } },
        },
        take: MAX_TEACHERS_PER_STUDENT,
      },
    },
  },
  teacherProfile: {
    select: {
      _count: {
        select: {
          homeworks: true,
          lessons: true,
          reviewedSubmissions: true,
          studentAssignments: true,
        },
      },
      bio: true,
      id: true,
    },
  },
  updatedAt: true,
} satisfies Prisma.UserSelect;

type UserListRow = Prisma.UserGetPayload<{ select: typeof userListSelect }>;
type UserDetailRow = Prisma.UserGetPayload<{ select: typeof userDetailSelect }>;

export type MobileAdminUsersStore = Pick<ReturnType<typeof getPrisma>, "user">;

type Options = {
  now?: () => Date;
  store?: MobileAdminUsersStore;
};

export class MobileAdminUsersError extends Error {
  constructor(
    public readonly code:
      | "INVALID_QUERY"
      | "ROLE_FORBIDDEN"
      | "USER_NOT_FOUND",
  ) {
    super(code);
    this.name = "MobileAdminUsersError";
  }
}

function requireAdmin(actor: MobileAuthUser) {
  if (actor.role !== "ADMIN") {
    throw new MobileAdminUsersError("ROLE_FORBIDDEN");
  }
}

function text(value: string, maximum: number) {
  return value.trim().slice(0, maximum);
}

function nullableText(value: string | null, maximum: number) {
  const normalized = value?.trim().slice(0, maximum);
  return normalized || null;
}

function profileComplete(user: UserListRow) {
  if (user.role === "STUDENT") return Boolean(user.studentProfile);
  if (user.role === "TEACHER") return Boolean(user.teacherProfile);
  return true;
}

function listItem(user: UserListRow) {
  return {
    createdAt: user.createdAt.toISOString(),
    email: text(user.email, 254),
    id: user.id,
    isActive: user.isActive,
    name: text(user.name, 120) || "Usuario sem nome",
    profileComplete: profileComplete(user),
    role: user.role,
    updatedAt: user.updatedAt.toISOString(),
  };
}

function detail(user: UserDetailRow) {
  return {
    address: nullableText(user.address, 240),
    createdAt: user.createdAt.toISOString(),
    email: text(user.email, 254),
    id: user.id,
    isActive: user.isActive,
    name: text(user.name, 120) || "Usuario sem nome",
    phone: nullableText(user.phone, 40),
    role: user.role,
    studentProfile: user.studentProfile
      ? {
          contractsCount: user.studentProfile._count.contracts,
          id: user.studentProfile.id,
          lessonsCount: user.studentProfile._count.lessons,
          level: nullableText(user.studentProfile.level, 80),
          submissionsCount: user.studentProfile._count.submissions,
          teacherNames: user.studentProfile.teacherAssignments.map(
            ({ teacherProfile }) =>
              text(teacherProfile.user.name, 120) || "Teacher sem nome",
          ),
        }
      : null,
    teacherProfile: user.teacherProfile
      ? {
          bio: nullableText(user.teacherProfile.bio, 500),
          homeworksCount: user.teacherProfile._count.homeworks,
          id: user.teacherProfile.id,
          lessonsCount: user.teacherProfile._count.lessons,
          reviewedSubmissionsCount:
            user.teacherProfile._count.reviewedSubmissions,
          studentsCount: user.teacherProfile._count.studentAssignments,
        }
      : null,
    updatedAt: user.updatedAt.toISOString(),
  };
}

export async function getMobileAdminUsers(
  actor: MobileAuthUser,
  input: unknown,
  options: Options = {},
) {
  requireAdmin(actor);
  const parsed = listInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new MobileAdminUsersError("INVALID_QUERY");
  }

  const store = options.store ?? getPrisma();
  const { cursor, limit, query, role, status } = parsed.data;
  const where: Prisma.UserWhereInput = {
    ...(status === "ALL" ? {} : { isActive: status === "ACTIVE" }),
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" as const } },
            { email: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(role ? { role } : {}),
  };

  const [rows, total] = await Promise.all([
    store.user.findMany({
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: userListSelect,
      skip: cursor ? 1 : undefined,
      take: limit + 1,
      where,
    }),
    store.user.count({ where }),
  ]);
  const visibleRows = rows.slice(0, limit);

  return {
    generatedAt: (options.now?.() ?? new Date()).toISOString(),
    items: visibleRows.map(listItem),
    nextCursor:
      rows.length > limit ? (visibleRows.at(-1)?.id ?? null) : null,
    total,
  };
}

export async function getMobileAdminUser(
  actor: MobileAuthUser,
  userId: unknown,
  options: Options = {},
) {
  requireAdmin(actor);
  const parsedUserId = userIdSchema.safeParse(userId);
  if (!parsedUserId.success) {
    throw new MobileAdminUsersError("INVALID_QUERY");
  }

  const store = options.store ?? getPrisma();
  const user = await store.user.findUnique({
    where: { id: parsedUserId.data },
    select: userDetailSelect,
  });

  if (!user) {
    throw new MobileAdminUsersError("USER_NOT_FOUND");
  }

  return detail(user);
}
