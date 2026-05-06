import {
  CalendarDays,
  GraduationCap,
  Mail,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { AdminCreateUserForm } from "@/components/ava/admin-create-user-form";
import { SignOutButton } from "@/components/ava/sign-out-button";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AdminUserRow = {
  createdAt: Date;
  email: string;
  id: string;
  name: string;
  role: Role;
  studentProfile: {
    level: string | null;
  } | null;
  teacherProfile: {
    bio: string | null;
  } | null;
};

type AdminUsersPanelProps = {
  currentUser: {
    email: string;
    name?: string | null;
    role: Role;
  };
  users: AdminUserRow[];
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

export function AdminUsersPanel({ currentUser, users }: AdminUsersPanelProps) {
  const totals = users.reduce(
    (accumulator, user) => {
      accumulator.total += 1;
      accumulator[user.role] += 1;
      return accumulator;
    },
    {
      ADMIN: 0,
      STUDENT: 0,
      TEACHER: 0,
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
  ];

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
        <div className="flex flex-col gap-5">
          <div className="inline-flex w-fit items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm text-muted-foreground">
            <ShieldCheck aria-hidden="true" />
            Painel protegido por role ADMIN
          </div>
          <div className="flex flex-col gap-4">
            <h1 className="max-w-4xl text-3xl font-semibold leading-tight tracking-normal md:text-5xl">
              Organizacao do AVA Candy English
            </h1>
            <p className="max-w-3xl text-base leading-7 text-muted-foreground md:text-lg">
              Cadastre teachers e alunos, acompanhe quem ja tem acesso e mantenha
              a base pronta para as proximas fases de aulas, materiais e
              homeworks.
            </p>
          </div>
        </div>

        <Card className="bg-primary text-primary-foreground">
          <CardHeader>
            <CardTitle>Usuario logado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1 text-sm">
                <span className="text-primary-foreground/75">Nome</span>
                <strong>{currentUser.name ?? "Sem nome"}</strong>
              </div>
              <div className="flex flex-col gap-1 text-sm">
                <span className="text-primary-foreground/75">Email</span>
                <strong className="break-all">{currentUser.email}</strong>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-primary-foreground/75">
                  Perfil
                </span>
                <span className="rounded-md bg-primary-foreground px-2 py-1 text-xs font-semibold text-primary">
                  {ROLE_LABELS[currentUser.role]}
                </span>
              </div>
              <SignOutButton />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">
                  {stat.label}
                </span>
                <strong className="text-3xl font-semibold">{stat.value}</strong>
              </div>
              <span className="flex size-11 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                <stat.icon aria-hidden="true" />
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.3fr]">
        <Card>
          <CardHeader>
            <CardTitle>Cadastrar acesso</CardTitle>
          </CardHeader>
          <CardContent>
            <AdminCreateUserForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usuarios do AVA</CardTitle>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-muted/40 text-center">
                <UsersRound aria-hidden="true" />
                <p className="max-w-sm text-sm text-muted-foreground">
                  Nenhum usuario cadastrado ainda. Crie o primeiro acesso pelo
                  formulario ao lado.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="py-3 pr-4 font-medium">Usuario</th>
                      <th className="px-4 py-3 font-medium">Perfil</th>
                      <th className="px-4 py-3 font-medium">Resumo</th>
                      <th className="pl-4 py-3 font-medium">Criado em</th>
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
                          <td className="px-4 py-4 text-muted-foreground">
                            {getProfileSummary(user)}
                          </td>
                          <td className="pl-4 py-4 text-muted-foreground">
                            <span className="inline-flex items-center gap-2">
                              <CalendarDays aria-hidden="true" />
                              {dateFormatter.format(user.createdAt)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
