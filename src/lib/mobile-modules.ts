import type { MobileAuthUser } from "@/lib/mobile-auth/contracts";
import { getMobileStudentLessonScope } from "@/lib/mobile-lesson";
import { getContractDocumentAccessScope } from "@/lib/contract-documents";
import { getPrisma } from "@/lib/prisma";
import { getMobileTeacherContracts } from "@/lib/mobile-teacher-contracts";
import { getMobileTeacherCandyXpOverview } from "@/lib/mobile-teacher-candy-xp";

export type MobileModuleItem = {
  amountCents?: number;
  detail?: string;
  fileName?: string;
  id: string;
  mimeType?: string;
  occurredAt?: string;
  sizeBytes?: number;
  status?: string;
  subtitle?: string;
  title: string;
};

export type MobileModuleData = {
  emptyMessage: string;
  items: MobileModuleItem[];
  slug: string;
  title: string;
};

const roleModules = {
  ADMIN: ["users", "secretary", "finance", "agenda", "ava", "reports"],
  STUDENT: ["lessons", "homeworks", "xp", "messages", "contracts"],
  TEACHER: [
    "students",
    "lessons",
    "submissions",
    "homeworks",
    "messages",
    "contracts",
    "secretary",
    "xp",
  ],
} as const;

export class MobileModuleError extends Error {
  constructor(
    readonly code:
      | "MODULE_FORBIDDEN"
      | "MODULE_LIMIT_EXCEEDED"
      | "MODULE_NOT_FOUND",
  ) {
    super(code);
    this.name = "MobileModuleError";
  }
}

function ensureAllowed(user: MobileAuthUser, slug: string) {
  const known = new Set(Object.values(roleModules).flat());

  if (!known.has(slug as never)) {
    throw new MobileModuleError("MODULE_NOT_FOUND");
  }

  if (!(roleModules[user.role] as readonly string[]).includes(slug)) {
    throw new MobileModuleError("MODULE_FORBIDDEN");
  }
}

function data(
  slug: string,
  title: string,
  emptyMessage: string,
  items: MobileModuleItem[],
): MobileModuleData {
  return { emptyMessage, items, slug, title };
}

