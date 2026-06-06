import {
  CalendarCheck2,
  CalendarDays,
  BrainCircuit,
  FileText,
  GraduationCap,
  HardDrive,
  KeyRound,
  Link2,
  Mail,
  Power,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserRound,
  UsersRound,
  WalletCards,
  Wrench,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import {
  AdminAgendaPanel,
  type AdminAgendaLessonRow,
  type AdminAgendaLogRow,
  type AdminAgendaStudentRow,
} from "@/components/ava/admin-agenda-panel";
import {
  AdminCandyXpPanel,
  type AdminCandyXpActivityRow,
  type CandyXpStudentOption,
} from "@/components/ava/admin-candy-xp-panel";
import {
  AdminCredentialsPanel,
  type AdminCredentialRow,
} from "@/components/ava/admin-credentials-panel";
import {
  CattyLearningCenterPanel,
  type CattyLearningFeedbackRow,
  type CattyLearningItemRow,
} from "@/components/ava/catty-learning-center-panel";
import { CattyArtifactsPanel } from "@/components/ava/catty-artifacts-panel";
import { CattyMemoryPanel } from "@/components/ava/catty-memory-panel";
import {
  AdminFinancePanel,
  type AdminFinanceLogRow,
  type AdminFinanceStudentRow,
} from "@/components/ava/admin-finance-panel";
import { AdminCreateUserForm } from "@/components/ava/admin-create-user-form";
import {
  AdminAssignTeacherForm,
  AdminUserPasswordResetForm,
  AdminUserStatusButton,
} from "@/components/ava/admin-operations";
import { AdminMaintenancePanel } from "@/components/ava/admin-maintenance-panel";
import { ContractUploadForm } from "@/components/ava/contract-upload-form";
import { CandyXpCard } from "@/components/ava/student-xp-card";
import {
  StudentPreRegistrationReviewPanel,
  type PreRegistrationStatus,
  type StudentPreRegistrationReviewRow,
} from "@/components/ava/student-pre-registration-review-panel";
import { UserSummaryPanel } from "@/components/ava/user-summary-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  applyCandyXpPersistence,
  buildCandyAdminXpSnapshot,
  type CandyXpPersistenceSnapshot,
} from "@/lib/candy-xp";
import type { CattyArtifactManagementData } from "@/lib/catty-user-artifacts";
import type { CattyMemoryManagementData } from "@/lib/catty-memory-management";
import type { Role } from "@/lib/roles";
import { cn } from "@/lib/utils";

export const adminTaskIds = [
  "usuarios",
  "criar-admin",
  "criar-teacher",
  "criar-aluno",
  "aceitar-alunos",
  "vincular-aluno",
  "candy-xp",
  "contratos",
  "financeiro",
  "agenda",
  "apis-senhas",
  "catty-learning",
  "catty-memory",
  "catty-artifacts",
  "editar-site",
] as const;

export type AdminTask = (typeof adminTaskIds)[number];

type AdminUserRow = {
  _count: {
    sentChatMessages: number;
    uploadedContracts: number;
  };
  createdAt: Date;
  email: string;
  id: string;
  isActive: boolean;
  name: string;
  role: Role;
  studentProfile: {
    _count: {
      chatThreads: number;
      contracts: number;
      lessons: number;
      liveSessions: number;
      submissions: number;
      teacherAssignments: number;
    };
    level: string | null;
  } | null;
  teacherProfile: {
    _count: {
      chatThreads: number;
      homeworks: number;
      lessons: number;
      liveSessions: number;
      reviewedSubmissions: number;
      studentAssignments: number;
    };
    bio: string | null;
  } | null;
};

type AssignmentOption = {
  email: string;
  id: string;
  isActive: boolean;
  label: string;
};

type AssignmentRow = {
  createdAt: Date;
  id: string;
  studentName: string;
  studentProfileId: string;
  teacherName: string;
  teacherProfileId: string;
};

type AdminContractRow = {
  createdAt: Date;
  id: string;
  sizeBytes: number;
  studentName: string | null;
  title: string;
};

