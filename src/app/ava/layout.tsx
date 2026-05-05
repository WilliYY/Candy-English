import Link from "next/link";
import { BookOpen, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

const avaLinks = [
  { href: "/ava/admin", label: "Admin" },
  { href: "/ava/teacher", label: "Teacher" },
  { href: "/ava/student", label: "Student" },
];

export default function AvaLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6 lg:px-8">
          <Link href="/ava" className="flex items-center gap-3 font-semibold">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <BookOpen aria-hidden="true" />
            </span>
            Candy English AVA
          </Link>
          <nav className="hidden items-center gap-2 md:flex" aria-label="Navegação do AVA">
            {avaLinks.map((link) => (
              <Button key={link.href} asChild variant="ghost" size="sm">
                <Link href={link.href}>{link.label}</Link>
              </Button>
            ))}
          </nav>
          <Button asChild variant="outline" size="sm">
            <Link href="/">
              <Home data-icon="inline-start" />
              Site
            </Link>
          </Button>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