async function getStudentModule(user: MobileAuthUser, slug: string) {
  const prisma = getPrisma();
  const profile = await prisma.studentProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  if (!profile) {
    return data(slug, "Meu espaço", "Seu perfil ainda não foi vinculado.", []);
  }

  if (slug === "lessons") {
    const lessons = await prisma.lesson.findMany({
      where: getMobileStudentLessonScope(profile.id),
      orderBy: [{ scheduledAt: "desc" }, { updatedAt: "desc" }],
      take: 50,
      select: {
        id: true,
        scheduledAt: true,
        status: true,
        teacherProfile: { select: { user: { select: { name: true } } } },
        title: true,
      },
    });

    return data(
      slug,
      "Aulas",
      "Nenhuma aula foi liberada ainda.",
      lessons.map((lesson) => ({
        id: lesson.id,
        occurredAt: lesson.scheduledAt?.toISOString(),
        status: lesson.status,
        subtitle: `Teacher ${lesson.teacherProfile.user.name}`,
        title: lesson.title,
      })),
    );
  }

  if (slug === "homeworks") {
    const homeworks = await prisma.homework.findMany({
      where: {
        OR: [
          { lesson: { studentProfileId: profile.id } },
          { studentAssignments: { some: { studentProfileId: profile.id } } },
        ],
        status: "PUBLISHED",
      },
      orderBy: [{ dueDate: "desc" }, { updatedAt: "desc" }],
      take: 50,
      select: {
        dueDate: true,
        id: true,
        lesson: { select: { title: true } },
        status: true,
        submissions: {
          where: { studentProfileId: profile.id },
          select: { status: true },
          take: 1,
        },
        title: true,
      },
    });

    return data(
      slug,
      "Homework",
      "Nenhuma tarefa disponível.",
      homeworks.map((homework) => ({
        detail: homework.submissions[0]
          ? `Entrega: ${homework.submissions[0].status}`
          : "Ainda não entregue",
        id: homework.id,
        occurredAt: homework.dueDate?.toISOString(),
        status: homework.status,
        subtitle: homework.lesson.title,
        title: homework.title,
      })),
    );
  }

  if (slug === "messages") {
    const messages = await prisma.chatMessage.findMany({
      where: { thread: { studentProfileId: profile.id } },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        body: true,
        createdAt: true,
        id: true,
        senderUser: { select: { name: true } },
      },
    });

    return data(
      slug,
      "Mensagens",
      "Nenhuma mensagem por aqui.",
      messages.map((message) => ({
        id: message.id,
        occurredAt: message.createdAt.toISOString(),
        subtitle: message.body,
        title: message.senderUser.name,
      })),
    );
  }

  if (slug === "contracts") {
    const contracts = await prisma.contractDocument.findMany({
      where: getContractDocumentAccessScope(user),
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        createdAt: true,
        fileName: true,
        id: true,
        mimeType: true,
        sizeBytes: true,
        title: true,
      },
    });

    return data(
      slug,
      "Contratos",
      "Nenhum contrato disponível.",
      contracts.map((contract) => ({
        fileName: contract.fileName,
        id: contract.id,
        mimeType: contract.mimeType,
        occurredAt: contract.createdAt.toISOString(),
        sizeBytes: contract.sizeBytes,
        subtitle: contract.fileName,
        title: contract.title,
      })),
    );
  }

  const events = await prisma.candyXpEvent.findMany({
    where: { userId: user.id },
    orderBy: { occurredAt: "desc" },
    take: 50,
    select: {
      id: true,
      kind: true,
      occurredAt: true,
      sourceLabel: true,
      xp: true,
    },
  });

  return data(
    slug,
    "Candy XP",
    "Complete atividades para ganhar seus primeiros XP.",
    events.map((event) => ({
      detail: `+${event.xp} XP`,
      id: event.id,
      occurredAt: event.occurredAt.toISOString(),
      status: event.kind,
      title: event.sourceLabel,
    })),
  );
}

