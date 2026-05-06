import { Mail, ShieldCheck, UserRound } from "lucide-react";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import { SignOutButton } from "@/components/ava/sign-out-button";

type UserSummaryPanelProps = {
  email: string;
  name?: string | null;
  role: Role;
};

export function UserSummaryPanel({ email, name, role }: UserSummaryPanelProps) {
  return (
    <section className="relative isolate overflow-hidden rounded-[2rem] border border-primary/15 bg-gradient-to-r from-[#fff7fd] via-white to-[#fce5d8] p-5 shadow-sm">
      <div className="pointer-events-none absolute -left-10 top-1/2 h-20 w-20 -translate-y-1/2 rounded-full border-[18px] border-primary/10" />
      <div className="pointer-events-none absolute -right-8 top-1/2 h-16 w-16 -translate-y-1/2 rounded-full border-[14px] border-accent/20" />

      <div className="relative grid min-w-0 gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="flex min-w-0 items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <UserRound aria-hidden="true" />
          </span>

          <div className="grid min-w-0 gap-3 sm:grid-cols-2 sm:gap-5">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Usuario
              </p>
              <p className="mt-1 truncate text-base font-semibold text-foreground">
                {name ?? "Sem nome"}
              </p>
            </div>

            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Email
              </p>
              <p className="mt-1 break-all text-sm font-medium text-foreground">
                <Mail className="mr-1 inline size-4 align-[-3px] text-muted-foreground" />
                {email}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:justify-end">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/15 bg-white px-3 py-2 text-sm font-semibold text-primary shadow-xs">
            <ShieldCheck aria-hidden="true" className="size-4" />
            {ROLE_LABELS[role]}
          </span>
          <SignOutButton className="w-full sm:w-auto" />
        </div>
      </div>
    </section>
  );
}
