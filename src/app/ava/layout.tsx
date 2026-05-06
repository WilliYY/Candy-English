import Link from "next/link";
import {
  BookOpen,
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

const avaLinks = [
  {
    allowedRoles: ["ADMIN"] as const,
    href: "/ava/admin",
    icon: Settings,
    label: "Admin",
  },
  {
    allowedRoles: ["ADMIN", "TEACHER"] as const,
    href: "/ava/teacher",
    icon: GraduationCap,
    label: "Teacher",
  },
  {
    allowedRoles: ["ADMIN", "TEACHER", "STUDENT"] as const,
    href: "/ava/student",
    icon: UserRound,
    label: "Student",
  },
];

const taskLinks = [
  {
    allowedRoles: ["ADMIN"] as const,
    href: "/ava/admin#conteudo-site",
    icon: PencilLine,
    label: "Editar site",
  },
  {
    allowedRoles: ["ADMIN"] as const,
    href: "/ava/admin#cadastrar-acesso",
    icon: UserPlus,
    label: "Criar admin",
  },
  {
    allowedRoles: ["ADMIN"] as const,
    href: "/ava/admin#cadastrar-acesso",
    icon: GraduationCap,
    label: "Criar teacher",
  },
  {
    allowedRoles: ["ADMIN"] as const,
    href: "/ava/admin#cadastrar-acesso",
    icon: UserRound,
    label: "Criar aluno",
  },
  {
    allowedRoles: ["ADMIN"] as const,
    href: "/ava/admin#vincular-teacher",
    icon: Link2,
    label: "Vincular aluno",
  },
  {
    allowedRoles: ["ADMIN"] as const,
    href: "/ava/admin#usuarios",
    icon: UsersRound,
    label: "Usuarios",
  },
  {
    allowedRoles: ["ADMIN", "TEACHER"] as const,
    href: "/ava/teacher#aula-ao-vivo",
    icon: Radio,
    label: "Aula ao vivo",
  },
  {
    allowedRoles: ["ADMIN", "TEACHER"] as const,
    href: "/ava/teacher#criar-aula",
    icon: BookOpen,
    label: "Criar aula",
  },
  {
    allowedRoles: ["ADMIN", "TEACHER"] as const,
    href: "/ava/teacher#criar-homework",
    icon: ClipboardCheck,
    label: "Criar homework",
  },
  {
    allowedRoles: ["ADMIN", "TEACHER"] as const,
    href: "/ava/teacher#corrigir-homeworks",
    icon: MessageSquareText,
    label: "Corrigir respostas",
  },
  {
    allowedRoles: ["ADMIN", "TEACHER"] as const,
    href: "/ava/teacher#contratos",
    icon: FileText,
    label: "Contratos PDF",
  },
  {
    allowedRoles: ["ADMIN", "TEACHER", "STUDENT"] as const,
    href: "/ava/student#aulas",
    icon: BookOpen,
    label: "Aulas e materiais",
  },
  {
    allowedRoles: ["ADMIN", "TEACHER", "STUDENT"] as const,
    href: "/ava/student#homeworks",
    icon: ClipboardCheck,
    label: "Responder homework",
  },
  {
    allowedRoles: ["ADMIN", "TEACHER", "STUDENT"] as const,
    href: "/ava/student#contratos",
    icon: FileText,
    label: "Meus contratos",
  },
  {
    allowedRoles: ["ADMIN", "TEACHER", "STUDENT"] as const,
    href: "/ava/student#perfil",
    icon: UserRound,
    label: "Meu perfil",
  },
];

export default async function AvaLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const role = isRole(session?.user?.role) ? session.user.role : null;
  const visibleLinks = role
    ? avaLinks.filter((link) => canAccessRole(role, link.allowedRoles))
    : [];
  const visibleTaskLinks = role
    ? taskLinks.filter((link) => canAccessRole(role, link.allowedRoles))
    : [];

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="border-b bg-card/95 backdrop-blur lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <div className="flex h-full flex-col gap-6 px-5 py-5">
            <div className="flex items-center justify-between gap-3">
              <BrandLogo
                className="h-12 w-[170px] sm:h-14 sm:w-[200px]"
                imageClassName="w-[205px] sm:w-[245px]"
              />
              <Button asChild variant="outline" size="icon">
                <Link href="/">
                  <Home aria-hidden="true" />
                  <span className="sr-only">Site</span>
                </Link>
              </Button>
            </div>

            <div className="rounded-lg bg-muted p-4">
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
              {visibleLinks.map((link) => (
                <Button
                  key={link.href}
                  asChild
                  variant="ghost"
                  className="justify-start"
                >
                  <Link href={link.href}>
                    <link.icon data-icon="inline-start" />
                    {link.label}
                  </Link>
                </Button>
              ))}
              {!role ? (
                <Button asChild variant="ghost" className="justify-start">
                  <Link href="/ava/login">
                    <LockKeyhole data-icon="inline-start" />
                    Login
                  </Link>
                </Button>
              ) : null}
            </nav>

            {role ? (
              <div className="flex max-h-72 flex-col gap-3 overflow-y-auto rounded-lg border p-3 text-sm text-muted-foreground lg:max-h-none">
                <p className="px-2 text-xs font-semibold uppercase tracking-[0.16em]">
                  Atalhos
                </p>
                {visibleTaskLinks.map((link) => (
                  <Link
                    key={`${link.href}-${link.label}`}
                    href={link.href}
                    className="flex items-center gap-2 rounded-md px-2 py-2 hover:bg-muted hover:text-foreground"
                  >
                    <link.icon aria-hidden="true" />
                    {link.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </aside>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