async function getTeacherModule(user: MobileAuthUser, slug: string) {
  if (slug === "contracts") {
    const contracts = await getMobileTeacherContracts(user.id);
    if (!contracts.ok || !contracts.data) {
      throw new MobileModuleError("MODULE_LIMIT_EXCEEDED");
    }
    return data(
      slug,
      "Contratos",
      contracts.data.profileFound
        ? "Nenhum contrato permitido para seus alunos."
        : "Perfil de teacher não vinculado.",
      contracts.data.items,
    );
  }

  if (slug === "xp") {
    const candyXp = await getMobileTeacherCandyXpOverview(user.id);
    return data(
      slug,
      "Candy XP",
      candyXp ? "Nenhum XP registrado ainda." : "Perfil de teacher não vinculado.",
      candyXp?.recentEvents.map((event, index) => ({
        detail: `+${event.xp} XP`,
        id: `${event.occurredAt}:${index}`,
        occurredAt: event.occurredAt,
        title: event.sourceLabel,
      })) ?? [],
    );
  }

  const prisma = getPrisma();
  const profile = await prisma.teacherProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  if (!profile) {
    return data(slug, "Área da teacher", "Perfil de teacher não vinculado.", []);
  }

  if (slug === "students") {
    const assignments = await prisma.studentTeacherAssignment.findMany({
      where: { teacherProfileId: profile.id },
      orderBy: { studentProfile: { user: { name: "asc" } } },
      take: 100,
      select: {
        id: true,
        studentProfile: {
          select: {
            level: true,
            user: { select: { email: true, name: true } },
          },
        },
      },
    });

    return data(
      slug,
      "Alunos",
      "Nenhum aluno vinculado.",
      assignments.map((assignment) => ({
        detail: assignment.studentProfile.level ?? "Nível a definir",
        id: assignment.id,
        subtitle: assignment.studentProfile.user.email,
        title: assignment.studentProfile.user.name,
      })),
    );
  }

  if (slug === "lessons") {
    const lessons = await prisma.lesson.findMany({
      where: { teacherProfileId: profile.id },
      orderBy: [{ scheduledAt: "desc" }, { updatedAt: "desc" }],
      take: 50,
      select: {
        id: true,
        scheduledAt: true,
        status: true,
        studentProfile: { select: { user: { select: { name: true } } } },
        title: true,
      },
    });

    return data(
      slug,
      "Aulas",
      "Nenhuma aula cadastrada.",
      lessons.map((lesson) => ({
        id: lesson.id,
        occurredAt: lesson.scheduledAt?.toISOString(),
        status: lesson.status,
        subtitle: lesson.studentProfile?.user.name ?? "Turma geral",
        title: lesson.title,
      })),
    );
  }

  if (slug === "homeworks") {
    const homeworks = await prisma.homework.findMany({
      where: { teacherProfileId: profile.id },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: {
        dueDate: true,
        id: true,
        lesson: { select: { title: true } },
        status: true,
        title: true,
      },
    });

    return data(
      slug,
      "Homework",
      "Nenhum homework criado.",
      homeworks.map((homework) => ({
        id: homework.id,
        occurredAt: homework.dueDate?.toISOString(),
        status: homework.status,
        subtitle: homework.lesson.title,
        title: homework.title,
      })),
    );
  }

  if (slug === "submissions") {
    const submissions = await prisma.homeworkSubmission.findMany({
      where: { homework: { teacherProfileId: profile.id } },
      orderBy: { submittedAt: "desc" },
      take: 50,
      select: {
        homework: { select: { title: true } },
        id: true,
        reviewedAt: true,
        status: true,
        studentProfile: { select: { user: { select: { name: true } } } },
        submittedAt: true,
      },
    });

    return data(
      slug,
      "Correções",
      "Nenhuma submissão recebida.",
      submissions.map((submission) => ({
        detail: submission.reviewedAt ? "Feedback enviado" : "Aguardando correção",
        id: submission.id,
        occurredAt: submission.submittedAt.toISOString(),
        status: submission.status,
        subtitle: submission.studentProfile.user.name,
        title: submission.homework.title,
      })),
    );
  }

  if (slug === "messages") {
    const messages = await prisma.chatMessage.findMany({
      where: { thread: { teacherProfileId: profile.id } },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        body: true,
        createdAt: true,
        id: true,
        senderUser: { select: { name: true } },
      },
    });

    return data(
      slug,
      "Mensagens",
      "Nenhuma mensagem por aqui.",
      messages.map((message) => ({
        id: message.id,
        occurredAt: message.createdAt.toISOString(),
        subtitle: message.body,
        title: message.senderUser.name,
      })),
    );
  }

  const preRegistrations = await prisma.studentPreRegistration.findMany({
    where: {
      OR: [
        { assignedTeacherProfileId: profile.id },
        { createdByUserId: user.id },
      ],
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: {
      createdAt: true,
      englishGoal: true,
      fullName: true,
      id: true,
      status: true,
    },
  });

  return data(
    slug,
    "Secretaria",
    "Nenhum pré-cadastro sob sua responsabilidade.",
    preRegistrations.map((registration) => ({
      id: registration.id,
      occurredAt: registration.createdAt.toISOString(),
      status: registration.status,
      subtitle: registration.englishGoal,
      title: registration.fullName,
    })),
  );
}

