"use client";

import { Menu, PanelLeftClose, X } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

type AvaResponsiveSidebarProps = {
  children: ReactNode;
  roleLabel: string;
};

export function AvaResponsiveSidebar({
  children,
  roleLabel,
}: AvaResponsiveSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 1280px)");
    const handleDesktopChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setOpen(false);
      }
    };

    desktopQuery.addEventListener("change", handleDesktopChange);
    return () => desktopQuery.removeEventListener("change", handleDesktopChange);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        menuButtonRef.current?.focus();
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function closeAndRestoreFocus() {
    setOpen(false);
    window.requestAnimationFrame(() => menuButtonRef.current?.focus());
  }

  function handleNavigationClick(event: ReactMouseEvent<HTMLElement>) {
    const target = event.target as HTMLElement;

    if (target.closest("a")) {
      setOpen(false);
    }
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-primary/15 bg-white/94 px-3 py-2.5 shadow-[0_10px_28px_rgb(44_19_56_/_0.1)] backdrop-blur-xl xl:hidden">
        <button
          ref={menuButtonRef}
          type="button"
          aria-controls="ava-responsive-navigation"
          aria-expanded={open}
          className="flex min-h-12 w-full touch-manipulation items-center gap-3 rounded-lg border border-primary/15 bg-white px-3 text-left text-primary shadow-sm transition hover:border-primary/28 hover:bg-secondary/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
          onClick={() => setOpen(true)}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Menu aria-hidden="true" className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold">Menu do AVA</span>
            <span className="block truncate text-xs font-semibold text-muted-foreground">
              {roleLabel} · toque para escolher uma area
            </span>
          </span>
          <PanelLeftClose
            aria-hidden="true"
            className="size-5 shrink-0 text-primary/60"
          />
        </button>
      </header>

      {open ? (
        <button
          type="button"
          aria-label="Fechar menu do AVA"
          className="fixed inset-0 z-[60] cursor-default bg-primary/38 backdrop-blur-[2px] xl:hidden"
          onClick={closeAndRestoreFocus}
        />
      ) : null}

      <aside
        id="ava-responsive-navigation"
        aria-label="Navegacao principal do AVA"
        className={cn(
          "ava-sidebar-glass fixed inset-y-0 left-0 z-[70] w-[min(90vw,360px)] overflow-y-auto border-r border-primary/20 shadow-[24px_0_54px_rgb(44_19_56_/_0.2)] transition-transform duration-200 ease-out xl:relative xl:inset-auto xl:z-auto xl:w-auto xl:translate-x-0 xl:overflow-hidden xl:shadow-none",
          open
            ? "visible translate-x-0 pointer-events-auto"
            : "invisible -translate-x-full pointer-events-none xl:visible xl:pointer-events-auto",
        )}
        onClickCapture={handleNavigationClick}
      >
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-primary/12 bg-white/96 px-4 py-3 backdrop-blur-xl xl:hidden">
          <div>
            <p className="text-sm font-bold text-primary">Navegacao do AVA</p>
            <p className="text-xs font-semibold text-muted-foreground">
              {roleLabel}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Fechar menu"
            className="flex size-10 touch-manipulation items-center justify-center rounded-lg border border-primary/15 bg-white text-primary shadow-sm transition hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
            onClick={closeAndRestoreFocus}
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>
        {children}
      </aside>
    </>
  );
}