type AdminUsersPanelProps = {
  activeTask: AdminTask;
  adminCredentials: AdminCredentialRow[];
  candyXpActivities: AdminCandyXpActivityRow[];
  cattyArtifactData: CattyArtifactManagementData;
  cattyLearningFeedbacks: CattyLearningFeedbackRow[];
  cattyLearningItems: CattyLearningItemRow[];
  cattyMemoryData: CattyMemoryManagementData;
  candyXpPersistence?: CandyXpPersistenceSnapshot | null;
  agendaLessons: AdminAgendaLessonRow[];
  agendaLogs: AdminAgendaLogRow[];
  agendaStudents: AdminAgendaStudentRow[];
  assignments: AssignmentRow[];
  contracts: AdminContractRow[];
  currentUser: {
    avatarPath?: string | null;
    email: string;
    id?: string | null;
    name?: string | null;
    role: Role;
  };
  financeLogs: AdminFinanceLogRow[];
  financeStudents: AdminFinanceStudentRow[];
  initialAgendaMonth: number;
  initialFinanceMonth: number;
  maintenanceMode: boolean;
  preRegistrationStatus: PreRegistrationStatus;
  preRegistrationStatusCounts: Record<PreRegistrationStatus, number>;
  students: CandyXpStudentOption[];
  storageUsageBytes: number;
  studentPreRegistrations: StudentPreRegistrationReviewRow[];
  teachers: AssignmentOption[];
  users: AdminUserRow[];
};

