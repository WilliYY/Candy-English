import { unlink } from "node:fs/promises";

import type { Prisma } from "@/generated/prisma/client";
import { hasPdfSignature } from "@/lib/contract-documents";
import type { MobileAuthUser } from "@/lib/mobile-auth/contracts";
import { getPrisma } from "@/lib/prisma";
import {
  CONTRACT_MAX_BYTES,
  getStoragePath,
  saveContractPdf,
} from "@/lib/storage";
import { z } from "zod";

const MAX_PAGE_SIZE = 100;
const MAX_STUDENT_OPTIONS = 500;
const positiveInteger = z.preprocess(
  (value) =>
    typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value,
  z.number().int().positive(),
);
const listInputSchema = z
  .object({
    assignment: z.enum(["ALL", "GENERAL", "STUDENT"]).default("ALL"),
    cursor: z.string().trim().min(1).max(200).optional(),
    limit: positiveInteger.pipe(z.number().int().max(MAX_PAGE_SIZE)).default(30),
    query: z.string().trim().max(80).optional(),
  })
  .strict();
const uploadInputSchema = z
  .object({
    confirmUpload: z.literal(true),
    operationId: z.string().uuid(),
    studentProfileId: z.string().trim().min(1).max(200).nullable(),
    title: z.string().trim().min(3).max(160),
  })
  .strict();

export const mobileAdminContractSelect = {
  createdAt: true,
  fileName: true,
  id: true,
  mimeType: true,
  sizeBytes: true,
  studentProfile: {
    select: { id: true, user: { select: { name: true } } },
  },
  title: true,
  uploadedByUser: { select: { name: true } },
} satisfies Prisma.ContractDocumentSelect;

type ContractRow = Prisma.ContractDocumentGetPayload<{
  select: typeof mobileAdminContractSelect;
}>;
export type MobileAdminContractsStore = Pick<
  ReturnType<typeof getPrisma>,
  "contractDocument" | "studentProfile"
>;
type SaveContract = typeof saveContractPdf;
type Options = {
  now?: () => Date;
  removeContract?: (relativePath: string) => Promise<void>;
  saveContract?: SaveContract;
  store?: MobileAdminContractsStore;
};

export class MobileAdminContractsError extends Error {
  constructor(
    public readonly code:
      | "INVALID_FILE"
      | "INVALID_QUERY"
      | "NOT_FOUND"
      | "OPERATION_CONFLICT"
      | "RESULT_LIMIT"
      | "ROLE_FORBIDDEN"
      | "STUDENT_NOT_FOUND",
  ) {
    super(code);
    this.name = "MobileAdminContractsError";
  }
}

function safeText(value: string, max: number, fallback: string) {
  return value.trim().slice(0, max) || fallback;
}

export function serializeMobileAdminContract(row: ContractRow) {
  return {
    createdAt: row.createdAt.toISOString(),
    fileName: safeText(row.fileName, 160, "contrato.pdf"),
    id: row.id,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    student: row.studentProfile
      ? {
          id: row.studentProfile.id,
          name: safeText(row.studentProfile.user.name, 120, "Aluno"),
        }
      : null,
    title: safeText(row.title, 160, "Contrato"),
    uploadedByName: safeText(
      row.uploadedByUser.name,
      120,
      "Equipe Candy English",
    ),
  };
}

function assertAdmin(actor: MobileAuthUser) {
  if (actor.role !== "ADMIN") {
    throw new MobileAdminContractsError("ROLE_FORBIDDEN");
  }
}

function assignmentWhere(
  assignment: "ALL" | "GENERAL" | "STUDENT",
): Prisma.ContractDocumentWhereInput {
  if (assignment === "GENERAL") return { studentProfileId: null };
  if (assignment === "STUDENT") {
    return { studentProfileId: { not: null } };
  }
  return {};
}

export async function getMobileAdminContracts(
  actor: MobileAuthUser,
  input: unknown,
  options: Options = {},
) {
  assertAdmin(actor);
  const parsed = listInputSchema.safeParse(input);
  if (!parsed.success) throw new MobileAdminContractsError("INVALID_QUERY");

  const store = options.store ?? getPrisma();
  const query = parsed.data.query?.trim();
  const where: Prisma.ContractDocumentWhereInput = {
    ...assignmentWhere(parsed.data.assignment),
    ...(query
      ? {
          OR: [
            { fileName: { contains: query, mode: "insensitive" } },
            { title: { contains: query, mode: "insensitive" } },
            {
              studentProfile: {
                user: { name: { contains: query, mode: "insensitive" } },
              },
            },
            {
              uploadedByUser: {
                name: { contains: query, mode: "insensitive" },
              },
            },
          ],
        }
      : {}),
  };

  const [rows, total, general, studentSpecific, studentRows] =
    await Promise.all([
      store.contractDocument.findMany({
        ...(parsed.data.cursor
          ? { cursor: { id: parsed.data.cursor }, skip: 1 }
          : {}),
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: mobileAdminContractSelect,
        take: parsed.data.limit + 1,
        where,
      }),
      store.contractDocument.count(),
      store.contractDocument.count({ where: { studentProfileId: null } }),
      store.contractDocument.count({
        where: { studentProfileId: { not: null } },
      }),
      store.studentProfile.findMany({
        orderBy: [{ user: { name: "asc" } }, { id: "asc" }],
        select: { id: true, user: { select: { name: true } } },
        take: MAX_STUDENT_OPTIONS + 1,
        where: { user: { isActive: true } },
      }),
    ]);

  if (studentRows.length > MAX_STUDENT_OPTIONS) {
    throw new MobileAdminContractsError("RESULT_LIMIT");
  }
  const hasMore = rows.length > parsed.data.limit;
  const page = rows.slice(0, parsed.data.limit);

  return {
    contracts: page.map(serializeMobileAdminContract),
    generatedAt: (options.now?.() ?? new Date()).toISOString(),
    hasMore,
    nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null,
    students: studentRows.map((student) => ({
      id: student.id,
      name: safeText(student.user.name, 120, "Aluno"),
    })),
    summary: { general, studentSpecific, total },
  };
}

