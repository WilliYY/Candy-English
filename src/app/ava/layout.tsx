import Link from "next/link";
import { Home, LockKeyhole } from "lucide-react";
import { auth } from "@/lib/auth";
import { canAccessRole, isRole } from "@/lib/roles";
import { BrandLogo } from "@/components/site/brand-logo";
import { Button } from "@/components/ui/button";

const avaLinks = [
  { allowedRoles: ["ADMIN"] as const, href: "/ava/admin", label: "Admin" },
  {
    allowedRoles: ["ADMIN", "TEACHER"] as const,
    href: "/ava/teacher",
    label: "Teacher",
  },
  {
    allowedRoles: ["ADMIN", "TEACHER", "STUDENT"] as const,
    href: "/ava/student",
    label: "Student",
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex min-h-20 w-full max-w-7xl flex-col gap-3 px-6 py-4 md:flex-row md:items-center md:justify-between lg:px-8">
          <BrandLogo markClassName="size-10" />

          <nav
            className="flex flex-wrap items-center gap-2"
            aria-label="Navegacao do AVA"
          >
            {visibleLinks.map((link) => (
              <Button key={link.href} asChild variant="ghost" size="sm">
                <Link href={link.href}>{link.label}</Link>
              </Button>
            ))}
            {!role ? (
              <Button asChild variant="ghost" size="sm">
                <Link href="/ava/login">
                  <LockKeyhole data-icon="inline-start" />
                  Login
                </Link>
              </Button>
            ) : null}
            <Button asChild variant="outline" size="sm">
              <Link href="/">
                <Home data-icon="inline-start" />
                Site
              </Link>
            </Button>
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
