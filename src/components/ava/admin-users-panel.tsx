import {
  CalendarCheck2,
  CalendarDays,
  BrainCircuit,
  CheckCircle2,
  CircleAlert,
  FileText,
  GraduationCap,
  HardDrive,
  KeyRound,
  Link2,
  Mail,
  Phone,
  Power,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserRound,
  UsersRound,
  WalletCards,
  Wrench,
  type LucideIcon,
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
  AdminStudentContactEditForm,
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
  phone: string | null;
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
    studentPhone: string | null;
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
  studentEmail: string;
  studentName: string;
  studentProfileId: string;
  teacherEmail: string;
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

type AdminUserStat = {
  accentClassName: string;
  barClassName: string;
  cardClassName: string;
  description: string;
  icon: LucideIcon;
  label: string;
  value: number | string;
};

type UserInsightMetric = {
  className: string;
  icon: LucideIcon;
  label: string;
  value: number | string;
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
  ADMIN: "border-amber-200 bg-amber-50 text-amber-900",
  TEACHER: "border-pink-200 bg-pink-50 text-pink-800",
  STUDENT: "border-sky-200 bg-sky-50 text-sky-800",
};

const roleVisualStyles: Record<
  Role,
  {
    bulletClassName: string;
    columnClassName: string;
    countBadgeClassName: string;
    emptyClassName: string;
    historyClassName: string;
    metaCardClassName: string;
    overviewCardClassName: string;
    summaryClassName: string;
    userCardClassName: string;
  }
> = {
  ADMIN: {
    bulletClassName: "bg-amber-400",
    columnClassName:
      "border-amber-200/80 bg-gradient-to-br from-amber-50/85 via-white to-white shadow-[0_18px_38px_rgba(180,83,9,0.09)]",
    countBadgeClassName:
      "border-amber-200 bg-amber-50 text-amber-900 group-open:bg-amber-500 group-open:text-white",
    emptyClassName: "border-amber-200 bg-amber-50 text-amber-900",
    historyClassName: "border-amber-200/80 bg-amber-50/70",
    metaCardClassName: "border-amber-200/70 bg-amber-50/60",
    overviewCardClassName:
      "border-amber-200/80 bg-gradient-to-br from-amber-50 to-white text-amber-900",
    summaryClassName:
      "border-amber-200/70 bg-gradient-to-r from-amber-100/80 via-white to-white",
    userCardClassName:
      "border-amber-200/75 bg-gradient-to-br from-white via-amber-50/65 to-white shadow-[0_14px_30px_rgba(180,83,9,0.1)] before:bg-amber-400",
  },
  STUDENT: {
    bulletClassName: "bg-sky-400",
    columnClassName:
      "border-sky-200/80 bg-gradient-to-br from-sky-50/85 via-white to-white shadow-[0_18px_38px_rgba(14,116,144,0.08)]",
    countBadgeClassName:
      "border-sky-200 bg-sky-50 text-sky-900 group-open:bg-sky-500 group-open:text-white",
    emptyClassName: "border-sky-200 bg-sky-50 text-sky-900",
    historyClassName: "border-sky-200/80 bg-sky-50/70",
    metaCardClassName: "border-sky-200/70 bg-sky-50/60",
    overviewCardClassName:
      "border-sky-200/80 bg-gradient-to-br from-sky-50 to-white text-sky-900",
    summaryClassName:
      "border-sky-200/70 bg-gradient-to-r from-sky-100/80 via-white to-white",
    userCardClassName:
      "border-sky-200/75 bg-gradient-to-br from-white via-sky-50/65 to-white shadow-[0_14px_30px_rgba(14,116,144,0.1)] before:bg-sky-400",
  },
  TEACHER: {
    bulletClassName: "bg-pink-400",
    columnClassName:
      "border-pink-200/80 bg-gradient-to-br from-pink-50/85 via-white to-white shadow-[0_18px_38px_rgba(190,24,93,0.08)]",
    countBadgeClassName:
      "border-pink-200 bg-pink-50 text-pink-900 group-open:bg-pink-500 group-open:text-white",
    emptyClassName: "border-pink-200 bg-pink-50 text-pink-900",
    historyClassName: "border-pink-200/80 bg-pink-50/70",
    metaCardClassName: "border-pink-200/70 bg-pink-50/60",
    overviewCardClassName:
      "border-pink-200/80 bg-gradient-to-br from-pink-50 to-white text-pink-900",
    summaryClassName:
      "border-pink-200/70 bg-gradient-to-r from-pink-100/80 via-white to-white",
    userCardClassName:
      "border-pink-200/75 bg-gradient-to-br from-white via-pink-50/65 to-white shadow-[0_14px_30px_rgba(190,24,93,0.1)] before:bg-pink-400",
  },
};

const roleMetricStyles: Record<Role, string> = {
  ADMIN: "border-amber-200/80 bg-amber-50/80 text-amber-900",
  STUDENT: "border-sky-200/80 bg-sky-50/80 text-sky-900",
  TEACHER: "border-pink-200/80 bg-pink-50/80 text-pink-900",
};

const roleIcons = {
  ADMIN: ShieldCheck,
  TEACHER: GraduationCap,
  STUDENT: UserRound,
} satisfies Record<Role, ComponentType<SVGProps<SVGSVGElement>>>;

const roleLabels = {
  ADMIN: "Admins",
  STUDENT: "Alunos",
  TEACHER: "Teachers",
} satisfies Record<Role, string>;

const roleDescriptions = {
  ADMIN: "Controle e seguranca",
  STUDENT: "Acesso de estudo",
  TEACHER: "Rotina pedagogica",
} satisfies Record<Role, string>;

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
  return typeof value === "string" && adminTaskIds.includes(value as AdminTask)
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

function getUserPrimaryPhone(user: AdminUserRow) {
  return user.role === "STUDENT"
    ? user.studentProfile?.studentPhone ?? user.phone
    : user.phone;
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

function getUserInitials(user: AdminUserRow) {
  const words = user.name.trim().split(/\s+/).filter(Boolean).slice(0, 2);

  const initials = words.map((word) => word.charAt(0).toUpperCase()).join("");

  return initials || user.email.charAt(0).toUpperCase();
}

function getUserAttentionLabel(user: AdminUserRow) {
  if (!user.isActive) {
    return "Acesso inativo";
  }

  if (user.role === "STUDENT") {
    const assignments = user.studentProfile?._count.teacherAssignments ?? 0;

    if (assignments === 0) {
      return "Sem teacher";
    }

    if (!user.studentProfile?.level) {
      return "Nivel pendente";
    }

    return "Aluno pronto";
  }

  if (user.role === "TEACHER") {
    const assignments = user.teacherProfile?._count.studentAssignments ?? 0;

    if (assignments === 0) {
      return "Sem alunos";
    }

    if (!user.teacherProfile?.bio) {
      return "Bio pendente";
    }

    return "Teacher pronta";
  }

  return "Admin ativo";
}

function getUserAttentionClassName(user: AdminUserRow, label: string) {
  if (!user.isActive) {
    return "border-slate-200 bg-slate-50 text-slate-700";
  }

  if (
    label.includes("Sem") ||
    label.includes("pendente") ||
    label.includes("inativo")
  ) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-800";
}

function getUserActionHint(user: AdminUserRow, label: string) {
  if (!user.isActive) {
    return "Acesso pausado";
  }

  if (label === "Sem teacher") {
    return "Vincular teacher";
  }

  if (label === "Nivel pendente") {
    return "Definir nivel";
  }

  if (label === "Sem alunos") {
    return "Vincular alunos";
  }

  if (label === "Bio pendente") {
    return "Completar bio";
  }

  return "Cadastro pronto";
}

function getUserInsightMetrics(user: AdminUserRow): UserInsightMetric[] {
  const baseClassName = roleMetricStyles[user.role];

  if (user.role === "STUDENT") {
    const counts = user.studentProfile?._count;

    return [
      {
        className: baseClassName,
        icon: Link2,
        label: "Teachers",
        value: counts?.teacherAssignments ?? 0,
      },
      {
        className: baseClassName,
        icon: CalendarDays,
        label: "Aulas",
        value: counts?.lessons ?? 0,
      },
      {
        className: baseClassName,
        icon: CheckCircle2,
        label: "Envios",
        value: counts?.submissions ?? 0,
      },
    ];
  }

  if (user.role === "TEACHER") {
    const counts = user.teacherProfile?._count;

    return [
      {
        className: baseClassName,
        icon: UserRound,
        label: "Alunos",
        value: counts?.studentAssignments ?? 0,
      },
      {
        className: baseClassName,
        icon: CalendarDays,
        label: "Aulas",
        value: counts?.lessons ?? 0,
      },
      {
        className: baseClassName,
        icon: FileText,
        label: "Homework",
        value: counts?.homeworks ?? 0,
      },
    ];
  }

  return [
    {
      className: baseClassName,
      icon: FileText,
      label: "Contratos",
      value: user._count.uploadedContracts,
    },
    {
      className: baseClassName,
      icon: Mail,
      label: "Mensagens",
      value: user._count.sentChatMessages,
    },
    {
      className: baseClassName,
      icon: ShieldCheck,
      label: "Permissao",
      value: "Admin",
    },
  ];
}

function AdminUserStatCard({ stat }: { stat: AdminUserStat }) {
  const Icon = stat.icon;

  return (
    <div
      className={cn(
        "group relative flex min-w-0 items-center justify-between gap-4 overflow-hidden rounded-lg border p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-5",
        stat.cardClassName,
      )}
    >
      <span
        aria-hidden="true"
        className={cn("absolute inset-x-0 top-0 h-1", stat.barClassName)}
      />
      <div className="min-w-0">
        <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {stat.label}
        </p>
        <strong className="mt-2 block truncate text-2xl font-semibold leading-none text-current sm:text-3xl">
          {stat.value}
        </strong>
        <p className="mt-2 truncate text-xs text-muted-foreground">
          {stat.description}
        </p>
      </div>
      <span
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-lg border shadow-sm transition-transform duration-200 group-hover:-translate-y-0.5",
          stat.accentClassName,
        )}
      >
        <Icon aria-hidden="true" className="size-5" />
      </span>
    </div>
  );
}

