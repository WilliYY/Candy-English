import Link from "next/link";
import {
  BookOpen,
  FileText,
  GraduationCap,
  Home,
  LayoutDashboard,
  LockKeyhole,
  Radio,
  Settings,
  UserRound,
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

const utilityLinks = [
  { href: "/ava/teacher", icon: Radio, label: "Aula ao vivo" },
  { href: "/ava/student", icon: FileText, label: "Contratos" },
  { href: "/ava/student", icon: BookOpen, label: "Homeworks" },
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

  return (
    <div className="min-h-screen bg-background">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="border-b bg-card/95 backdrop-blur lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
          <div className="flex h-full flex-col gap-6 px-5 py-5">
            <div className="flex items-center justify-between gap-3">
              <BrandLogo markClassName="size-10" />
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
              <div className="mt-auto hidden flex-col gap-2 rounded-lg border p-3 text-sm text-muted-foreground lg:flex">
                {utilityLinks.map((link) => (
                  <Link
                    key={link.label}
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
