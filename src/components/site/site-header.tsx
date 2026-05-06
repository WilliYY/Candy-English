import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BrandLogo } from "@/components/site/brand-logo";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/sobre", label: "Sobre" },
  { href: "/metodologia", label: "Metodologia" },
  { href: "/planos", label: "Planos" },
  { href: "/contato", label: "Contato" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur-xl">
      <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:h-24 sm:px-6 lg:px-8">
        <BrandLogo
          className="h-16 w-[215px] shrink-0 sm:h-20 sm:w-[280px]"
          imageClassName="w-[255px] sm:w-[350px]"
        />
        <nav
          className="hidden items-center gap-1 md:flex"
          aria-label="Navegacao principal"
        >
          {navItems.map((item) => (
            <Button key={item.href} asChild variant="ghost" size="sm">
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}
        </nav>
        <Button asChild size="sm" className="shrink-0 px-3 sm:px-4">
          <Link href="/ava">
            AVA
            <ArrowRight data-icon="inline-end" />
          </Link>
        </Button>
      </div>
    </header>
  );
}