type TaskMeta = {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const roleStyles: Record<Role, string> = {
  ADMIN: "border-primary/20 bg-primary/10 text-primary",
  TEACHER: "border-accent/20 bg-accent/10 text-accent",
  STUDENT: "border-border bg-muted text-muted-foreground",
};

const roleIcons = {
  ADMIN: ShieldCheck,
  TEACHER: GraduationCap,
  STUDENT: UserRound,
} satisfies Record<Role, ComponentType<SVGProps<SVGSVGElement>>>;

const taskMeta = {
  "criar-admin": {
    icon: ShieldCheck,
    title: "Criar admin",
  },
  "criar-aluno": {
    icon: UserRound,
    title: "Criar aluno",
  },
  "criar-teacher": {
    icon: GraduationCap,
    title: "Criar teacher",
  },
  "aceitar-alunos": {
    icon: UserCheck,
    title: "Aceitar alunos",
  },
  contratos: {
    icon: FileText,
    title: "Contratos PDF",
  },
  financeiro: {
    icon: WalletCards,
    title: "Financeiro 2026",
  },
  agenda: {
    icon: CalendarCheck2,
    title: "Agenda 2026",
  },
  "apis-senhas": {
    icon: KeyRound,
    title: "APIs e senhas",
  },
  "candy-xp": {
    icon: Sparkles,
    title: "Candy XP",
  },
  "catty-learning": {
    icon: BrainCircuit,
    title: "Treinar Catty",
  },
  "catty-memory": {
    icon: BrainCircuit,
    title: "Memoria tecnica da Catty",
  },
  "catty-artifacts": {
    icon: Sparkles,
    title: "Catty dos alunos",
  },
  "editar-site": {
    icon: Wrench,
    title: "Manutencao Candy",
  },
  usuarios: {
    icon: UsersRound,
    title: "Usuarios",
  },
  "vincular-aluno": {
    icon: Link2,
    title: "Vincular aluno",
  },
} satisfies Record<AdminTask, TaskMeta>;

export function normalizeAdminTask(value: unknown): AdminTask {
  return typeof value === "string" &&
    adminTaskIds.includes(value as AdminTask)
    ? (value as AdminTask)
    : "usuarios";
}

function formatDate(value: Date) {
  return dateFormatter.format(value);
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${Math.ceil(bytes / 1024)} KB`;
  }

  return `${(bytes / 1024 / 1024).toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
  })} MB`;
}

function getProfileSummary(user: AdminUserRow) {
  if (user.role === "STUDENT") {
    return user.studentProfile?.level
      ? `Aluno - ${user.studentProfile.level}`
      : "Aluno sem nivel definido";
  }

  if (user.role === "TEACHER") {
    return user.teacherProfile?.bio ? "Teacher com bio" : "Teacher sem bio";
  }

  return "Administracao";
}

function getUserHistory(user: AdminUserRow) {
  const history = [`Cadastrado em ${formatDate(user.createdAt)}`];

  if (user.role === "TEACHER") {
    const counts = user.teacherProfile?._count;

    if (!counts) {
      return [...history, "Perfil teacher pendente"];
    }

    return [
      ...history,
      `${counts.studentAssignments} aluno(s) vinculado(s)`,
      `${counts.lessons} aula(s) criada(s)`,
      `${counts.homeworks} homework(s)`,
      `${counts.reviewedSubmissions} feedback(s)`,
      `${counts.liveSessions} aula(s) ao vivo`,
      `${counts.chatThreads} conversa(s)`,
      `${user._count.uploadedContracts} contrato(s) enviado(s)`,
    ];
  }

  if (user.role === "STUDENT") {
    const counts = user.studentProfile?._count;

    if (!counts) {
      return [...history, "Perfil aluno pendente"];
    }

    return [
      ...history,
      `${counts.teacherAssignments} teacher(s) vinculado(s)`,
      `${counts.lessons} aula(s) recebida(s)`,
      `${counts.submissions} resposta(s) enviada(s)`,
      `${counts.contracts} contrato(s)`,
      `${counts.liveSessions} aula(s) ao vivo`,
      `${counts.chatThreads} conversa(s)`,
    ];
  }

  return [
    ...history,
    `${user._count.uploadedContracts} contrato(s) enviado(s)`,
    `${user._count.sentChatMessages} mensagem(ns) enviadas`,
  ];
}

function UsersByRole({ users }: { users: AdminUserRow[] }) {
  if (users.length === 0) {
    return (
      <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-primary/25 bg-primary/5 text-center">
        <UsersRound aria-hidden="true" />
        <p className="max-w-sm text-sm text-muted-foreground">
          Nenhum usuario cadastrado ainda. Use as opcoes da lateral para criar o
          primeiro acesso.
        </p>
      </div>
    );
  }

  const columns = [
    { empty: "Nenhum admin cadastrado.", role: "ADMIN", title: "Admins" },
    { empty: "Nenhuma teacher cadastrada.", role: "TEACHER", title: "Teachers" },
    { empty: "Nenhum aluno cadastrado.", role: "STUDENT", title: "Alunos" },
  ] satisfies { empty: string; role: Role; title: string }[];

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      {columns.map((column) => {
        const columnUsers = users.filter((user) => user.role === column.role);
        const Icon = roleIcons[column.role];

        return (
          <details
            key={column.role}
            className="ava-role-column group min-w-0 rounded-lg border p-4"
            open
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 border-b pb-3 [&::-webkit-details-marker]:hidden">
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-lg border",
                    roleStyles[column.role],
                  )}
                >
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-semibold">
                    {column.title}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {columnUsers.length} usuario(s)
                  </p>
                </div>
              </div>
              <span className="rounded-full border bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground transition-colors group-open:bg-primary group-open:text-primary-foreground">
                {columnUsers.length === 0 ? (
                  "vazio"
                ) : (
                  <>
                    <span className="group-open:hidden">abrir</span>
                    <span className="hidden group-open:inline">minimizar</span>
                  </>
                )}
              </span>
            </summary>

            <div className="mt-4 flex flex-col gap-3">
              {columnUsers.length === 0 ? (
              <p className="rounded-lg border border-dashed border-primary/20 bg-primary/5 p-4 text-sm text-primary/70">
                {column.empty}
              </p>
            ) : (
              <>
                {columnUsers.map((user) => (
                  <article
                    key={user.id}
                    className="ava-soft-card flex min-w-0 flex-col gap-4 rounded-lg border p-4"
                  >
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-semibold">
                          {user.name}
                        </h3>
                        <p
                          className="mt-1 flex min-w-0 items-center gap-2 text-sm text-muted-foreground"
                          title={user.email}
                        >
                          <Mail aria-hidden="true" className="size-4 shrink-0" />
                          <span className="truncate">{user.email}</span>
                        </p>
                      </div>
                      <span
                        className={cn(
                          "inline-flex shrink-0 items-center gap-2 rounded-md border px-2.5 py-1 text-xs font-semibold",
                          user.isActive
                            ? "border-primary/20 bg-primary/10 text-primary"
                            : "border-border bg-muted text-muted-foreground",
                        )}
                      >
                        <UserCheck aria-hidden="true" className="size-4" />
                        {user.isActive ? "Ativo" : "Inativo"}
                      </span>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      {getProfileSummary(user)}
                    </p>

                    <details className="group/history rounded-lg border border-primary/10 bg-primary/5 p-3">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground [&::-webkit-details-marker]:hidden">
                        Historico
                        <span className="rounded-full bg-white px-2 py-1 text-[0.68rem] tracking-normal">
                          <span className="group-open/history:hidden">
                            abrir
                          </span>
                          <span className="hidden group-open/history:inline">
                            minimizar
                          </span>
                        </span>
                      </summary>
                      <ul className="grid gap-1.5 text-sm text-muted-foreground">
                        {getUserHistory(user).map((item) => (
                          <li key={item} className="flex items-start gap-2">
                            <CalendarDays
                              aria-hidden="true"
                              className="mt-0.5 size-4 shrink-0"
                            />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </details>

                    <AdminUserStatusButton
                      isActive={user.isActive}
                      userId={user.id}
                    />
                    <AdminUserPasswordResetForm
                      userId={user.id}
                      userName={user.name}
                    />
                  </article>
                ))}
              </>
            )}
            </div>
          </details>
        );
      })}
    </div>
  );
}

function AssignmentList({ assignments }: { assignments: AssignmentRow[] }) {
  if (assignments.length === 0) {
    return (
      <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-primary/25 bg-primary/5 text-center">
        <UsersRound aria-hidden="true" />
        <p className="max-w-sm text-sm text-muted-foreground">
          Nenhum aluno vinculado a uma teacher ainda.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {assignments.map((assignment) => (
        <div key={assignment.id} className="ava-soft-card rounded-lg border p-4">
          <div className="flex items-center gap-3 text-sm">
            <span className="flex size-9 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
              <GraduationCap aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-medium">{assignment.teacherName}</p>
              <p className="truncate text-muted-foreground">
                {assignment.studentName}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Criado em {formatDate(assignment.createdAt)}
          </p>
        </div>
      ))}
    </div>
  );
}

function ContractsList({ contracts }: { contracts: AdminContractRow[] }) {
  if (contracts.length === 0) {
    return (
      <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-primary/25 bg-primary/5 text-center">
        <FileText aria-hidden="true" />
        <p className="max-w-sm text-sm text-muted-foreground">
          Nenhum contrato PDF enviado ainda.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {contracts.map((contract) => (
        <a
          key={contract.id}
          href={`/ava/contracts/${contract.id}`}
          target="_blank"
          rel="noreferrer"
          className="ava-soft-card flex items-center justify-between gap-4 rounded-lg border p-4 text-sm hover:border-primary"
        >
          <span className="flex min-w-0 items-center gap-3">
            <FileText aria-hidden="true" className="size-4 shrink-0" />
            <span className="min-w-0">
              <span className="block truncate font-semibold">
                {contract.title}
              </span>
              <span className="block truncate text-muted-foreground">
                {contract.studentName ?? "Contrato geral"} -{" "}
                {formatDate(contract.createdAt)}
              </span>
            </span>
          </span>
          <span className="shrink-0 text-muted-foreground">
            {formatBytes(contract.sizeBytes)}
          </span>
        </a>
      ))}
    </div>
  );
}

export function AdminUsersPanel({
  activeTask,
  adminCredentials,
  candyXpActivities,
  cattyArtifactData,
  cattyLearningFeedbacks,
  cattyLearningItems,
  cattyMemoryData,
  candyXpPersistence,
  agendaLessons,
  agendaLogs,
  agendaStudents,
  assignments,
  contracts,
  currentUser,
  financeLogs,
  financeStudents,
  initialAgendaMonth,
  initialFinanceMonth,
  maintenanceMode,
  preRegistrationStatus,
  preRegistrationStatusCounts,
  students,
  storageUsageBytes,
  studentPreRegistrations,
  teachers,
  users,
}: AdminUsersPanelProps) {
  const totals = users.reduce(
    (accumulator, user) => {
      accumulator.total += 1;
      if (user.isActive) {
        accumulator.active += 1;
      }
      accumulator[user.role] += 1;
      return accumulator;
    },
    {
      ADMIN: 0,
      STUDENT: 0,
      TEACHER: 0,
      active: 0,
      total: 0,
    },
  );

  const stats = [
    {
      icon: UsersRound,
      label: "Usuarios",
      value: totals.total,
    },
    {
      icon: GraduationCap,
      label: "Teachers",
      value: totals.TEACHER,
    },
    {
      icon: UserRound,
      label: "Alunos",
      value: totals.STUDENT,
    },
    {
      icon: Power,
      label: "Ativos",
      value: totals.active,
    },
    {
      icon: HardDrive,
      label: "Arquivos",
      value: formatBytes(storageUsageBytes),
    },
  ];
  const task = taskMeta[activeTask];
  const TaskIcon = task.icon;
  const paidPaymentsCount = financeStudents.reduce(
    (total, student) =>
      total +
      student.payments.filter((payment) => payment.isActive && payment.isPaid)
        .length,
    0,
  );
  const unpaidPaymentsCount = financeStudents.reduce(
    (total, student) =>
      total +
      student.payments.filter(
        (payment) =>
          payment.isActive &&
          !payment.isPaid &&
          payment.year === 2026 &&
          payment.month === initialFinanceMonth,
      ).length,
    0,
  );
  const agendaHandledLessonsCount = agendaLessons.filter(
    (lesson) =>
      lesson.isActive &&
      ["ATTENDED", "MAKEUP_ATTENDED", "MISSED"].includes(lesson.status),
  ).length;
  const agendaPendingLessonsCount = agendaLessons.filter(
    (lesson) => lesson.isActive && lesson.status === "SCHEDULED",
  ).length;
  const xpSnapshot = applyCandyXpPersistence(
    buildCandyAdminXpSnapshot({
      activeUsersCount: totals.active,
      agendaHandledLessonsCount,
      agendaPendingLessonsCount,
      assignmentsCount: assignments.length,
      contractsCount: contracts.length,
      credentialsCount: adminCredentials.length,
      financeStudentsCount: financeStudents.length,
      paidPaymentsCount,
      profileReady: Boolean(currentUser.avatarPath),
      studentsCount: totals.STUDENT,
      teachersCount: totals.TEACHER,
      unpaidPaymentsCount,
      usersCount: totals.total,
    }),
    candyXpPersistence,
  );

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10 lg:px-8">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(380px,410px)]">
        <div className="flex min-w-0 flex-col gap-5">
          <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-primary/15 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
            <ShieldCheck aria-hidden="true" />
            Painel protegido por role ADMIN
          </div>
          <div className="flex flex-col gap-4">
            <h1 className="max-w-4xl text-3xl font-semibold leading-tight tracking-normal md:text-5xl">
              Admin Candy English
            </h1>
          </div>
        </div>

        <UserSummaryPanel
          avatarPath={currentUser.avatarPath}
          email={currentUser.email}
          name={currentUser.name}
          role={currentUser.role}
          userId={currentUser.id}
          xp={xpSnapshot}
        />
      </div>

      <Card className="ava-panel-card overflow-hidden">
        <CardHeader className="ava-task-header border-b border-primary/15 bg-primary/10 px-7 py-5">
          <div className="relative flex min-h-12 items-center justify-center text-center">
            <span className="absolute left-0 flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <TaskIcon aria-hidden="true" />
            </span>
            <CardTitle className="px-14 text-center text-xl">
              {task.title}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="py-6">
          {activeTask === "usuarios" ? (
            <div className="flex flex-col gap-6">
              <CandyXpCard
                badgeLabel="Admin XP"
                description="Ganhe XP mantendo usuarios ativos, vinculos, contratos, financeiro, agenda e cofre em ordem."
                title={`Nivel ${xpSnapshot.level} admin`}
                xp={xpSnapshot}
              />
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="ava-stat-card flex items-center justify-between gap-4 rounded-lg border p-5"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="text-sm text-muted-foreground">
                        {stat.label}
                      </span>
                      <strong className="text-3xl font-semibold">
                        {stat.value}
                      </strong>
                    </div>
                    <span className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <stat.icon aria-hidden="true" />
                    </span>
                  </div>
                ))}
              </div>
              <UsersByRole users={users} />
            </div>
          ) : null}

          {activeTask === "criar-admin" ? (
            <AdminCreateUserForm fixedRole="ADMIN" submitLabel="Criar admin" />
          ) : null}

          {activeTask === "criar-teacher" ? (
            <AdminCreateUserForm
              fixedRole="TEACHER"
              submitLabel="Criar teacher"
            />
          ) : null}

          {activeTask === "criar-aluno" ? (
            <AdminCreateUserForm fixedRole="STUDENT" submitLabel="Criar aluno" />
          ) : null}

          {activeTask === "aceitar-alunos" ? (
            <StudentPreRegistrationReviewPanel
              activeStatus={preRegistrationStatus}
              basePath="/ava/admin"
              requests={studentPreRegistrations}
              statusCounts={preRegistrationStatusCounts}
              viewerRole="ADMIN"
            />
          ) : null}

          {activeTask === "vincular-aluno" ? (
            <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
              <AdminAssignTeacherForm students={students} teachers={teachers} />
              <div className="flex flex-col gap-3">
                <h2 className="text-lg font-semibold">Vinculos atuais</h2>
                <AssignmentList assignments={assignments} />
              </div>
            </div>
          ) : null}

          {activeTask === "contratos" ? (
            <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
              <ContractUploadForm students={students} />
              <div className="flex flex-col gap-3">
                <h2 className="text-lg font-semibold">Contratos enviados</h2>
                <ContractsList contracts={contracts} />
              </div>
            </div>
          ) : null}

          {activeTask === "candy-xp" ? (
            <AdminCandyXpPanel
              activities={candyXpActivities}
              students={students}
            />
          ) : null}

          {activeTask === "financeiro" ? (
            <AdminFinancePanel
              logs={financeLogs}
              students={financeStudents}
              initialMonth={initialFinanceMonth}
            />
          ) : null}

          {activeTask === "agenda" ? (
            <AdminAgendaPanel
              initialMonth={initialAgendaMonth}
              lessons={agendaLessons}
              logs={agendaLogs}
              students={agendaStudents}
            />
          ) : null}

          {activeTask === "apis-senhas" ? (
            <AdminCredentialsPanel credentials={adminCredentials} />
          ) : null}

          {activeTask === "catty-learning" ? (
            <CattyLearningCenterPanel
              feedbacks={cattyLearningFeedbacks}
              items={cattyLearningItems}
              viewerRole="ADMIN"
            />
          ) : null}

          {activeTask === "catty-memory" ? (
            <CattyMemoryPanel data={cattyMemoryData} viewerRole="ADMIN" />
          ) : null}

          {activeTask === "catty-artifacts" ? (
            <CattyArtifactsPanel
              data={cattyArtifactData}
              memoryData={cattyMemoryData}
              viewerRole="ADMIN"
            />
          ) : null}

          {activeTask === "editar-site" ? (
            <AdminMaintenancePanel enabled={maintenanceMode} />
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
