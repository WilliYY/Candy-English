"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/site/brand-logo";
import { Button } from "@/components/ui/button";
import { getDefaultAvaPath, ROLE_LABELS, type Role } from "@/lib/roles";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/sobre", label: "Sobre" },
  { href: "/metodologia", label: "Metodologia" },
  { href: "/contato", label: "Contato" },
];

type SiteHeaderProps = {
  sessionUser?: {
    name?: string | null;
    role: Role;
  } | null;
};

export function SiteHeader({ sessionUser }: SiteHeaderProps) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const loggedLabel = sessionUser
    ? `Logado: ${ROLE_LABELS[sessionUser.role]}`
    : null;
  const avaHref = sessionUser ? getDefaultAvaPath(sessionUser.role) : "/ava/login";

  return (
    <header
      className={cn(
        "top-0 z-40",
        isHome
          ? "fixed inset-x-0 text-primary"
          : "sticky border-b border-border/70 bg-background/95 backdrop-blur-xl",
      )}
    >
      <div
        className={cn(
          "mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8",
          isHome
            ? "mt-4 min-h-20 overflow-visible rounded-full bg-white/92 py-3 shadow-2xl shadow-black/20 ring-1 ring-white/70 backdrop-blur-xl"
            : "h-[5.5rem] sm:h-24",
        )}
      >
        <BrandLogo
          className={cn(
            "shrink-0",
            isHome
              ? "h-16 w-[230px] overflow-visible sm:h-[4.25rem] sm:w-[285px]"
              : "h-16 w-[215px] sm:h-20 sm:w-[280px]",
          )}
          imageClassName={cn(
            isHome
              ? "w-[245px] scale-100 group-hover:scale-[1.04] sm:w-[310px]"
              : "w-[255px] sm:w-[350px]",
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
                  ? "text-primary/75 hover:bg-primary/5 hover:text-primary"
                  : "text-foreground",
              )}
            >
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-4 lg:gap-6">
          {loggedLabel ? (
            <span
              aria-label={loggedLabel}
              className={cn(
                "hidden cursor-default select-none rounded-full border px-4 py-2 text-xs font-bold shadow-sm lg:inline-flex",
                isHome
                  ? "border-white/70 bg-white/75 text-primary"
                  : "border-primary/15 bg-muted text-primary",
              )}
            >
              {loggedLabel}
            </span>
          ) : null}
          <Button
            asChild
            size="lg"
            className={cn(
              "shrink-0 text-base font-bold transition-transform hover:scale-[1.03]",
              isHome
                ? "candy-ava-button bg-primary px-8 text-primary-foreground shadow-lg shadow-primary/15 hover:bg-primary/90"
                : "candy-ava-button px-8",
            )}
          >
            <Link href={avaHref}>AVA</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
