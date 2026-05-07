"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/site/brand-logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/sobre", label: "Sobre" },
  { href: "/metodologia", label: "Metodologia" },
  { href: "/planos", label: "Planos" },
  { href: "/contato", label: "Contato" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <header
      className={cn(
        "top-0 z-40",
        isHome
          ? "fixed inset-x-0 text-white"
          : "sticky border-b border-border/70 bg-background/95 backdrop-blur-xl",
      )}
    >
      <div
        className={cn(
          "mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8",
          isHome
            ? "mt-4 h-[4.75rem] rounded-full bg-white/[0.03] py-3 shadow-2xl shadow-black/15 liquid-glass"
            : "h-[5.5rem] sm:h-24",
        )}
      >
        <BrandLogo
          className={cn(
            "shrink-0",
            isHome
              ? "h-14 w-[205px] sm:h-16 sm:w-[235px]"
              : "h-16 w-[215px] sm:h-20 sm:w-[280px]",
          )}
          imageClassName={cn(
            isHome ? "w-[245px] sm:w-[285px]" : "w-[255px] sm:w-[350px]",
          )}
        />
        <nav
          className="hidden items-center gap-3 md:flex"
          aria-label="Navegacao principal"
        >
          {navItems.map((item) => (
            <Button
              key={item.href}
              asChild
              variant="ghost"
              size="default"
              className={cn(
                "px-4 text-base font-semibold transition-colors",
                isHome
                  ? "text-white/70 hover:bg-white/10 hover:text-white"
                  : "text-foreground",
              )}
            >
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}
        </nav>
        <Button
          asChild
          size="lg"
          className={cn(
            "shrink-0 px-5 text-base font-semibold transition-transform hover:scale-[1.03]",
            isHome && "liquid-glass bg-white/[0.03] text-white hover:bg-white/10",
          )}
        >
          <Link href="/ava">
            AVA
            <ArrowRight data-icon="inline-end" />
          </Link>
        </Button>
      </div>
    </header>
  );
}
