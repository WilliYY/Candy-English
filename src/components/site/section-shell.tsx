import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SectionShellProps = {
  children: ReactNode;
  className?: string;
  eyebrow?: string;
  title?: string;
  description?: string;
};

export function SectionShell({
  children,
  className,
  description,
  eyebrow,
  title,
}: SectionShellProps) {
  return (
    <section className={cn("border-b bg-background", className)}>
      <div className="relative z-20 mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 py-16 lg:px-8 lg:py-20">
        {title ? (
          <div className="grid gap-5 lg:grid-cols-[0.72fr_1fr] lg:items-end">
            <div className="flex flex-col gap-3">
              {eyebrow ? (
                <span className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">
                  {eyebrow}
                </span>
              ) : null}
              <h2 className="max-w-3xl text-3xl font-semibold leading-tight tracking-normal md:text-5xl">
                {title}
              </h2>
            </div>
            {description ? (
              <p className="max-w-3xl text-base leading-8 text-muted-foreground md:text-lg">
                {description}
              </p>
            ) : null}
          </div>
        ) : null}
        {children}
      </div>
    </section>
  );
}
