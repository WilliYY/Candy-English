import type { Prisma } from "@/generated/prisma/client";
import { getContractDocumentAccessScope } from "@/lib/contract-documents";
import { getPrisma } from "@/lib/prisma";

const MAX_CONTRACTS = 50;

const contractSelect = {
  createdAt: true,
  fileName: true,
  id: true,
  mimeType: true,
  sizeBytes: true,
  studentProfile: { select: { user: { select: { name: true } } } },
  title: true,
} satisfies Prisma.ContractDocumentSelect;

type ContractRow = Prisma.ContractDocumentGetPayload<{
  select: typeof contractSelect;
}>;

export type MobileTeacherContractsStore = Pick<
  ReturnType<typeof getPrisma>,
  "contractDocument" | "teacherProfile"
>;

type Options = { store?: MobileTeacherContractsStore };

export type MobileTeacherContractItem = {
  detail: string;
  fileName: string;
  id: string;
  mimeType: string;
  occurredAt: string;
  sizeBytes: number;
  subtitle: string;
  title: string;
};

type Result = {
  data?: {
    items: MobileTeacherContractItem[];
    profileFound: boolean;
  };
  message: string;
  ok: boolean;
  reason?: "LIMIT_EXCEEDED";
};

function item(contract: ContractRow): MobileTeacherContractItem {
  return {
    detail: contract.studentProfile?.user.name ?? "Documento geral",
    fileName: contract.fileName,
    id: contract.id,
    mimeType: contract.mimeType,
    occurredAt: contract.createdAt.toISOString(),
    sizeBytes: contract.sizeBytes,
    subtitle: contract.fileName,
    title: contract.title,
  };
}

export async function getMobileTeacherContracts(
  userId: string,
  options: Options = {},
): Promise<Result> {
  const store = options.store ?? getPrisma();
  const profile = await store.teacherProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!profile) {
    return {
      data: { items: [], profileFound: false },
      message: "Perfil de teacher nao vinculado.",
      ok: true,
    };
  }

  const contracts = await store.contractDocument.findMany({
    where: getContractDocumentAccessScope({ id: userId, role: "TEACHER" }),
    orderBy: { createdAt: "desc" },
    take: MAX_CONTRACTS + 1,
    select: contractSelect,
  });

  if (contracts.length > MAX_CONTRACTS) {
    return {
      message: "Existem contratos demais para uma resposta movel segura.",
      ok: false,
      reason: "LIMIT_EXCEEDED",
    };
  }

  return {
    data: { items: contracts.map(item), profileFound: true },
    message: "Contratos carregados.",
    ok: true,
  };
}
