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
    <section className="rounded-2xl border border-primary/15 bg-white/95 p-4 shadow-sm md:rounded-[999px]">
      <div className="grid min-w-0 gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="flex min-w-0 items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
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
              <p
                className="mt-1 max-w-[220px] truncate text-sm font-medium text-foreground"
                title={email}
              >
                <Mail className="mr-1 inline size-4 align-[-3px] text-muted-foreground" />
                {email}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:justify-end">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/15 bg-muted px-3 py-2 text-sm font-semibold text-primary">
            <ShieldCheck aria-hidden="true" className="size-4" />
            {ROLE_LABELS[role]}
          </span>
          <SignOutButton className="w-full sm:w-auto" />
        </div>
      </div>
    </section>
  );
}
