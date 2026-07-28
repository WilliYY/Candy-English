"use client";

import {
  BookOpenText,
  House,
  Info,
  Menu,
  MessageCircle,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { KeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BrandLogo } from "@/components/site/brand-logo";
import { Button } from "@/components/ui/button";
import { getDefaultAvaPath, ROLE_LABELS, type Role } from "@/lib/roles";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", icon: House, label: "Home" },
  { href: "/sobre", icon: Info, label: "Sobre" },
  { href: "/metodologia", icon: BookOpenText, label: "Metodologia" },
  { href: "/contato", icon: MessageCircle, label: "Contato" },
];

type SiteHeaderProps = {
  sessionUser?: {
    name?: string | null;
    role: Role;
  } | null;
};

export function SiteHeader({ sessionUser }: SiteHeaderProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);
  const isHome = pathname === "/";
  const loggedLabel = sessionUser
    ? `Logado: ${ROLE_LABELS[sessionUser.role]}`
    : null;
  const avaHref = sessionUser ? getDefaultAvaPath(sessionUser.role) : "/ava/login";

  useEffect(() => {
    if (!mobileMenuOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const menuButton = mobileMenuButtonRef.current;
    const focusFrame = window.requestAnimationFrame(() => {
      mobileMenuRef.current
        ?.querySelector<HTMLElement>("[data-mobile-nav-link='true']")
        ?.focus();
    });

    document.body.style.overflow = "hidden";

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      menuButton?.focus({ preventScroll: true });
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 768px)");

    function closeMenuAtDesktop() {
      if (desktopQuery.matches) {
        setMobileMenuOpen(false);
      }
    }

    desktopQuery.addEventListener("change", closeMenuAtDesktop);

    return () => {
      desktopQuery.removeEventListener("change", closeMenuAtDesktop);
    };
  }, []);

  function isItemActive(href: string) {
    return href === "/" ? pathname === href : pathname.startsWith(href);
  }

  function handleMobileMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      setMobileMenuOpen(false);
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const focusableElements = Array.from(
      mobileMenuRef.current?.querySelectorAll<HTMLElement>(
        "a[href], button:not([disabled])",
      ) ?? [],
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements.at(-1);

    if (!firstElement || !lastElement) {
      event.preventDefault();
      return;
    }

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  return (
    <header
      className={cn(
        "top-0",
        mobileMenuOpen ? "z-[60]" : "z-40",
        isHome
          ? "fixed inset-x-0 text-primary"
          : "sticky border-b border-border/70 bg-background/95 backdrop-blur-xl",
      )}
    >
      <div
        className={cn(
          "mx-auto flex w-full max-w-7xl items-center justify-between gap-2 px-3 sm:px-6 md:gap-3 lg:px-8",
          isHome
            ? "mt-3 min-h-[4.75rem] overflow-visible rounded-full bg-white/92 py-2 shadow-2xl shadow-black/20 ring-1 ring-white/70 backdrop-blur-xl sm:mt-4 sm:min-h-20 sm:py-3"
            : "h-[5.5rem] sm:h-24",
        )}
      >
        <BrandLogo
          className={cn(
            "shrink-0",
            isHome
              ? "h-16 w-[138px] overflow-hidden rounded-full sm:h-[5.25rem] sm:w-[220px] md:w-[180px] lg:w-[230px]"
              : "h-16 w-[138px] overflow-hidden rounded-full bg-white sm:h-[5.25rem] sm:w-[220px] md:w-[180px] lg:w-[205px]",
          )}
          imageClassName={cn(
            isHome
              ? "top-[52%] w-[128px] scale-[0.98] group-hover:scale-[1] sm:w-[196px] md:w-[160px] lg:w-[196px]"
              : "top-[52%] w-[128px] scale-[0.98] group-hover:scale-[1] sm:w-[196px] md:w-[160px] lg:w-[196px]",
          )}
        />
        <nav
          className="hidden items-center gap-3 md:flex"
          aria-label="Navegacao principal"
        >
          {navItems.map((item) => {
            const isActive = isItemActive(item.href);

            return (
              <Button
                key={item.href}
                asChild
                variant="ghost"
                size="default"
                className={cn(
                  "px-4 text-base font-semibold transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/15 hover:bg-primary hover:text-primary-foreground"
                    : isHome
                      ? "text-primary/75 hover:bg-primary/5 hover:text-primary"
                      : "text-foreground hover:bg-primary/5 hover:text-primary",
                )}
              >
                <Link
                  aria-current={isActive ? "page" : undefined}
                  href={item.href}
                >
                  {item.label}
                </Link>
              </Button>
            );
          })}
        </nav>
        <div className="flex shrink-0 items-center gap-2 lg:gap-6">
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
              "candy-ava-button group relative h-10 shrink-0 px-3 text-sm font-bold sm:px-5 md:px-4 lg:px-8 lg:text-base",
              isHome
                ? "shadow-lg shadow-primary/30"
                : "shadow-md shadow-primary/20",
            )}
            data-candy-ava-button="true"
          >
            <Link href={avaHref}>
              <span className="relative z-10 flex items-center gap-2">
                AVA
                <Sparkles className="size-4 animate-pulse text-yellow-300/90" />
              </span>
            </Link>
          </Button>
          <Button
            ref={mobileMenuButtonRef}
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "size-10 rounded-full md:hidden",
              isHome
                ? "bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary"
                : "text-foreground hover:bg-primary/5 hover:text-primary",
            )}
            aria-controls="site-mobile-menu"
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
            onClick={() => setMobileMenuOpen((current) => !current)}
          >
            {mobileMenuOpen ? (
              <X aria-hidden="true" className="size-5" />
            ) : (
              <Menu aria-hidden="true" className="size-5" />
            )}
          </Button>
        </div>
      </div>

      {mobileMenuOpen
        ? createPortal(
          <div className="fixed inset-0 z-[100] md:hidden">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[#2c1338]/40 backdrop-blur-[2px]"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div
            ref={mobileMenuRef}
            id="site-mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-labelledby="site-mobile-menu-title"
            className="absolute inset-y-0 right-0 flex w-[min(20rem,calc(100vw-1rem))] flex-col border-l border-primary/10 bg-[#fff8fb] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] text-foreground shadow-2xl shadow-black/25"
            onKeyDown={handleMobileMenuKeyDown}
          >
            <div className="flex min-h-12 items-center justify-between border-b border-primary/10 pb-3">
              <strong
                id="site-mobile-menu-title"
                className="text-base font-black text-primary"
              >
                Navegacao
              </strong>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-10 rounded-full text-primary hover:bg-primary/10 hover:text-primary"
                aria-label="Fechar menu"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X aria-hidden="true" className="size-5" />
              </Button>
            </div>

            <nav
              className="flex flex-col gap-1 py-4"
              aria-label="Navegacao principal mobile"
            >
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = isItemActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    data-mobile-nav-link="true"
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex min-h-12 items-center gap-3 rounded-lg px-3 py-3 text-base font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-primary",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/15"
                        : "text-foreground hover:bg-primary/5 hover:text-primary",
                    )}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Icon aria-hidden="true" className="size-5 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto border-t border-primary/10 pt-4">
              {loggedLabel ? (
                <p className="mb-3 text-sm font-semibold text-muted-foreground">
                  {loggedLabel}
                </p>
              ) : null}
              <Button
                asChild
                size="lg"
                className="candy-ava-button group relative w-full text-base font-bold shadow-md shadow-primary/20"
              >
                <Link href={avaHref} onClick={() => setMobileMenuOpen(false)}>
                  <span className="relative z-10 flex items-center gap-2">
                    Acessar AVA
                    <Sparkles
                      aria-hidden="true"
                      className="size-4 text-yellow-300/90"
                    />
                  </span>
                </Link>
              </Button>
            </div>
          </div>
          </div>,
          document.body,
        )
        : null}
    </header>
  );
}
