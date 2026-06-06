import Link from "next/link";
import { Fragment } from "react";
import {
  BookOpen,
  BrainCircuit,
  CalendarCheck2,
  ChevronDown,
  ClipboardCheck,
  FileText,
  GraduationCap,
  Home,
  KeyRound,
  Link2,
  LockKeyhole,
  MessageSquareText,
  Palette,
  PencilLine,
  Radio,
  Settings,
  Sparkles,
  UserCheck,
  UserPlus,
  UserRound,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { canAccessRole, isRole, ROLE_LABELS } from "@/lib/roles";
import { BrandLogo } from "@/components/site/brand-logo";
import { Button } from "@/components/ui/button";
import { AvaStudentBackdrop } from "@/components/ava/ava-student-backdrop";
import { AvaNavAlertLink } from "@/components/ava/ava-nav-alert-link";
import { UserAvatar } from "@/components/ava/user-avatar";
import { getAvaNavAlertSignatures } from "@/lib/ava-nav-alerts";
import { getPrisma } from "@/lib/prisma";

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
        section: "Gestao",
      },
      {
        href: "/ava/admin?task=criar-admin",
        icon: UserPlus,
        label: "Criar admin",
        section: "Gestao",
      },
      {
        href: "/ava/admin?task=criar-teacher",
        icon: GraduationCap,
        label: "Criar teacher",
        section: "Gestao",
      },
      {
        href: "/ava/admin?task=criar-aluno",
        icon: UserRound,
        label: "Criar aluno",
        section: "Gestao",
      },
      {
        href: "/ava/admin?task=aceitar-alunos",
        icon: UserCheck,
        label: "Aceitar alunos",
        section: "Gestao",
      },
      {
        href: "/ava/admin?task=vincular-aluno",
        icon: Link2,
        label: "Vincular aluno",
        section: "Gestao",
      },
      {
        href: "/ava/teacher?task=aula-ao-vivo",
        icon: Radio,
        label: "Aula ao vivo",
        section: "Aulas",
      },
      {
        href: "/ava/teacher?task=criar-aula",
        icon: BookOpen,
        label: "Criar/Ver Aulas",
        section: "Aulas",
      },
      {
        href: "/ava/teacher?task=criar-homework",
        icon: ClipboardCheck,
        label: "Criar/Ver Homework",
        section: "Aulas",
      },
      {
        href: "/ava/admin?task=candy-xp",
        icon: Sparkles,
        label: "Candy XP",
        section: "Aulas",
      },
      {
        href: "/ava/teacher?task=corrigir-respostas",
        icon: ClipboardCheck,
        label: "Corrigir homework",
        section: "Aulas",
      },
      {
        href: "/ava/teacher?task=aceitar-alunos",
        icon: UserCheck,
        label: "Aceitar alunos",
        section: "Comunicacao",
      },
      {
        href: "/ava/teacher?task=mensagens",
        icon: MessageSquareText,
        label: "Mensagens",
        section: "Comunicacao",
      },
      {
        href: "/ava/admin?task=contratos",
        icon: FileText,
        label: "Contratos PDF",
        section: "Arquivos",
      },
      {
        href: "/ava/admin?task=financeiro",
        icon: WalletCards,
        label: "Financeiro",
        section: "Financeiro",
      },
      {
        href: "/ava/admin?task=agenda",
        icon: CalendarCheck2,
        label: "Agenda",
        section: "Financeiro",
      },
      {
        href: "/ava/admin?task=apis-senhas",
        icon: KeyRound,
        label: "APIs e senhas",
        section: "Sistema",
      },
      {
        href: "/ava/admin?task=catty-learning",
        icon: BrainCircuit,
        label: "Catty Learning",
        section: "Sistema",
      },
      {
        href: "/ava/admin?task=catty-memory",
        icon: BrainCircuit,
        label: "Memoria da Catty",
        section: "Sistema",
      },
      {
        href: "/ava/admin?task=catty-artifacts",
        icon: Palette,
        label: "Catty Learning: gostos",
        section: "Sistema",
      },
      {
        href: "/ava/admin?task=editar-site",
        icon: PencilLine,
        label: "Manutencao",
        section: "Sistema",
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
        section: "Aulas",
      },
      {
        href: "/ava/teacher?task=criar-aula",
        icon: BookOpen,
        label: "Criar/Ver Aulas",
        section: "Aulas",
      },
      {
        href: "/ava/teacher?task=criar-homework",
        icon: ClipboardCheck,
        label: "Criar/Ver Homework",
        section: "Aulas",
      },
      {
        href: "/ava/teacher?task=corrigir-respostas",
        icon: ClipboardCheck,
        label: "Corrigir homework",
        section: "Aulas",
      },
      {
        href: "/ava/teacher?task=aceitar-alunos",
        icon: UserCheck,
        label: "Aceitar alunos",
        section: "Comunicacao",
      },
      {
        href: "/ava/teacher?task=mensagens",
        icon: MessageSquareText,
        label: "Mensagens",
        section: "Comunicacao",
      },
      {
        href: "/ava/teacher?task=catty-learning",
        icon: BrainCircuit,
        label: "Catty Learning",
        section: "Comunicacao",
      },
      {
        href: "/ava/teacher?task=catty-memory",
        icon: BrainCircuit,
        label: "Memoria da Catty",
        section: "Comunicacao",
      },
      {
        href: "/ava/teacher?task=catty-artifacts",
        icon: Palette,
        label: "Catty Learning: gostos",
        section: "Comunicacao",
      },
      {
        href: "/ava/teacher?task=contratos",
        icon: FileText,
        label: "Contratos PDF",
        section: "Arquivos",
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
        label: "Aulas e Materiais",
      },
      {
        href: "/ava/student?task=homeworks",
        icon: ClipboardCheck,
        label: "Responder homework",
      },
      {
        href: "/ava/student?task=candy-xp",
        icon: Sparkles,
        label: "Candy XP",
      },
      {
        href: "/ava/student?task=catty-memory",
        icon: BrainCircuit,
        label: "Catty aprendendo",
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

const navPanelLinkClassName =
  "relative flex items-center gap-2 overflow-hidden rounded-xl border border-primary/15 bg-white/75 px-3 py-2.5 text-sm font-semibold text-primary shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:bg-secondary/80 hover:shadow-md";
const navPanelActiveClassName =
  "ava-nav-active-glow border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90";
const navItemLinkClassName =
  "group/nav-item relative flex items-center gap-2 overflow-hidden rounded-xl border border-transparent px-3 py-2.5 text-sm font-semibold text-primary/75 transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:bg-primary/10 hover:text-primary hover:shadow-sm";
const navItemActiveClassName =
  "ava-nav-active-glow border-primary/40 bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90 hover:text-primary-foreground [&_[data-nav-icon]]:bg-white/15 [&_[data-nav-icon]]:text-primary-foreground";

export default async function AvaLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const role = isRole(session?.user?.role) ? session.user.role : null;
  const userId = session?.user?.id;
  const visibleGroups = role
    ? navGroups.filter((link) => canAccessRole(role, link.allowedRoles))
    : [];

  if (!role || !userId) {
    return <div className="min-h-screen overflow-x-hidden">{children}</div>;
  }

  const prisma = getPrisma();
  const [currentUser, navAlertSignatures] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        avatarPath: true,
        name: true,
      },
    }),
    getAvaNavAlertSignatures(role, userId),
  ]);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background">
      <AvaStudentBackdrop />
      <div className="relative z-10 grid min-h-screen lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="ava-sidebar-glass relative overflow-hidden border-b border-primary/15 backdrop-blur-2xl lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:border-b-0 lg:border-r lg:border-primary/20">
          <div className="flex h-full flex-col gap-6 px-5 py-5 lg:px-6 lg:py-6">
            <div className="flex items-center justify-between gap-3">
              <BrandLogo
                className="h-16 w-[205px] overflow-visible sm:h-16 sm:w-[230px]"
                imageClassName="w-[245px] sm:w-[270px]"
              />
              <Button asChild variant="outline" className="px-3">
                <Link href="/">
                  <Home aria-hidden="true" />
                  Home
                </Link>
              </Button>
            </div>

            <div
              className={
                role === "STUDENT"
                  ? "ava-sidebar-user-card ava-sidebar-user-card--student rounded-[1.25rem] border p-4 shadow-[0_14px_34px_rgb(44_19_56_/_0.08)] backdrop-blur-xl lg:p-5"
                  : "ava-sidebar-user-card rounded-[1.25rem] border p-4 shadow-[0_14px_34px_rgb(44_19_56_/_0.08)] backdrop-blur-xl lg:p-5"
              }
            >
              <div className="relative z-10 flex items-center gap-3">
                <UserAvatar
                  avatarPath={currentUser?.avatarPath}
                  className="size-12 rounded-2xl border-white/80 shadow-md ring-2 ring-accent/20"
                  iconClassName="size-5"
                  userId={userId}
                />
                <div className="min-w-0 text-sm">
                  <p className="mb-1 text-[0.62rem] font-bold uppercase tracking-[0.2em] text-primary/50">
                    {role === "STUDENT" ? "Study zone" : "Perfil"}
                  </p>
                  <p className="truncate text-base font-bold leading-tight text-primary">
                    {currentUser?.name ?? session.user.name ?? "Visitante"}
                  </p>
                  <p className="truncate text-xs font-semibold text-muted-foreground">
                    {role ? ROLE_LABELS[role] : "Sem login"}
                  </p>
                </div>
              </div>
              {role === "STUDENT" ? (
                <div className="relative z-10 mt-4 grid grid-cols-3 gap-2">
                  <span className="ava-sidebar-study-chip">XP</span>
                  <span className="ava-sidebar-study-chip">Aulas</span>
                  <span className="ava-sidebar-study-chip">Catty</span>
                </div>
              ) : null}
            </div>

            <div className="px-2 text-[0.66rem] font-bold uppercase tracking-[0.22em] text-primary/60">
              Area de trabalho
            </div>

            <nav
              className="flex flex-col gap-2 rounded-[1.35rem] border border-primary/15 bg-white/60 p-2 shadow-[0_20px_44px_rgb(44_19_56_/_0.09)]"
              aria-label="Navegacao do AVA"
            >
              {visibleGroups.map((group) => {
                if (role === "STUDENT" && group.label === "Student") {
                  return (
                    <div
                      key={group.href}
                      className="ava-sidebar-student-nav rounded-[1.15rem] border border-primary/15 bg-white/75 p-3 shadow-sm backdrop-blur-xl lg:p-4"
                    >
                      <div className="relative z-10 mb-3 flex items-center justify-between gap-3 rounded-xl border border-primary/10 bg-white/70 px-3 py-2.5 text-sm font-bold text-primary shadow-sm">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                            <group.icon aria-hidden="true" className="size-4" />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate">Trilha Candy</span>
                            <span className="block text-[0.64rem] font-bold uppercase tracking-[0.16em] text-primary/50">
                              Student
                            </span>
                          </span>
                        </span>
                        <span className="shrink-0 rounded-full bg-secondary px-2 py-1 text-[0.68rem] font-bold text-secondary-foreground">
                          {group.links.length + 1} mod
                        </span>
                      </div>
                      <div className="relative z-10 flex flex-col gap-2">
                        <AvaNavAlertLink
                          href={group.href}
                          signature={navAlertSignatures[group.href]}
                          className={navPanelLinkClassName}
                          activeClassName={navPanelActiveClassName}
                        >
                          <group.icon aria-hidden="true" className="size-4" />
                          Painel Student
                        </AvaNavAlertLink>
                        {group.links.map((link) => (
                          <AvaNavAlertLink
                            key={`${group.href}-${link.href}-${link.label}`}
                            href={link.href}
                            signature={navAlertSignatures[link.href]}
                            className={navItemLinkClassName}
                            activeClassName={navItemActiveClassName}
                          >
                            <span
                              data-nav-icon
                              className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary"
                            >
                              <link.icon
                                aria-hidden="true"
                                className="size-4"
                              />
                            </span>
                            <span className="min-w-0 truncate">
                              {link.label}
                            </span>
                          </AvaNavAlertLink>
                        ))}
                      </div>
                    </div>
                  );
                }

                let currentSection: string | undefined;
                const panelHasTaskLink = group.links.some(
                  (link) => link.href === group.href,
                );

                return (
                  <details
                    key={group.href}
                    open={
                      (group.label === "Admin" && role === "ADMIN") ||
                      (group.label === "Student" && role === "STUDENT")
                    }
                    className="group rounded-[1.15rem] border border-primary/15 bg-white/70 p-2 shadow-sm backdrop-blur-xl transition-colors open:border-primary/30 open:bg-white/85"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-3 py-3 text-sm font-bold text-primary outline-none transition-colors hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring/60 [&::-webkit-details-marker]:hidden">
                      <span className="flex min-w-0 items-center gap-2">
                        <group.icon aria-hidden="true" className="size-4" />
                        {group.label}
                      </span>
                      <ChevronDown
                        aria-hidden="true"
                        className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                      />
                    </summary>

                    <div className="mt-2 flex flex-col gap-1.5 border-l border-primary/15 pl-3">
                      <AvaNavAlertLink
                        href={group.href}
                        signature={navAlertSignatures[group.href]}
                        className={navPanelLinkClassName}
                        activeClassName={
                          panelHasTaskLink ? undefined : navPanelActiveClassName
                        }
                      >
                        <group.icon aria-hidden="true" className="size-4" />
                        Painel {group.label}
                      </AvaNavAlertLink>
                      {group.links.map((link) => {
                        const shouldShowSection =
                          "section" in link &&
                          link.section &&
                          link.section !== currentSection;
                        if ("section" in link) {
                          currentSection = link.section;
                        }

                        return (
                          <Fragment key={`${group.href}-${link.href}-${link.label}`}>
                            {shouldShowSection ? (
                              <span className="mt-3 px-3 text-[0.66rem] font-bold uppercase tracking-[0.18em] text-primary/50 first:mt-2">
                                {link.section}
                              </span>
                            ) : null}
                            <AvaNavAlertLink
                              href={link.href}
                              signature={navAlertSignatures[link.href]}
                              className={navItemLinkClassName}
                              activeClassName={navItemActiveClassName}
                            >
                              <span
                                data-nav-icon
                                className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary"
                              >
                                <link.icon
                                  aria-hidden="true"
                                  className="size-4"
                                />
                              </span>
                              <span className="min-w-0 truncate">
                                {link.label}
                              </span>
                            </AvaNavAlertLink>
                          </Fragment>
                        );
                      })}
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
