import {
  CalendarDays,
  GraduationCap,
  Link2,
  Mail,
  PencilLine,
  Power,
  ShieldCheck,
  UserCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { AdminCreateUserForm } from "@/components/ava/admin-create-user-form";
import {
  AdminAssignTeacherForm,
  AdminUserStatusButton,
} from "@/components/ava/admin-operations";
import { AdminSiteContentForm } from "@/components/ava/admin-site-content-form";
import { UserSummaryPanel } from "@/components/ava/user-summary-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import { cn } from "@/lib/utils";

export const adminTaskIds = [
  "usuarios",
  "criar-admin",
  "criar-teacher",
  "criar-aluno",
  "vincular-aluno",
  "editar-site",
] as const;

export type AdminTask = (typeof adminTaskIds)[number];

type AdminUserRow = {
  createdAt: Date;
  email: string;
  id: string;
  isActive: boolean;
  name: string;
  role: Role;
  studentProfile: {
    level: string | null;
  } | null;
  teacherProfile: {
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

type SiteContentRow = {
  ctaLabel: string | null;
  description: string;
  slug: "home" | "sobre" | "metodologia" | "planos" | "contato";
  title: string;
};

type AdminUsersPanelProps = {
  activeTask: AdminTask;
  assignments: AssignmentRow[];
  currentUser: {
    email: string;
    name?: string | null;
    role: Role;
  };
  siteContents: SiteContentRow[];
  students: AssignmentOption[];
  teachers: AssignmentOption[];
  users: AdminUserRow[];
};

type TaskMeta = {
  description: string;
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
    description:
      "Crie um novo administrador com acesso total ao AVA. Use com cuidado porque este perfil altera usuarios e conteudo.",
    icon: ShieldCheck,
    title: "Criar admin",
  },
  "criar-aluno": {
    description:
      "Cadastre o aluno com login, senha provisoria e data de nascimento para o sistema calcular a idade automaticamente.",
    icon: UserRound,
    title: "Criar aluno",
  },
  "criar-teacher": {
    description:
      "Crie uma teacher para organizar aulas, homeworks, contratos e aulas ao vivo dos alunos vinculados.",
    icon: GraduationCap,
    title: "Criar teacher",
  },
  "editar-site": {
    description:
      "Edite os textos principais das paginas institucionais sem mexer no codigo.",
    icon: PencilLine,
    title: "Editar site",
  },
  usuarios: {
    description:
      "Acompanhe todos os acessos do AVA, veja status e desative usuarios sem apagar historico.",
    icon: UsersRound,
    title: "Usuarios",
  },
  "vincular-aluno": {
    description:
      "Defina qual teacher acompanha cada aluno. Esse vinculo controla o que aparece no painel da teacher.",
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

function UsersTable({ users }: { users: AdminUserRow[] }) {
  if (users.length === 0) {
    return (
      <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-muted/40 text-center">
        <UsersRound aria-hidden="true" />
        <p className="max-w-sm text-sm text-muted-foreground">
          Nenhum usuario cadastrado ainda. Use as opcoes da lateral para criar o
          primeiro acesso.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[920px] text-left text-sm">
        <thead className="border-b text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="py-3 pr-4 font-medium">Usuario</th>
            <th className="px-4 py-3 font-medium">Perfil</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Resumo</th>
            <th className="px-4 py-3 font-medium">Criado em</th>
            <th className="py-3 pl-4 font-medium">Acao</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {users.map((user) => {
            const Icon = roleIcons[user.role];

            return (
              <tr key={user.id} className="align-top">
                <td className="py-4 pr-4">
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">{user.name}</span>
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Mail aria-hidden="true" />
                      {user.email}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span
                    className={cn(
                      "inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs font-semibold",
                      roleStyles[user.role],
                    )}
                  >
                    <Icon aria-hidden="true" />
                    {ROLE_LABELS[user.role]}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span
                    className={cn(
                      "inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs font-semibold",
                      user.isActive
                        ? "border-primary/20 bg-primary/10 text-primary"
                        : "border-border bg-muted text-muted-foreground",
                    )}
                  >
                    <UserCheck aria-hidden="true" />
                    {user.isActive ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="px-4 py-4 text-muted-foreground">
                  {getProfileSummary(user)}
                </td>
                <td className="px-4 py-4 text-muted-foreground">
                  <span className="inline-flex items-center gap-2">
                    <CalendarDays aria-hidden="true" />
                    {formatDate(user.createdAt)}
                  </span>
                </td>
                <td className="py-4 pl-4">
                  <AdminUserStatusButton
                    isActive={user.isActive}
                    userId={user.id}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AssignmentList({ assignments }: { assignments: AssignmentRow[] }) {
  if (assignments.length === 0) {
    return (
      <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-muted/40 text-center">
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
        <div key={assignment.id} className="rounded-lg border bg-background p-4">
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

export function AdminUsersPanel({
  activeTask,
  assignments,
  currentUser,
  siteContents,
  students,
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
  ];
  const task = taskMeta[activeTask];
  const TaskIcon = task.icon;

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10 lg:px-8">
      <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
        <div className="flex min-w-0 flex-col gap-5">
          <div className="inline-flex w-fit items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm text-muted-foreground">
            <ShieldCheck aria-hidden="true" />
            Painel protegido por role ADMIN
          </div>
          <div className="flex flex-col gap-4">
            <h1 className="max-w-4xl text-3xl font-semibold leading-tight tracking-normal md:text-5xl">
              Admin Candy English
            </h1>
            <p className="max-w-3xl text-base leading-7 text-muted-foreground md:text-lg">
              Use a lateral para abrir uma tarefa por vez: usuarios, criacao de
              acessos, vinculo aluno-teacher ou edicao do site.
            </p>
          </div>
        </div>

        <UserSummaryPanel
          email={currentUser.email}
          name={currentUser.name}
          role={currentUser.role}
        />
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-muted/30">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <TaskIcon aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <CardTitle className="text-xl">{task.title}</CardTitle>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                  {task.description}
                </p>
              </div>
            </div>
            <span className="inline-flex w-fit items-center rounded-md border bg-background px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {activeTask.replace("-", " ")}
            </span>
          </div>
        </CardHeader>
        <CardContent className="py-6">
          {activeTask === "usuarios" ? (
            <div className="flex flex-col gap-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="flex items-center justify-between gap-4 rounded-lg border bg-background p-5"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="text-sm text-muted-foreground">
                        {stat.label}
                      </span>
                      <strong className="text-3xl font-semibold">
                        {stat.value}
                      </strong>
                    </div>
                    <span className="flex size-11 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                      <stat.icon aria-hidden="true" />
                    </span>
                  </div>
                ))}
              </div>
              <UsersTable users={users} />
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

          {activeTask === "vincular-aluno" ? (
            <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
              <AdminAssignTeacherForm students={students} teachers={teachers} />
              <div className="flex flex-col gap-3">
                <h2 className="text-lg font-semibold">Vinculos atuais</h2>
                <AssignmentList assignments={assignments} />
              </div>
            </div>
          ) : null}

          {activeTask === "editar-site" ? (
            <AdminSiteContentForm contents={siteContents} />
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