function UsersOverview({
  inactiveCount,
  totals,
}: {
  inactiveCount: number;
  totals: Record<Role, number> & {
    active: number;
    total: number;
  };
}) {
  const roles = (["ADMIN", "TEACHER", "STUDENT"] as const).map((role) => {
    const Icon = roleIcons[role];

    return {
      Icon,
      count: totals[role],
      role,
    };
  });

  return (
    <section className="overflow-hidden rounded-lg border border-primary/15 bg-gradient-to-br from-white via-pink-50/45 to-sky-50/55 shadow-[0_18px_42px_rgba(65,42,76,0.09)]">
      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,390px)] lg:items-center">
        <div className="flex min-w-0 gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-pink-500 text-primary-foreground shadow-lg shadow-primary/20">
            <UsersRound aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-primary/65">
              Usuarios do AVA
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal text-primary">
              Base organizada por role
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Acompanhe acesso, cadastros e sinais de pendencia sem misturar
              permissao de admin, teacher e aluno.
            </p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/90 p-3 text-emerald-900 shadow-sm shadow-emerald-900/5">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-sm font-semibold">
                <Power aria-hidden="true" className="size-4" />
                Ativos
              </span>
              <strong className="text-xl font-semibold">{totals.active}</strong>
            </div>
            <p className="mt-1 text-xs text-emerald-800/80">
              {inactiveCount} inativo(s) preservado(s) no historico.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {roles.map(({ Icon, count, role }) => (
              <div
                key={role}
                className={cn(
                  "rounded-lg border p-3 text-center shadow-sm",
                  roleVisualStyles[role].overviewCardClassName,
                )}
              >
                <Icon
                  aria-hidden="true"
                  className="mx-auto size-4 opacity-80"
                />
                <strong className="mt-2 block text-lg font-semibold">
                  {count}
                </strong>
                <span className="text-[0.68rem] font-bold uppercase tracking-[0.12em] opacity-70">
                  {roleLabels[role]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function UsersByRole({ users }: { users: AdminUserRow[] }) {
  if (users.length === 0) {
    return (
      <div className="ava-soft-card flex min-h-56 flex-col items-center justify-center gap-4 rounded-lg border border-dashed p-6 text-center">
        <span className="flex size-12 items-center justify-center rounded-lg border border-primary/15 bg-primary/10 text-primary">
          <UsersRound aria-hidden="true" className="size-5" />
        </span>
        <div className="max-w-sm">
          <h2 className="text-lg font-semibold text-primary">
            Nenhum usuario cadastrado ainda.
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Use as opcoes da lateral para criar o primeiro acesso do AVA.
          </p>
        </div>
      </div>
    );
  }

  const columns = [
    { empty: "Nenhum admin cadastrado.", role: "ADMIN", title: "Admins" },
    {
      empty: "Nenhuma teacher cadastrada.",
      role: "TEACHER",
      title: "Teachers",
    },
    { empty: "Nenhum aluno cadastrado.", role: "STUDENT", title: "Alunos" },
  ] satisfies { empty: string; role: Role; title: string }[];

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      {columns.map((column) => {
        const columnUsers = users.filter((user) => user.role === column.role);
        const activeCount = columnUsers.filter((user) => user.isActive).length;
        const inactiveCount = columnUsers.length - activeCount;
        const activePercent =
          columnUsers.length > 0
            ? Math.round((activeCount / columnUsers.length) * 100)
            : 0;
        const Icon = roleIcons[column.role];
        const visual = roleVisualStyles[column.role];

        return (
          <details
            key={column.role}
            className={cn(
              "group min-w-0 overflow-hidden rounded-lg border",
              visual.columnClassName,
            )}
            open
          >
            <summary
              className={cn(
                "cursor-pointer list-none border-b p-4 [&::-webkit-details-marker]:hidden",
                visual.summaryClassName,
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 gap-3">
                  <span
                    className={cn(
                      "flex size-11 shrink-0 items-center justify-center rounded-lg border shadow-sm",
                      roleStyles[column.role],
                    )}
                  >
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-primary/55">
                      {roleDescriptions[column.role]}
                    </p>
                    <h2 className="mt-1 truncate text-lg font-semibold text-primary">
                      {column.title}
                    </h2>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground">
                      <span>{columnUsers.length} usuario(s)</span>
                      <span
                        className={cn(
                          "size-1 rounded-full",
                          visual.bulletClassName,
                        )}
                      />
                      <span>{activeCount} ativo(s)</span>
                      {inactiveCount > 0 ? (
                        <>
                          <span
                            className={cn(
                              "size-1 rounded-full",
                              visual.bulletClassName,
                            )}
                          />
                          <span>{inactiveCount} inativo(s)</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
                <span
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                    visual.countBadgeClassName,
                  )}
                >
                  {columnUsers.length === 0 ? (
                    "vazio"
                  ) : (
                    <>
                      <span className="group-open:hidden">abrir</span>
                      <span className="hidden group-open:inline">
                        minimizar
                      </span>
                    </>
                  )}
                </span>
              </div>

              <div className="mt-4 rounded-lg border border-white/70 bg-white/72 p-3 shadow-sm">
                <div className="flex items-center justify-between gap-3 text-xs font-semibold text-muted-foreground">
                  <span>Saude da role</span>
                  <strong className="text-primary">
                    {activePercent}% ativo
                  </strong>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-primary/10">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "block h-full rounded-full",
                      visual.bulletClassName,
                    )}
                    style={{ width: `${activePercent}%` }}
                  />
                </div>
              </div>
            </summary>

            <div className="flex flex-col gap-3 p-4">
              {columnUsers.length === 0 ? (
                <p
                  className={cn(
                    "rounded-lg border border-dashed p-4 text-sm",
                    visual.emptyClassName,
                  )}
                >
                  {column.empty}
                </p>
              ) : (
                <>
                  {columnUsers.map((user) => {
                    const history = getUserHistory(user);
                    const attentionLabel = getUserAttentionLabel(user);
                    const attentionClassName = getUserAttentionClassName(
                      user,
                      attentionLabel,
                    );
                    const actionHint = getUserActionHint(user, attentionLabel);
                    const insightMetrics = getUserInsightMetrics(user);
                    const phone = getUserPrimaryPhone(user);
                    const profileSummary = getProfileSummary(user);

                    return (
                      <article
                        key={user.id}
                        className={cn(
                          "relative flex min-w-0 flex-col gap-3 overflow-hidden rounded-lg border p-3 before:absolute before:inset-x-0 before:top-0 before:h-1 before:content-[''] sm:p-4",
                          visual.userCardClassName,
                        )}
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          <span
                            className={cn(
                              "flex size-11 shrink-0 items-center justify-center rounded-lg border text-sm font-semibold shadow-sm",
                              roleStyles[user.role],
                            )}
                          >
                            {getUserInitials(user)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h3 className="truncate text-base font-semibold text-primary">
                                  {user.name}
                                </h3>
                                <p
                                  className="mt-1 flex min-w-0 items-center gap-2 text-sm text-muted-foreground"
                                  title={user.email}
                                >
                                  <Mail
                                    aria-hidden="true"
                                    className="size-4 shrink-0"
                                  />
                                  <span className="truncate">{user.email}</span>
                                </p>
                                {phone ? (
                                  <p
                                    className="mt-1 flex min-w-0 items-center gap-2 text-xs text-muted-foreground"
                                    title={phone}
                                  >
                                    <Phone
                                      aria-hidden="true"
                                      className="size-3.5 shrink-0"
                                    />
                                    <span className="truncate">{phone}</span>
                                  </p>
                                ) : null}
                              </div>
                              <span
                                className={cn(
                                  "inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold",
                                  user.isActive
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                    : "border-slate-200 bg-slate-50 text-slate-700",
                                )}
                              >
                                <UserCheck
                                  aria-hidden="true"
                                  className="size-3.5"
                                />
                                {user.isActive ? "Ativo" : "Inativo"}
                              </span>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <span
                                className={cn(
                                  "inline-flex min-w-0 items-center rounded-full border px-2.5 py-1 text-[0.72rem] font-semibold",
                                  visual.metaCardClassName,
                                )}
                              >
                                <span className="truncate">
                                  {profileSummary}
                                </span>
                              </span>
                              <span
                                className={cn(
                                  "inline-flex min-w-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.72rem] font-semibold",
                                  attentionClassName,
                                )}
                              >
                                <CircleAlert
                                  aria-hidden="true"
                                  className="size-3.5 shrink-0 opacity-70"
                                />
                                <span className="truncate">
                                  {attentionLabel}
                                </span>
                              </span>
                              <span className="inline-flex min-w-0 items-center rounded-full border border-primary/10 bg-white/78 px-2.5 py-1 text-[0.72rem] font-semibold text-primary shadow-sm">
                                <span className="truncate">{actionHint}</span>
                              </span>
                            </div>
                          </div>
                        </div>

                        <details
                          className={cn(
                            "group/user-details rounded-lg border border-primary/10 bg-white/76 p-3 shadow-sm",
                          )}
                        >
                          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground [&::-webkit-details-marker]:hidden">
                            <span className="inline-flex items-center gap-2">
                              <Wrench
                                aria-hidden="true"
                                className="size-4"
                              />
                              Detalhes e acoes
                            </span>
                            <span className="rounded-full bg-white px-2 py-1 text-[0.68rem] tracking-normal">
                              <span className="group-open/user-details:hidden">
                                abrir
                              </span>
                              <span className="hidden group-open/user-details:inline">
                                minimizar
                              </span>
                            </span>
                          </summary>

                          <div className="mt-3 grid gap-3">
                            <div className="grid grid-cols-3 gap-2">
                              {insightMetrics.map((metric) => {
                                const MetricIcon = metric.icon;

                                return (
                                  <div
                                    key={`${user.id}-${metric.label}`}
                                    className={cn(
                                      "min-w-0 rounded-lg border p-2.5 shadow-sm",
                                      metric.className,
                                    )}
                                  >
                                    <div className="flex items-center gap-1.5 text-[0.68rem] font-bold uppercase tracking-[0.1em] opacity-75">
                                      <MetricIcon
                                        aria-hidden="true"
                                        className="size-3.5 shrink-0"
                                      />
                                      <span className="truncate">
                                        {metric.label}
                                      </span>
                                    </div>
                                    <strong className="mt-1 block truncate text-base font-semibold">
                                      {metric.value}
                                    </strong>
                                  </div>
                                );
                              })}
                            </div>

                            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                              <div
                                className={cn(
                                  "rounded-lg border p-3 shadow-sm",
                                  visual.metaCardClassName,
                                )}
                              >
                                <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-primary/55">
                                  Perfil
                                </p>
                                <p className="mt-1 text-sm text-foreground/85">
                                  {profileSummary}
                                </p>
                              </div>
                              <div
                                className={cn(
                                  "rounded-lg border p-3 shadow-sm",
                                  attentionClassName,
                                )}
                              >
                                <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-primary/55">
                                  Sinal
                                </p>
                                <p className="mt-1 inline-flex items-center gap-2 text-sm text-foreground/85">
                                  <CircleAlert
                                    aria-hidden="true"
                                    className="size-4 opacity-70"
                                  />
                                  {attentionLabel}
                                </p>
                              </div>
                            </div>

                            <details
                              className={cn(
                                "group/history rounded-lg border p-3",
                                visual.historyClassName,
                              )}
                            >
                              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground [&::-webkit-details-marker]:hidden">
                                <span className="inline-flex items-center gap-2">
                                  <CalendarDays
                                    aria-hidden="true"
                                    className="size-4"
                                  />
                                  Historico
                                </span>
                                <span className="rounded-full bg-white px-2 py-1 text-[0.68rem] tracking-normal">
                                  <span className="group-open/history:hidden">
                                    abrir
                                  </span>
                                  <span className="hidden group-open/history:inline">
                                    minimizar
                                  </span>
                                </span>
                              </summary>
                              <ul className="mt-3 grid gap-1.5 text-sm text-muted-foreground">
                                {history.map((item) => (
                                  <li
                                    key={item}
                                    className="flex items-start gap-2"
                                  >
                                    <span
                                      className={cn(
                                        "mt-2 size-1.5 shrink-0 rounded-full",
                                        visual.bulletClassName,
                                      )}
                                    />
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </details>

                            {user.role === "STUDENT" ? (
                              <AdminStudentContactEditForm
                                email={user.email}
                                phone={phone}
                                userId={user.id}
                                userName={user.name}
                              />
                            ) : null}

                            <div
                              className="grid gap-3 border-t border-primary/10 pt-3"
                              aria-label={`Acoes de acesso de ${user.name}`}
                            >
                              <div className="flex items-center justify-between gap-3 text-xs font-semibold text-muted-foreground">
                                <span>Acoes de acesso</span>
                                <span className="rounded-full border border-primary/10 bg-white/78 px-2.5 py-1 text-primary shadow-sm">
                                  {actionHint}
                                </span>
                              </div>
                              <AdminUserStatusButton
                                isActive={user.isActive}
                                userId={user.id}
                              />
                              <AdminUserPasswordResetForm
                                userId={user.id}
                                userName={user.name}
                              />
                            </div>
                          </div>
                        </details>
                      </article>
                    );
                  })}
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

  const teacherGroups = assignments.reduce<
    Array<{
      students: AssignmentRow[];
      teacherEmail: string;
      teacherName: string;
      teacherProfileId: string;
    }>
  >((groups, assignment) => {
    const group = groups.find(
      (item) => item.teacherProfileId === assignment.teacherProfileId,
    );

    if (group) {
      group.students.push(assignment);
      return groups;
    }

    return [
      ...groups,
      {
        students: [assignment],
        teacherEmail: assignment.teacherEmail,
        teacherName: assignment.teacherName,
        teacherProfileId: assignment.teacherProfileId,
      },
    ];
  }, []);
  if (assignments.length === 0) {
    return (
      <div className="flex min-h-52 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-primary/20 bg-primary/[0.035] p-6 text-center">
        <span className="flex size-11 items-center justify-center rounded-lg bg-white text-primary shadow-sm ring-1 ring-primary/10">
          <Link2 aria-hidden="true" className="size-5" />
        </span>
        <p className="max-w-sm text-sm leading-6 text-muted-foreground">
          Nenhum vinculo teacher-aluno foi criado ainda.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 xl:grid-cols-2">
        {teacherGroups.map((group) => (
          <article
            key={group.teacherProfileId}
            className="overflow-hidden rounded-lg border border-primary/15 bg-white/90 shadow-[0_12px_28px_rgba(65,42,76,0.07)]"
          >
            <div className="border-b border-primary/10 bg-gradient-to-r from-primary/[0.08] to-secondary/30 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
                    <GraduationCap aria-hidden="true" className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-primary">
                      {group.teacherName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {group.teacherEmail}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 rounded-full border border-primary/15 bg-white/88 px-2.5 py-1 text-xs font-semibold text-primary shadow-sm">
                  {group.students.length} aluno(s)
                </span>
              </div>
            </div>

            <div className="grid gap-2 p-3">
              {group.students.map((assignment) => (
                <div
                  key={assignment.id}
                  className="grid gap-3 rounded-md border border-primary/10 bg-white/82 p-3 shadow-[0_6px_18px_rgba(65,42,76,0.04)] sm:grid-cols-[minmax(0,1fr)_auto]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground ring-1 ring-primary/5">
                      <UserRound aria-hidden="true" className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-primary">
                        {assignment.studentName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {assignment.studentEmail}
                      </p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 sm:self-center">
                    <CheckCircle2 aria-hidden="true" className="size-3.5" />
                    desde {formatDate(assignment.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function AssignmentOverview({ assignments }: { assignments: AssignmentRow[] }) {
  const teacherCount = new Set(
    assignments.map((assignment) => assignment.teacherProfileId),
  ).size;
  const studentCount = new Set(
    assignments.map((assignment) => assignment.studentProfileId),
  ).size;

  return (
    <div className="grid gap-4">
      <div className="rounded-lg border border-primary/12 bg-gradient-to-br from-white/90 via-white/82 to-primary/[0.055] p-4 shadow-[0_12px_28px_rgba(65,42,76,0.07)]">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-primary/8 px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-primary">
              <Link2 aria-hidden="true" className="size-3.5" />
              Mapa de acesso
            </span>
            <h2 className="mt-3 text-lg font-semibold text-primary">
              Quem esta vinculado a quem
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Cada card mostra uma teacher e os alunos que aparecem para ela no
              AVA.
            </p>
          </div>
          <div className="grid w-full gap-2 sm:grid-cols-3 lg:w-[23rem]">
            <div className="rounded-lg border border-primary/10 bg-white/80 px-3 py-2 shadow-sm">
              <span className="block text-[0.65rem] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                Teachers
              </span>
              <strong className="text-lg text-primary">{teacherCount}</strong>
            </div>
            <div className="rounded-lg border border-primary/10 bg-white/80 px-3 py-2 shadow-sm">
              <span className="block text-[0.65rem] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                Alunos
              </span>
              <strong className="text-lg text-primary">{studentCount}</strong>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/90 px-3 py-2 text-emerald-900 shadow-sm">
              <span className="block text-[0.65rem] font-bold uppercase tracking-[0.08em]">
                Vinculos
              </span>
              <strong className="text-lg">{assignments.length}</strong>
            </div>
          </div>
        </div>
      </div>

      <AssignmentList assignments={assignments} />
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
  const inactiveUsersCount = totals.total - totals.active;

  const stats = [
    {
      accentClassName: "border-primary/20 bg-primary/10 text-primary",
      barClassName: "bg-primary",
      cardClassName:
        "border-violet-200/80 bg-gradient-to-br from-white via-violet-50/85 to-white text-primary",
      description: "Base completa",
      icon: UsersRound,
      label: "Usuarios",
      value: totals.total,
    },
    {
      accentClassName: "border-pink-200 bg-pink-50 text-pink-800",
      barClassName: "bg-pink-400",
      cardClassName:
        "border-pink-200/80 bg-gradient-to-br from-white via-pink-50/85 to-white text-pink-900",
      description: "Equipe pedagogica",
      icon: GraduationCap,
      label: "Teachers",
      value: totals.TEACHER,
    },
    {
      accentClassName: "border-sky-200 bg-sky-50 text-sky-800",
      barClassName: "bg-sky-400",
      cardClassName:
        "border-sky-200/80 bg-gradient-to-br from-white via-sky-50/85 to-white text-sky-900",
      description: "Contas STUDENT",
      icon: UserRound,
      label: "Alunos",
      value: totals.STUDENT,
    },
    {
      accentClassName: "border-emerald-200 bg-emerald-50 text-emerald-800",
      barClassName: "bg-emerald-400",
      cardClassName:
        "border-emerald-200/80 bg-gradient-to-br from-white via-emerald-50/85 to-white text-emerald-900",
      description: `${inactiveUsersCount} inativo(s)`,
      icon: Power,
      label: "Ativos",
      value: totals.active,
    },
    {
      accentClassName: "border-amber-200 bg-amber-50 text-amber-800",
      barClassName: "bg-amber-400",
      cardClassName:
        "border-amber-200/80 bg-gradient-to-br from-white via-amber-50/85 to-white text-amber-900",
      description: "Storage protegido",
      icon: HardDrive,
      label: "Arquivos",
      value: formatBytes(storageUsageBytes),
    },
  ] satisfies AdminUserStat[];
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
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:gap-8 sm:px-6 sm:py-10 lg:px-8">
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
        <CardHeader className="ava-task-header border-b border-primary/15 bg-primary/10 px-4 py-5 sm:px-7">
          <div className="flex min-h-12 flex-col items-center justify-center gap-3 text-center sm:relative sm:flex-row">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm sm:absolute sm:left-0">
              <TaskIcon aria-hidden="true" />
            </span>
            <CardTitle className="px-0 text-center text-lg sm:px-14 sm:text-xl">
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
              <UsersOverview
                inactiveCount={inactiveUsersCount}
                totals={totals}
              />
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {stats.map((stat) => (
                  <AdminUserStatCard key={stat.label} stat={stat} />
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
            <AdminCreateUserForm
              fixedRole="STUDENT"
              submitLabel="Criar aluno"
            />
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
            <div className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
              <AdminAssignTeacherForm students={students} teachers={teachers} />
              <AssignmentOverview assignments={assignments} />
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
