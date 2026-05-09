import { Mail, ShieldCheck } from "lucide-react";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import { SignOutButton } from "@/components/ava/sign-out-button";
import { UserAvatar } from "@/components/ava/user-avatar";

type UserSummaryPanelProps = {
  avatarPath?: string | null;
  email: string;
  name?: string | null;
  role: Role;
  userId?: string | null;
};

export function UserSummaryPanel({
  avatarPath,
  email,
  name,
  role,
  userId,
}: UserSummaryPanelProps) {
  return (
    <section className="rounded-lg border border-primary/10 bg-white/95 p-4 shadow-sm">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <UserAvatar
            avatarPath={avatarPath}
            className="size-11"
            iconClassName="size-5"
            userId={userId}
          />

          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Usuario
            </p>
            <p className="mt-1 truncate text-base font-semibold text-foreground">
              {name ?? "Sem nome"}
            </p>
            <p
              className="mt-1 flex min-w-0 items-center gap-2 text-sm font-medium text-muted-foreground"
              title={email}
            >
              <Mail aria-hidden="true" className="size-4 shrink-0" />
              <span className="truncate">
                {email}
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