async function getAdminModule(slug: string) {
  const prisma = getPrisma();

  if (slug === "users") {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        createdAt: true,
        email: true,
        id: true,
        isActive: true,
        name: true,
        role: true,
      },
    });

    return data(
      slug,
      "Usuários",
      "Nenhum usuário cadastrado.",
      users.map((user) => ({
        detail: user.isActive ? "Conta ativa" : "Conta desativada",
        id: user.id,
        occurredAt: user.createdAt.toISOString(),
        status: user.role,
        subtitle: user.email,
        title: user.name,
      })),
    );
  }

  if (slug === "secretary") {
    const registrations = await prisma.studentPreRegistration.findMany({
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: {
        createdAt: true,
        englishGoal: true,
        fullName: true,
        id: true,
        status: true,
        unit: true,
      },
    });

    return data(
      slug,
      "Secretaria",
      "Nenhum pré-cadastro.",
      registrations.map((registration) => ({
        detail: registration.unit,
        id: registration.id,
        occurredAt: registration.createdAt.toISOString(),
        status: registration.status,
        subtitle: registration.englishGoal,
        title: registration.fullName,
      })),
    );
  }

  if (slug === "finance") {
    const payments = await prisma.financialPayment.findMany({
      where: { isActive: true },
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: {
        id: true,
        isPaid: true,
        month: true,
        snapshotAmountCents: true,
        snapshotName: true,
        snapshotUnit: true,
        updatedAt: true,
        year: true,
      },
    });

    return data(
      slug,
      "Financeiro",
      "Nenhum lançamento financeiro.",
      payments.map((payment) => ({
        amountCents: payment.snapshotAmountCents,
        detail: `${String(payment.month).padStart(2, "0")}/${payment.year}`,
        id: payment.id,
        occurredAt: payment.updatedAt.toISOString(),
        status: payment.isPaid ? "PAGO" : "PENDENTE",
        subtitle: payment.snapshotUnit,
        title: payment.snapshotName,
      })),
    );
  }

  if (slug === "agenda") {
    const lessons = await prisma.agendaLesson.findMany({
      where: { isActive: true },
      orderBy: [{ date: "desc" }, { time: "asc" }],
      take: 100,
      select: {
        date: true,
        id: true,
        status: true,
        student: { select: { name: true, unit: true } },
        time: true,
      },
    });

    return data(
      slug,
      "Agenda",
      "Nenhuma aula na agenda.",
      lessons.map((lesson) => ({
        detail: lesson.student.unit,
        id: lesson.id,
        occurredAt: lesson.date.toISOString(),
        status: lesson.status,
        subtitle: lesson.time,
        title: lesson.student.name,
      })),
    );
  }

  if (slug === "ava") {
    const lessons = await prisma.lesson.findMany({
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: {
        id: true,
        status: true,
        studentProfile: { select: { user: { select: { name: true } } } },
        teacherProfile: { select: { user: { select: { name: true } } } },
        title: true,
        updatedAt: true,
      },
    });

    return data(
      slug,
      "AVA",
      "Nenhuma atividade no AVA.",
      lessons.map((lesson) => ({
        detail: `Teacher ${lesson.teacherProfile.user.name}`,
        id: lesson.id,
        occurredAt: lesson.updatedAt.toISOString(),
        status: lesson.status,
        subtitle: lesson.studentProfile?.user.name ?? "Turma geral",
        title: lesson.title,
      })),
    );
  }

  const groupedUsers = await prisma.user.groupBy({
    by: ["role"],
    _count: { _all: true },
    orderBy: { role: "asc" },
  });

  return data(
    slug,
    "Relatórios",
    "Nenhum indicador disponível.",
    groupedUsers.map((group) => ({
      detail: `${group._count._all} conta(s)`,
      id: `role-${group.role}`,
      status: group.role,
      title:
        group.role === "ADMIN"
          ? "Administradores"
          : group.role === "TEACHER"
            ? "Teachers"
            : "Alunos",
    })),
  );
}

export async function getMobileModuleData(
  user: MobileAuthUser,
  slug: string,
) {
  ensureAllowed(user, slug);

  if (user.role === "ADMIN") {
    return getAdminModule(slug);
  }

  if (user.role === "TEACHER") {
    return getTeacherModule(user, slug);
  }

  return getStudentModule(user, slug);
}
