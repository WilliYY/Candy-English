import { Mail, ShieldCheck, Sparkles } from "lucide-react";
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
  const displayName = name ?? "Sem nome";

  return (
    <section className="ava-profile-summary-card rounded-2xl border p-4 shadow-sm">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <UserAvatar
            avatarPath={avatarPath}
            className="size-14 rounded-2xl"
            iconClassName="size-6"
            userId={userId}
          />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[0.66rem] font-bold uppercase tracking-[0.2em] text-primary/60">
                Meu perfil
              </p>
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary/80 px-2 py-1 text-[0.68rem] font-bold text-secondary-foreground">
                <Sparkles aria-hidden="true" className="size-3" />
                Candy
              </span>
            </div>
            <p className="mt-1 truncate text-lg font-semibold leading-tight text-foreground">
              {displayName}
            </p>
            <p
              className="mt-2 flex min-w-0 items-center gap-2 rounded-full border border-primary/10 bg-white/70 px-2.5 py-1.5 text-sm font-medium text-muted-foreground"
              title={email}
            >
              <Mail aria-hidden="true" className="size-4 shrink-0" />
              <span className="truncate">
                {email}
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-primary/10 pt-3">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/15 bg-primary/8 px-3 py-2 text-sm font-semibold text-primary shadow-sm">
            <ShieldCheck aria-hidden="true" className="size-4" />
            {ROLE_LABELS[role]}
          </span>
          <SignOutButton className="w-full sm:w-auto" />
        </div>
      </div>
    </section>
  );
}
