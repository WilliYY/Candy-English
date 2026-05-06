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

  const [users, teachers, students, assignments, siteContents] =
    await Promise.all([
    prisma.user.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        createdAt: true,
        email: true,
        id: true,
        isActive: true,
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
    }),
    prisma.teacherProfile.findMany({
      orderBy: {
        user: {
          name: "asc",
        },
      },
      select: {
        id: true,
        user: {
          select: {
            email: true,
            isActive: true,
            name: true,
          },
        },
      },
    }),
    prisma.studentProfile.findMany({
      orderBy: {
        user: {
          name: "asc",
        },
      },
      select: {
        id: true,
        level: true,
        user: {
          select: {
            email: true,
            isActive: true,
            name: true,
          },
        },
      },
    }),
    prisma.studentTeacherAssignment.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        createdAt: true,
        id: true,
        studentProfileId: true,
        teacherProfileId: true,
        studentProfile: {
          select: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
        teacherProfile: {
          select: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    }),
    prisma.sitePageContent.findMany({
      orderBy: {
        slug: "asc",
      },
      select: {
        ctaLabel: true,
        description: true,
        slug: true,
        title: true,
      },
    }),
  ]);

  return (
    <AdminUsersPanel
      assignments={assignments.map((assignment) => ({
        createdAt: assignment.createdAt,
        id: assignment.id,
        studentName: assignment.studentProfile.user.name,
        studentProfileId: assignment.studentProfileId,
        teacherName: assignment.teacherProfile.user.name,
        teacherProfileId: assignment.teacherProfileId,
      }))}
      currentUser={session.user}
      siteContents={siteContents.map((content) => ({
        ctaLabel: content.ctaLabel,
        description: content.description,
        slug: content.slug as "home" | "sobre" | "metodologia" | "planos" | "contato",
        title: content.title,
      }))}
      students={students.map((student) => ({
        email: student.user.email,
        id: student.id,
        isActive: student.user.isActive,
        label: `${student.user.name}${student.level ? ` - ${student.level}` : ""}`,
      }))}
      teachers={teachers.map((teacher) => ({
        email: teacher.user.email,
        id: teacher.id,
        isActive: teacher.user.isActive,
        label: `${teacher.user.name} - ${teacher.user.email}`,
      }))}
      users={users}
    />
  );
}
