import type { Session } from "next-auth";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { canAccessRole, getDefaultAvaPath, type Role } from "@/lib/roles";

type AvaSession = Session & {
  user: NonNullable<Session["user"]> & {
    email: string;
    id: string;
    role: Role;
  };
};

function isAvaSession(session: Session | null): session is AvaSession {
  return Boolean(
    session?.user?.email && session.user.id && session.user.role,
  );
}

export async function requireAvaRole(
  allowedRoles: readonly Role[],
  callbackUrl: string,
) {
  const session = await auth();

  if (!isAvaSession(session)) {
    redirect(`/ava/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  if (!canAccessRole(session.user.role, allowedRoles)) {
    redirect(getDefaultAvaPath(session.user.role));
  }

  return session;
}
