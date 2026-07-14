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
  Trophy,
  UserCheck,
  UserPlus,
  UserRound,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { auth } from "@/lib/auth";
import {
  canAccessRole,
  getPedagogicalAvaPath,
  isRole,
  type Role,
  ROLE_LABELS,
} from "@/lib/roles";
import { BrandLogo } from "@/components/site/brand-logo";
import { Button } from "@/components/ui/button";
import { AvaStudentBackdrop } from "@/components/ava/ava-student-backdrop";
import { AvaNavAlertLink } from "@/components/ava/ava-nav-alert-link";
import { AvaResponsiveSidebar } from "@/components/ava/ava-responsive-sidebar";
import { UserAvatar } from "@/components/ava/user-avatar";
import { getAvaNavAlertSignatures } from "@/lib/ava-nav-alerts";
import { getPrisma } from "@/lib/prisma";

const navGroups = [
  {
    allowedRoles: ["ADMIN"] as const,
    areaLabel: "AVA",
    href: "/ava/admin?task=usuarios",
    icon: Settings,
    label: "Admin AVA",
    links: [
      {
        href: "/ava/admin?task=usuarios",
        icon: UsersRound,
        label: "Usuarios",
        section: "Alunos do AVA",
      },
      {
        href: "/ava/admin?task=criar-teacher",
        icon: GraduationCap,
        label: "Criar teacher",
        section: "Alunos do AVA",
      },
      {
        href: "/ava/admin?task=criar-aluno",
        icon: UserRound,
        label: "Criar aluno",
        section: "Alunos do AVA",
      },
      {
        href: "/ava/admin?task=vincular-aluno",
        icon: Link2,
        label: "Vincular aluno",
        section: "Alunos do AVA",
      },
      {
        href: "/ava/admin?task=candy-xp",
        icon: Sparkles,
        label: "Candy XP",
        section: "Gamificacao",
      },
      {
        href: "/ava/admin?task=catty-learning",
        icon: BrainCircuit,
        label: "Treinar Catty",
        section: "Catty",
      },
      {
        href: "/ava/admin?task=catty-artifacts",
        icon: Palette,
        label: "Catty dos alunos",
        section: "Catty",
      },
    ],
  },
  {
    allowedRoles: ["ADMIN", "TEACHER"] as const,
    areaLabel: "AVA",
    href: "/ava/teacher?task=resumo",
    icon: GraduationCap,
    label: "Teacher AVA",
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
        href: "/ava/teacher?task=mensagens",
        icon: MessageSquareText,
        label: "Mensagens",
        section: "Comunicacao",
      },
      {
        href: "/ava/teacher?task=catty-learning",
        icon: BrainCircuit,
        label: "Treinar Catty",
        section: "Comunicacao",
      },
      {
        href: "/ava/teacher?task=catty-artifacts",
        icon: Palette,
        label: "Catty dos alunos",
        section: "Comunicacao",
      },
    ],
  },
  {
    allowedRoles: ["ADMIN"] as const,
    areaLabel: "Secretaria",
    href: "/ava/secretaria",
    icon: WalletCards,
    label: "Secretaria",
    links: [
      {
        href: "/ava/admin?task=aceitar-alunos",
        icon: UserCheck,
        label: "Pre-cadastros",
        section: "Entrada",
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
        section: "Controle interno",
      },
      {
        href: "/ava/admin?task=agenda",
        icon: CalendarCheck2,
        label: "Agenda",
        section: "Controle interno",
      },
      {
        href: "/ava/admin?task=criar-admin",
        icon: UserPlus,
        label: "Criar admin",
        section: "Sistema",
      },
      {
        href: "/ava/admin?task=apis-senhas",
        icon: KeyRound,
        label: "APIs e senhas",
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
    allowedRoles: ["TEACHER"] as const,
    areaLabel: "Secretaria",
    href: "/ava/secretaria",
    icon: WalletCards,
    label: "Secretaria",
    links: [
      {
        href: "/ava/teacher?task=aceitar-alunos",
        icon: UserCheck,
        label: "Pre-cadastros",
        section: "Entrada",
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
    areaLabel: "AVA",
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
        href: "/ava/student?task=candy-ranking",
        icon: Trophy,
        label: "Candy Ranking",
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
  "relative flex min-h-11 touch-manipulation items-center gap-2 overflow-hidden rounded-xl border border-primary/15 bg-white/82 px-3 py-2.5 text-sm font-bold text-primary shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:bg-secondary/80 hover:shadow-md";
const navPanelActiveClassName =
  "ava-nav-active-glow border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90";
const navItemLinkClassName =
  "group/nav-item relative flex min-h-11 touch-manipulation items-center gap-2 overflow-hidden rounded-xl border border-primary/10 bg-white/78 px-3 py-2.5 text-sm font-semibold text-primary/82 shadow-[0_6px_16px_rgb(44_19_56_/_0.035)] transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:bg-white hover:text-primary hover:shadow-md";
const navItemActiveClassName =
  "ava-nav-active-glow border-primary/70 bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90 hover:text-primary-foreground [&_[data-nav-icon]]:bg-white/16 [&_[data-nav-icon]]:text-primary-foreground [&_[data-nav-icon]]:ring-1 [&_[data-nav-icon]]:ring-white/25";

export type AvaWorkspaceArea = "AVA" | "SECRETARIA" | "STUDENT";

function getWorkspaceAreaLabel(area: AvaWorkspaceArea) {
  return area === "SECRETARIA" ? "Secretaria" : "AVA";
}

function isVisibleInWorkspaceArea(
  group: (typeof navGroups)[number],
  role: Role,
  area: AvaWorkspaceArea,
) {
  if (!canAccessRole(role, group.allowedRoles)) {
    return false;
  }

  if (area === "STUDENT") {
    return group.label === "Student";
  }

  if (group.label === "Student") {
    return false;
  }

  return group.areaLabel === getWorkspaceAreaLabel(area);
}

export async function AvaWorkspaceShell({
  area,
  children,
}: Readonly<{
  area: AvaWorkspaceArea;
  children: React.ReactNode;
}>) {
  const session = await auth();
  const role = isRole(session?.user?.role) ? session.user.role : null;
  const userId = session?.user?.id;
  const visibleGroups = role
    ? navGroups.filter((group) => isVisibleInWorkspaceArea(group, role, area))
    : [];
  const areaLabel = getWorkspaceAreaLabel(area);

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
      <div className="relative z-10 grid min-h-screen grid-rows-[auto_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)] xl:grid-rows-1">
        <AvaResponsiveSidebar areaLabel={areaLabel} roleLabel={ROLE_LABELS[role]}>
          <div className="flex h-full flex-col gap-5 px-4 py-5 sm:gap-6 sm:px-5 lg:px-6 lg:py-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <BrandLogo
                className="h-[5.6rem] w-[218px] overflow-hidden rounded-full sm:h-24 sm:w-[250px]"
                imageClassName="w-[204px] scale-100 group-hover:scale-[1.01] sm:w-[218px]"
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

            {role !== "STUDENT" ? (
              <div className="rounded-[1.15rem] border border-primary/16 bg-white/78 p-2.5 shadow-[0_10px_26px_rgb(44_19_56_/_0.06)] backdrop-blur-xl">
                <p className="px-2 pb-2 text-[0.66rem] font-extrabold uppercase tracking-[0.17em] text-primary/58">
                  Trocar area
                </p>
                <div className="grid gap-2">
                  <AvaNavAlertLink
                    href="/ava/escolha"
                    className={navItemLinkClassName}
                    activeClassName={navItemActiveClassName}
                  >
                    <span
                      data-nav-icon
                      className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary"
                    >
                      <Settings aria-hidden="true" className="size-4" />
                    </span>
                    <span className="min-w-0 truncate">Escolha sua area</span>
                  </AvaNavAlertLink>
                  <div className="grid grid-cols-2 gap-2">
                    <AvaNavAlertLink
                      href={getPedagogicalAvaPath(role)}
                      className="relative flex min-h-11 touch-manipulation items-center justify-center gap-2 overflow-hidden rounded-xl border border-primary/10 bg-[#fbf7ff] px-2.5 py-2 text-sm font-bold text-primary shadow-sm transition-all hover:border-primary/25 hover:bg-white"
                      activeClassName={navItemActiveClassName}
                    >
                      <BookOpen aria-hidden="true" className="size-4" />
                      AVA
                    </AvaNavAlertLink>
                    <AvaNavAlertLink
                      href="/ava/secretaria"
                      className="relative flex min-h-11 touch-manipulation items-center justify-center gap-2 overflow-hidden rounded-xl border border-primary/10 bg-[#fff7fb] px-2.5 py-2 text-sm font-bold text-primary shadow-sm transition-all hover:border-primary/25 hover:bg-white"
                      activeClassName={navItemActiveClassName}
                    >
                      <WalletCards aria-hidden="true" className="size-4" />
                      Secretaria
                    </AvaNavAlertLink>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="px-2 text-[0.66rem] font-bold uppercase tracking-[0.22em] text-primary/60">
              {area === "SECRETARIA" ? "Secretaria" : "Area de trabalho"}
            </div>

            <nav
              className="flex flex-col gap-3 rounded-[1.35rem] border border-primary/18 bg-white/72 p-2.5 shadow-[0_20px_44px_rgb(44_19_56_/_0.1)]"
              aria-label={`Navegacao da area ${areaLabel}`}
            >
              {visibleGroups.map((group, groupIndex) => {
                const previousGroup = visibleGroups[groupIndex - 1];
                const shouldShowAreaHeading =
                  !previousGroup || previousGroup.areaLabel !== group.areaLabel;

                if (role === "STUDENT" && group.label === "Student") {
                  return (
                    <Fragment key={`${group.areaLabel}-${group.href}`}>
                      {shouldShowAreaHeading ? (
                        <span className="mt-1 flex items-center gap-2 px-2 text-[0.66rem] font-extrabold uppercase tracking-[0.17em] text-primary/58 first:mt-0">
                          <span className="size-1.5 rounded-full bg-accent shadow-[0_0_0_3px_rgb(229_124_216_/_0.14)]" />
                          {group.areaLabel}
                        </span>
                      ) : null}
                      <div className="ava-sidebar-student-nav rounded-[1.15rem] border border-primary/15 bg-white/75 p-3 shadow-sm backdrop-blur-xl lg:p-4">
                        <div className="relative z-10 mb-3 flex items-center justify-between gap-3 rounded-xl border border-primary/10 bg-white/70 px-3 py-2.5 text-sm font-bold text-primary shadow-sm">
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                              <group.icon
                                aria-hidden="true"
                                className="size-4"
                              />
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate">
                                Trilha Candy
                              </span>
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
                    </Fragment>
                  );
                }

                let currentSection: string | undefined;
                const panelHasTaskLink = group.links.some(
                  (link) => link.href === group.href,
                );

                return (
                  <Fragment key={`${group.areaLabel}-${group.href}`}>
                    {shouldShowAreaHeading ? (
                      <span className="mt-1 flex items-center gap-2 px-2 text-[0.66rem] font-extrabold uppercase tracking-[0.17em] text-primary/58 first:mt-0">
                        <span className="size-1.5 rounded-full bg-accent shadow-[0_0_0_3px_rgb(229_124_216_/_0.14)]" />
                        {group.areaLabel}
                      </span>
                    ) : null}
                    <details
                      open={
                        (group.label === "Admin AVA" && role === "ADMIN") ||
                        (group.label === "Teacher AVA" && role === "TEACHER") ||
                        (group.label === "Secretaria" && role === "TEACHER")
                      }
                      className="group rounded-[1.15rem] border border-primary/16 bg-white/78 p-2 shadow-[0_10px_26px_rgb(44_19_56_/_0.06)] backdrop-blur-xl transition-colors open:border-primary/32 open:bg-white/92"
                    >
                      <summary className="flex cursor-pointer touch-manipulation list-none items-center justify-between gap-3 rounded-xl border border-primary/10 bg-gradient-to-r from-white via-white to-secondary/45 px-3 py-3 text-sm font-bold text-primary outline-none shadow-sm transition-colors hover:border-primary/18 hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring/60 [&::-webkit-details-marker]:hidden">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary shadow-sm ring-1 ring-primary/10 transition-colors group-open:bg-primary group-open:text-primary-foreground">
                            <group.icon aria-hidden="true" className="size-4" />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate">
                              {group.label}
                            </span>
                            <span className="block text-[0.62rem] font-bold uppercase tracking-[0.14em] text-primary/48">
                              {group.links.length + 1} atalhos
                            </span>
                          </span>
                        </span>
                        <ChevronDown
                          aria-hidden="true"
                          className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                        />
                      </summary>

                      <div className="mt-2 flex flex-col gap-1.5 border-l border-primary/18 pl-3">
                        <AvaNavAlertLink
                          href={group.href}
                          signature={navAlertSignatures[group.href]}
                          className={navPanelLinkClassName}
                          activeClassName={
                            panelHasTaskLink
                              ? undefined
                              : navPanelActiveClassName
                          }
                        >
                          <span
                            data-nav-icon
                            className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary"
                          >
                            <group.icon aria-hidden="true" className="size-4" />
                          </span>
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
                            <Fragment
                              key={`${group.href}-${link.href}-${link.label}`}
                            >
                              {shouldShowSection ? (
                                <span className="mt-3 flex items-center gap-2 px-2 text-[0.66rem] font-extrabold uppercase tracking-[0.17em] text-primary/58 first:mt-2">
                                  <span className="size-1.5 rounded-full bg-accent shadow-[0_0_0_3px_rgb(229_124_216_/_0.14)]" />
                                  <span className="shrink-0">
                                    {link.section}
                                  </span>
                                  <span className="h-px min-w-4 flex-1 bg-primary/12" />
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
                  </Fragment>
                );
              })}
              {visibleGroups.length === 0 ? (
                <Button asChild variant="ghost" className="justify-start">
                  <Link href={role === "STUDENT" ? "/ava/student" : "/ava/escolha"}>
                    <LockKeyhole data-icon="inline-start" />
                    {role === "STUDENT" ? "Painel Student" : "Trocar area"}
                  </Link>
                </Button>
              ) : null}
            </nav>
          </div>
        </AvaResponsiveSidebar>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
