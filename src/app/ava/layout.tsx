import Link from "next/link";
import {
  BookOpen,
  ChevronDown,
  ClipboardCheck,
  FileText,
  GraduationCap,
  Home,
  LayoutDashboard,
  Link2,
  LockKeyhole,
  MessageSquareText,
  PencilLine,
  Radio,
  Settings,
  UserPlus,
  UserRound,
  UsersRound,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { canAccessRole, isRole, ROLE_LABELS } from "@/lib/roles";
import { BrandLogo } from "@/components/site/brand-logo";
import { Button } from "@/components/ui/button";
import { AvaStudentBackdrop } from "@/components/ava/ava-student-backdrop";

const navGroups = [
  {
    allowedRoles: ["ADMIN"] as const,
    href: "/ava/admin?task=usuarios",
    icon: Settings,
    label: "Admin",
    links: [
      {
        href: "/ava/admin?task=usuarios",
        icon: UsersRound,
        label: "Usuarios",
      },
      {
        href: "/ava/admin?task=criar-admin",
        icon: UserPlus,
        label: "Criar admin",
      },
      {
        href: "/ava/admin?task=criar-teacher",
        icon: GraduationCap,
        label: "Criar teacher",
      },
      {
        href: "/ava/admin?task=criar-aluno",
        icon: UserRound,
        label: "Criar aluno",
      },
      {
        href: "/ava/admin?task=vincular-aluno",
        icon: Link2,
        label: "Vincular aluno",
      },
      {
        href: "/ava/teacher?task=aula-ao-vivo",
        icon: Radio,
        label: "Aula ao vivo",
      },
      {
        href: "/ava/teacher?task=criar-aula",
        icon: BookOpen,
        label: "Criar aula",
      },
      {
        href: "/ava/teacher?task=criar-homework",
        icon: ClipboardCheck,
        label: "Criar homework",
      },
      {
        href: "/ava/teacher?task=corrigir-respostas",
        icon: ClipboardCheck,
        label: "Corrigir homework",
      },
      {
        href: "/ava/teacher?task=mensagens",
        icon: MessageSquareText,
        label: "Mensagens",
      },
      {
        href: "/ava/admin?task=contratos",
        icon: FileText,
        label: "Contratos PDF",
      },
      {
        href: "/ava/admin?task=editar-site",
        icon: PencilLine,
        label: "Manutencao",
      },
    ],
  },
  {
    allowedRoles: ["ADMIN", "TEACHER"] as const,
    href: "/ava/teacher?task=resumo",
    icon: GraduationCap,
    label: "Teacher",
    links: [
      {
        href: "/ava/teacher?task=aula-ao-vivo",
        icon: Radio,
        label: "Aula ao vivo",
      },
      {
        href: "/ava/teacher?task=criar-aula",
        icon: BookOpen,
        label: "Criar aula",
      },
      {
        href: "/ava/teacher?task=criar-homework",
        icon: ClipboardCheck,
        label: "Criar homework",
      },
      {
        href: "/ava/teacher?task=corrigir-respostas",
        icon: ClipboardCheck,
        label: "Corrigir homework",
      },
      {
        href: "/ava/teacher?task=mensagens",
        icon: MessageSquareText,
        label: "Mensagens",
      },
      {
        href: "/ava/teacher?task=contratos",
        icon: FileText,
        label: "Contratos PDF",
      },
    ],
  },
  {
    allowedRoles: ["ADMIN", "TEACHER", "STUDENT"] as const,
    href: "/ava/student?task=resumo",
    icon: UserRound,
    label: "Student",
    links: [
      {
        href: "/ava/student?task=aula-ao-vivo",
        icon: Radio,
        label: "Aula ao vivo",
      },
      {
        href: "/ava/student?task=aulas",
        icon: BookOpen,
        label: "Aulas e materiais",
      },
      {
        href: "/ava/student?task=homeworks",
        icon: ClipboardCheck,
        label: "Responder homework",
      },
      {
        href: "/ava/student?task=mensagens",
        icon: MessageSquareText,
        label: "Mensagens",
      },
      {
        href: "/ava/student?task=contratos",
        icon: FileText,
        label: "Meus contratos",
      },
      {
        href: "/ava/student?task=perfil",
        icon: UserRound,
        label: "Meu perfil",
      },
    ],
  },
];

export default async function AvaLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const role = isRole(session?.user?.role) ? session.user.role : null;
  const visibleGroups = role
    ? navGroups.filter((link) => canAccessRole(role, link.allowedRoles))
    : [];

  if (!role) {
    return <div className="min-h-screen overflow-x-hidden">{children}</div>;
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background">
      <AvaStudentBackdrop />
      <div className="relative z-10 grid min-h-screen lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="ava-sidebar-glass relative overflow-hidden border-b border-white/45 backdrop-blur-2xl lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <div className="flex h-full flex-col gap-6 px-5 py-5 lg:px-6 lg:py-6">
            <div className="flex items-center justify-between gap-3">
              <BrandLogo
                className="h-12 w-[180px] sm:h-14 sm:w-[205px]"
                imageClassName="w-[215px] sm:w-[250px]"
              />
              <Button asChild variant="outline" className="px-3">
                <Link href="/">
                  <Home aria-hidden="true" />
                  Home
                </Link>
              </Button>
            </div>

            <div className="rounded-2xl border border-white/50 bg-white/60 p-4 shadow-sm backdrop-blur-xl lg:p-5">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <LayoutDashboard aria-hidden="true" />
                </span>
                <div className="min-w-0 text-sm">
                  <p className="truncate font-semibold">
                    {session?.user?.name ?? "Visitante"}
                  </p>
                  <p className="truncate text-muted-foreground">
                    {role ? ROLE_LABELS[role] : "Sem login"}
                  </p>
                </div>
              </div>
            </div>

            <nav className="flex flex-col gap-2" aria-label="Navegacao do AVA">
              {visibleGroups.map((group) => {
                if (role === "STUDENT" && group.label === "Student") {
                  return (
                    <div
                      key={group.href}
                      className="rounded-2xl border border-white/50 bg-white/50 p-3 shadow-lg shadow-primary/5 backdrop-blur-xl lg:p-4"
                    >
                      <div className="mb-2 flex items-center gap-2 px-2 py-1 text-sm font-bold text-primary">
                        <group.icon aria-hidden="true" className="size-4" />
                        Student
                      </div>
                      <div className="flex flex-col gap-2">
                        <Link
                          href={group.href}
                          className="rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/10 transition-transform hover:-translate-y-0.5 hover:bg-primary/90 lg:px-5"
                        >
                          Painel Student
                        </Link>
                        {group.links.map((link) => (
                          <Link
                            key={`${group.href}-${link.href}-${link.label}`}
                            href={link.href}
                            className="flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-4 py-2.5 text-sm font-semibold text-primary shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-secondary/80 hover:shadow-md lg:px-5"
                          >
                            <link.icon aria-hidden="true" className="size-4" />
                            {link.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  );
                }

                return (
                  <details
                    key={group.href}
                    open={
                      (group.label === "Admin" && role === "ADMIN") ||
                      (group.label === "Student" && role === "STUDENT")
                    }
                    className="group rounded-lg"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-foreground outline-none transition-colors hover:bg-muted [&::-webkit-details-marker]:hidden">
                      <span className="flex min-w-0 items-center gap-2">
                        <group.icon aria-hidden="true" className="size-4" />
                        {group.label}
                      </span>
                      <ChevronDown
                        aria-hidden="true"
                        className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                      />
                    </summary>

                    <div className="ml-5 mt-1 flex flex-col gap-1 border-l pl-3">
                      <Link
                        href={group.href}
                        className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        Painel {group.label}
                      </Link>
                      {group.links.map((link) => (
                        <Link
                          key={`${group.href}-${link.href}-${link.label}`}
                          href={link.href}
                          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <link.icon aria-hidden="true" className="size-4" />
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  </details>
                );
              })}
              {!role ? (
                <Button asChild variant="ghost" className="justify-start">
                  <Link href="/ava/login">
                    <LockKeyhole data-icon="inline-start" />
                    Login
                  </Link>
                </Button>
              ) : null}
            </nav>

          </div>
        </aside>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
