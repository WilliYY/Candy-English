import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";
import type { Role } from "@/lib/roles";

export type ContractAccessUser = {
  id: string;
  role: Role;
};

const contractDocumentSelect = {
  createdAt: true,
  fileName: true,
  id: true,
  mimeType: true,
  sizeBytes: true,
  storagePath: true,
  studentProfileId: true,
  title: true,
} satisfies Prisma.ContractDocumentSelect;

export function getContractDocumentAccessScope(
  user: ContractAccessUser,
  contractId?: string,
): Prisma.ContractDocumentWhereInput {
  if (user.role === "ADMIN") {
    return contractId ? { id: contractId } : {};
  }

  if (user.role === "STUDENT") {
    return {
      ...(contractId ? { id: contractId } : {}),
      OR: [
        { studentProfileId: null },
        { studentProfile: { userId: user.id } },
      ],
    };
  }

  return {
    ...(contractId ? { id: contractId } : {}),
    OR: [
      { studentProfileId: null },
      {
        studentProfile: {
          teacherAssignments: {
            some: { teacherProfile: { userId: user.id } },
          },
        },
      },
    ],
  };
}

export async function getAuthorizedContractDocument(
  user: ContractAccessUser,
  contractId: string,
) {
  if (!contractId) {
    return null;
  }

  return getPrisma().contractDocument.findFirst({
    where: getContractDocumentAccessScope(user, contractId),
    select: contractDocumentSelect,
  });
}

export function normalizeContractFileName(fileName: string) {
  const withoutControlCharacters = fileName
    .replace(/[\u0000-\u001f\u007f\uD800-\uDFFF]/g, "_")
    .trim()
    .slice(0, 160);
  const withExtension = withoutControlCharacters.toLowerCase().endsWith(".pdf")
    ? withoutControlCharacters
    : `${withoutControlCharacters || "contrato"}.pdf`;

  return withExtension;
}

export function getContractContentDisposition(
  fileName: string,
  disposition: "attachment" | "inline" = "attachment",
) {
  const normalized = normalizeContractFileName(fileName);
  const asciiName =
    normalized
      .normalize("NFKD")
      .replace(/[^\x20-\x7e]/g, "")
      .replace(/["\\;]/g, "_")
      .trim() || "contrato.pdf";

  return `${disposition}; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(normalized)}`;
}

export function hasPdfSignature(file: Uint8Array) {
  return (
    file.byteLength >= 5 &&
    file[0] === 0x25 &&
    file[1] === 0x50 &&
    file[2] === 0x44 &&
    file[3] === 0x46 &&
    file[4] === 0x2d
  );
}
