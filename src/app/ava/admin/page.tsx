import type { Metadata } from "next";
import { AdminUsersPanel } from "@/components/ava/admin-users-panel";
import { requireAvaRole } from "@/lib/authorization";
import { getPrisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Admin AVA",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminPage() {
  const session = await requireAvaRole(["ADMIN"], "/ava/admin");
  const prisma = getPrisma();
  const users = await prisma.user.findMany({
    orderBy: {
      createdAt: "desc",
    },
    select: {
      createdAt: true,
      email: true,
      id: true,
      name: true,
      role: true,
      studentProfile: {
        select: {
          level: true,
        },
      },
      teacherProfile: {
        select: {
          bio: true,
        },
      },
    },
  });

  return <AdminUsersPanel currentUser={session.user} users={users} />;
}