export async function getMobileAdminContract(
  actor: MobileAuthUser,
  contractId: string,
  options: Options = {},
) {
  assertAdmin(actor);
  if (!contractId || contractId.length > 200) {
    throw new MobileAdminContractsError("NOT_FOUND");
  }
  const store = options.store ?? getPrisma();
  const row = await store.contractDocument.findFirst({
    select: mobileAdminContractSelect,
    where: { id: contractId },
  });
  if (!row) throw new MobileAdminContractsError("NOT_FOUND");
  return serializeMobileAdminContract(row);
}

async function removeSavedContract(relativePath: string) {
  try {
    await unlink(getStoragePath(relativePath));
  } catch (error) {
    if (
      !error ||
      typeof error !== "object" ||
      !("code" in error) ||
      error.code !== "ENOENT"
    ) {
      throw error;
    }
  }
}

function isUniqueConstraintError(error: unknown) {
  return (
    !!error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "P2002"
  );
}

function assertCompatibleReplay(
  existing: ContractRow,
  input: z.infer<typeof uploadInputSchema>,
) {
  if (
    existing.title.trim() !== input.title ||
    (existing.studentProfile?.id ?? null) !== input.studentProfileId
  ) {
    throw new MobileAdminContractsError("OPERATION_CONFLICT");
  }
}

export async function createMobileAdminContract(
  actor: MobileAuthUser,
  input: unknown,
  file: File,
  options: Options = {},
) {
  assertAdmin(actor);
  const parsed = uploadInputSchema.safeParse(input);
  if (!parsed.success) throw new MobileAdminContractsError("INVALID_QUERY");

  const store = options.store ?? getPrisma();
  const existing = await store.contractDocument.findUnique({
    select: mobileAdminContractSelect,
    where: { createdByMobileOperationId: parsed.data.operationId },
  });
  if (existing) {
    assertCompatibleReplay(existing, parsed.data);
    return { contract: serializeMobileAdminContract(existing), replayed: true };
  }

  if (
    !(file instanceof File) ||
    file.type !== "application/pdf" ||
    file.size <= 0 ||
    file.size > CONTRACT_MAX_BYTES
  ) {
    throw new MobileAdminContractsError("INVALID_FILE");
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!hasPdfSignature(bytes)) {
    throw new MobileAdminContractsError("INVALID_FILE");
  }

  if (parsed.data.studentProfileId) {
    const student = await store.studentProfile.findFirst({
      select: { id: true },
      where: {
        id: parsed.data.studentProfileId,
        user: { isActive: true },
      },
    });
    if (!student) throw new MobileAdminContractsError("STUDENT_NOT_FOUND");
  }

  const saved = await (options.saveContract ?? saveContractPdf)(file);
  try {
    const created = await store.contractDocument.create({
      data: {
        createdByMobileOperationId: parsed.data.operationId,
        fileName: saved.originalName,
        mimeType: saved.mimeType,
        sizeBytes: saved.sizeBytes,
        storagePath: saved.relativePath,
        studentProfileId: parsed.data.studentProfileId,
        title: parsed.data.title,
        uploadedByUserId: actor.id,
      },
      select: mobileAdminContractSelect,
    });
    return { contract: serializeMobileAdminContract(created), replayed: false };
  } catch (error) {
    try {
      await (options.removeContract ?? removeSavedContract)(saved.relativePath);
    } catch (cleanupError) {
      console.error("[mobile-admin-contract-cleanup]", { cleanupError });
    }
    if (isUniqueConstraintError(error)) {
      const replay = await store.contractDocument.findUnique({
        select: mobileAdminContractSelect,
        where: { createdByMobileOperationId: parsed.data.operationId },
      });
      if (replay) {
        assertCompatibleReplay(replay, parsed.data);
        return { contract: serializeMobileAdminContract(replay), replayed: true };
      }
    }
    throw error;
  }
}
